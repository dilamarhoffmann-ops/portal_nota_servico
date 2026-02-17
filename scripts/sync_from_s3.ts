
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;
const AWS_REGION = process.env.AWS_REGION || 'sa-east-1';
const AWS_BUCKET = process.env.AWS_BUCKET!;
const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;
    return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12, 14)}`;
}

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY }
});

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

async function searchNoteInPlugNotas(numero: string, cnpjPrestador: string, cnpjTomador?: string) {
    try {
        const response = await axios.get(`https://api.plugnotas.com.br/nfse`, {
            headers: { "X-API-KEY": PLUGNOTAS_API_KEY },
            params: { numero, cnpjPrestador, cnpjTomador }
        });
        // A API/nfse retorna um array. Vamos pegar o primeiro.
        const notas = response.data;
        if (Array.isArray(notas) && notas.length > 0) {
            return notas[0];
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function syncFromS3() {
    console.log("=== INICIANDO SINCRONIZAÇÃO A PARTIR DA AWS S3 (FIX VALOR) ===");

    let isTruncated = true;
    let nextContinuationToken: string | undefined = undefined;
    let totalUpdated = 0;

    while (isTruncated) {
        const command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET,
            Prefix: 'notas/',
            MaxKeys: 100, // Processar em blocos menores para controle
            ContinuationToken: nextContinuationToken
        });

        const response = await s3Client.send(command);
        const contents = response.Contents || [];

        for (const item of contents) {
            const key = item.Key!;
            if (!key.endsWith('.pdf')) continue;

            const { data: note } = await supabase
                .from('service_notes')
                .select('id, nota_id, valor_total, numero_nfse, cnpj_prestador, cnpj_tomador, download_url_pdf, download_url_xml')
                .eq('s3_path_pdf', key)
                .single();

            // Processar se o valor estiver nulo/zero OU se a URL de download estiver faltando
            if (note && (!note.valor_total || note.valor_total === 0 || !note.download_url_pdf)) {
                console.log(`> Analisando nota: ${note.nota_id} | Valor: ${note.valor_total} | URL: ${note.download_url_pdf ? 'OK' : 'NULL'}`);

                // Tenta extrair numero e cnpj do nota_id ou colunas
                let numero = note.numero_nfse;
                let cnpjPrestador = note.cnpj_prestador;

                if (!numero || !cnpjPrestador) {
                    const parts = note.nota_id.split('_');
                    if (parts.length >= 2) {
                        numero = parts[0];
                        cnpjPrestador = parts[1];
                    }
                }

                if (numero && cnpjPrestador) {
                    let fullData = null;
                    if (note.nota_id && note.nota_id.length === 24) {
                        try {
                            const res = await axios.get(`https://api.plugnotas.com.br/nfse/${note.nota_id}`, {
                                headers: { "X-API-KEY": PLUGNOTAS_API_KEY }
                            });
                            fullData = res.data;
                        } catch (e) { }
                    }

                    if (!fullData) {
                        const cleanTomador = note.cnpj_tomador?.replace(/\D/g, '');
                        fullData = await searchNoteInPlugNotas(numero, cnpjPrestador, cleanTomador);
                    }

                    if (fullData) {
                        // DETECTAR O VALOR CORRETO
                        let valor = fullData.valorServico || 0;
                        if (valor === 0 && Array.isArray(fullData.servico) && fullData.servico.length > 0) {
                            valor = fullData.servico[0].valor?.servico || 0;
                        }
                        if (valor === 0 && fullData.valor && typeof fullData.valor === 'object') {
                            valor = (fullData.valor as any).servico || 0;
                        }

                        // RESOLVER URLS DE DOWNLOAD
                        const getUrl = (field: any, type: string) => {
                            if (typeof field === 'string' && field.startsWith('http')) return field;
                            if (field && typeof field === 'object' && field.url) return field.url;
                            // Se tivermos o ID da nota, podemos usar o endpoint de proxy da PlugNotas
                            if (fullData.id) return `https://api.plugnotas.com.br/nfse/${type}/${fullData.id}`;
                            return null;
                        };

                        const updateData = {
                            id_dps: fullData.idDPS || fullData.id_dps,
                            situacao: fullData.situacao,
                            tomador: fullData.tomador,
                            prestador: fullData.prestador,
                            cnpj_tomador: formatCNPJ(note.cnpj_tomador),
                            cnpj_prestador: formatCNPJ(cnpjPrestador),
                            chave_acesso_nfse: fullData.chaveAcessoNfse,
                            serie: fullData.serie,
                            numero: String(fullData.numero || ""),
                            autorizacao: fullData.autorizacao || fullData.data_autorizacao || null,
                            valor_total: valor,
                            download_url_pdf: getUrl(fullData.pdf, 'pdf') || note.download_url_pdf,
                            download_url_xml: getUrl(fullData.xml, 'xml') || note.download_url_xml,
                            sync_status: "synced"
                        };

                        console.log(`  Updating ID: ${note.id}`);

                        const { error } = await supabase
                            .from('service_notes')
                            .update(updateData)
                            .eq('id', note.id);

                        if (!error) {
                            console.log(`  ✅ Valor atualizado: R$ ${valor}`);
                            totalUpdated++;
                        } else {
                            console.error(`  ❌ Erro no Supabase: ${error.message}`);
                        }
                    } else {
                        console.log(`  ⚠️ Nota não encontrada no PlugNotas (Num: ${numero}, Prest: ${cnpjPrestador})`);
                    }
                }
            }
        }

        isTruncated = response.IsTruncated || false;
        nextContinuationToken = response.NextContinuationToken;
    }

    console.log(`\nFim do processo. Total de notas corrigidas: ${totalUpdated}`);
}

syncFromS3().catch(console.error);
