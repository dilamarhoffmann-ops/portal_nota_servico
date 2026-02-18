
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.400.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.400.0";

// Interface para os dados da nota
interface NoteData {
    cnpj_tomador: string;
    cnpj_prestador: string;
    numero_nfse: string;
    data_emissao: string;
    ano: number;
    mes: number;
    dia: number;
    s3_path_pdf: string | null;
    s3_path_xml: string | null;
    tipo: 'pdf' | 'xml';
}

interface GroupedNote {
    cnpj_tomador: string;
    cnpj_prestador: string;
    numero_nfse: string;
    data_emissao: string;
    ano: number;
    mes: number;
    dia: number;
    s3_path_pdf: string | null;
    s3_path_xml: string | null;
}

serve(async (req) => {
    try {
        console.log("🚀 Iniciando sincronização via Edge Function...");

        // 1. Configuração e Variáveis de Ambiente
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const awsAccessKey = Deno.env.get('AWS_ACCESS_KEY');
        const awsSecretKey = Deno.env.get('AWS_SECRET_KEY');
        const awsRegion = Deno.env.get('AWS_REGION') || 'sa-east-1';
        const awsBucket = Deno.env.get('AWS_BUCKET') || 'plug-notas';

        if (!awsAccessKey || !awsSecretKey) {
            throw new Error("Credenciais AWS não configuradas.");
        }

        const s3Client = new S3Client({
            region: awsRegion,
            credentials: {
                accessKeyId: awsAccessKey,
                secretAccessKey: awsSecretKey,
            },
        });

        // Data de início para log
        const inicioSync = new Date();

        // 2. Funções Auxiliares

        const parseS3Key = (key: string): NoteData | null => {
            // Regex: notas/CNPJ/ANO/MES/NFSe_DD-MM-YYYY_NUMERO_CNPJ.ext
            const pattern = /notas\/(\d{14})\/(\d{4})\/(\d{2})\/NFSe_(\d{2})-(\d{2})-(\d{4})_(\d+)_(\d{14})\.(pdf|xml)/;
            const match = key.match(pattern);

            if (!match) return null;

            const [_, cnpj_tomador, ano_path, mes_path, dia, mes_emissao, ano_emissao, numero, cnpj_prestador, tipo] = match;

            return {
                cnpj_tomador,
                cnpj_prestador,
                numero_nfse: numero,
                data_emissao: `${ano_emissao}-${mes_emissao}-${dia}`,
                ano: parseInt(ano_emissao),
                mes: parseInt(mes_emissao),
                dia: parseInt(dia),
                tipo: tipo as 'pdf' | 'xml',
                s3_path_pdf: null, // Preenchido depois no agrupamento
                s3_path_xml: null
            };
        };

        const formatCnpj = (cnpj: string): string => {
            if (!cnpj || cnpj.length !== 14) return cnpj;
            return `${cnpj.substring(0, 2)}.${cnpj.substring(2, 5)}.${cnpj.substring(5, 8)}/${cnpj.substring(8, 12)}-${cnpj.substring(12)}`;
        };

        const generatePresignedUrl = async (key: string): Promise<string | null> => {
            try {
                const command = new GetObjectCommand({
                    Bucket: awsBucket,
                    Key: key,
                });
                return await getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24h
            } catch (e) {
                console.error(`Erro ao gerar URL para ${key}:`, e);
                return null;
            }
        };

        // 3. Listar Arquivos do S3
        console.log("🔍 Listando arquivos no S3...");
        let allFiles: string[] = [];
        let continuationToken: string | undefined = undefined;

        do {
            const command = new ListObjectsV2Command({
                Bucket: awsBucket,
                Prefix: "notas/",
                ContinuationToken: continuationToken
            });

            const response = await s3Client.send(command);

            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (obj.Key && (obj.Key.endsWith('.pdf') || obj.Key.endsWith('.xml'))) {
                        allFiles.push(obj.Key);
                    }
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        console.log(`✅ Total de arquivos encontrados: ${allFiles.length}`);

        if (allFiles.length === 0) {
            return new Response(JSON.stringify({ message: "Nenhum arquivo encontrado." }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // 4. Agrupar Arquivos
        const notas: { [key: string]: GroupedNote } = {};

        for (const file of allFiles) {
            const info = parseS3Key(file);
            if (!info) continue;

            const key = `${info.cnpj_tomador}_${info.numero_nfse}_${info.data_emissao}`;

            if (!notas[key]) {
                notas[key] = {
                    cnpj_tomador: info.cnpj_tomador,
                    cnpj_prestador: info.cnpj_prestador,
                    numero_nfse: info.numero_nfse,
                    data_emissao: info.data_emissao,
                    ano: info.ano,
                    mes: info.mes,
                    dia: info.dia,
                    s3_path_pdf: null,
                    s3_path_xml: null
                };
            }

            if (info.tipo === 'pdf') notas[key].s3_path_pdf = file;
            else if (info.tipo === 'xml') notas[key].s3_path_xml = file;
        }

        const totalNotas = Object.keys(notas).length;
        console.log(`📦 Total de notas processadas para sync: ${totalNotas}`);

        // 5. Sincronizar com Supabase
        let syncedCount = 0;
        let errorCount = 0;

        for (const notaKey of Object.keys(notas)) {
            const nota = notas[notaKey];

            try {
                const cnpjTomadorFmt = formatCnpj(nota.cnpj_tomador);
                const cnpjPrestadorFmt = formatCnpj(nota.cnpj_prestador);

                // Buscar ID da empresa
                const { data: companies } = await supabase
                    .from('companies')
                    .select('id')
                    .or(`cnpj.eq.${cnpjTomadorFmt},cnpj.eq.${nota.cnpj_tomador}`)
                    .limit(1);

                const companyId = companies && companies.length > 0 ? companies[0].id : null;

                // Gerar URLs
                const urlPdf = nota.s3_path_pdf ? await generatePresignedUrl(nota.s3_path_pdf) : null;
                const urlXml = nota.s3_path_xml ? await generatePresignedUrl(nota.s3_path_xml) : null;

                // Verificar duplicidade (Lógica igual ao Python/TS)
                const { data: existing } = await supabase
                    .from('service_notes')
                    .select('id, nota_id')
                    .eq('numero_nfse', nota.numero_nfse)
                    .or(`cnpj_prestador.eq.${cnpjPrestadorFmt},cnpj_prestador.eq.${nota.cnpj_prestador}`)
                    .limit(1);

                let notaId: string;
                let recordId: string | null = null;
                let isUpdate = false;

                if (existing && existing.length > 0) {
                    notaId = existing[0].nota_id;
                    recordId = existing[0].id;
                    isUpdate = true;
                } else {
                    notaId = `${nota.numero_nfse}_${nota.cnpj_prestador}`;
                    isUpdate = false;
                }

                const record = {
                    nota_id: notaId,
                    numero_nfse: nota.numero_nfse,
                    company_id: companyId,
                    cnpj_tomador: cnpjTomadorFmt,
                    cnpj_prestador: cnpjPrestadorFmt,
                    data_emissao: nota.data_emissao,
                    ano: nota.ano,
                    mes: nota.mes,
                    dia: nota.dia,
                    s3_path_pdf: nota.s3_path_pdf,
                    s3_path_xml: nota.s3_path_xml,
                    s3_bucket: awsBucket,
                    download_url_pdf: urlPdf,
                    download_url_xml: urlXml,
                    sync_status: 'synced',
                    status: 'active'
                };

                if (isUpdate && recordId) {
                    await supabase.from('service_notes').update(record).eq('id', recordId);
                } else {
                    await supabase.from('service_notes').insert(record);
                }

                syncedCount++;

            } catch (err) {
                console.error(`Erro ao sincronizar nota ${nota.numero_nfse}:`, err);
                errorCount++;
            }
        }

        // 6. Registrar Log de Execução
        const fimSync = new Date();

        await supabase.from('sync_logs').insert({
            started_at: inicioSync.toISOString(),
            finished_at: fimSync.toISOString(),
            status: 'completed',
            notes_found: totalNotas,
            notes_synced: syncedCount,
            error_message: errorCount > 0 ? `Erros: ${errorCount}` : null,
            metadata: { source: 'edge_function_cron' }
        });

        console.log(`✅ Sync concluído. Sucesso: ${syncedCount}, Erros: ${errorCount}`);

        return new Response(JSON.stringify({
            message: "Sincronização concluída com sucesso.",
            stats: {
                found: totalNotas,
                synced: syncedCount,
                errors: errorCount
            }
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("❌ Erro fatal na Edge Function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
