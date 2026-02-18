
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do .env na pasta de scripts
dotenv.config({ path: path.join(__dirname, '.env') });

// ================= CONFIGURAÇÕES AMBIENTE =================
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;
const AWS_REGION = process.env.AWS_REGION || 'sa-east-1';
const AWS_BUCKET = process.env.AWS_BUCKET!;

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;
    return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12, 14)}`;
}

// Clientes
const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY
    }
});

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function registrarLog(status: string, notes: number = 0, error: string | null = null) {
    try {
        await supabase.from('sync_logs').insert({
            status,
            notes_synced: notes,
            error_message: error,
            finished_at: new Date().toISOString()
        });
    } catch (e) {
        console.error(`Erro ao registrar log: ${e}`);
    }
}

async function uploadS3(content: Buffer, key: string): Promise<boolean> {
    try {
        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET,
            Key: key,
            Body: content
        });
        await s3Client.send(command);
        return true;
    } catch (e) {
        console.error(`      [S3] Erro: ${e}`);
        return false;
    }
}

async function uploadSupabaseStorage(content: Buffer, key: string, contentType: string): Promise<string | null> {
    try {
        // Remover prefixo 'notas/' se necessário, ou usar como está
        const { data, error } = await supabase.storage
            .from('service-notes')
            .upload(key, content, {
                contentType,
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('service-notes')
            .getPublicUrl(key);

        return publicUrl;
    } catch (e) {
        console.error(`      [Supabase Storage] Erro: ${e}`);
        return null;
    }
}

async function baixarEEnviar(url: string, path: string, headers: any): Promise<{ s3: boolean, supabaseUrl: string | null }> {
    let s3Success = false;
    let supabaseUrl: string | null = null;
    const contentType = path.endsWith('.pdf') ? 'application/pdf' : 'application/xml';

    try {
        // 1. Tentar baixar o arquivo uma vez
        const response = await axios.get(url, { headers, responseType: 'arraybuffer', timeout: 30000 });

        if (response.status === 200) {
            const buffer = Buffer.from(response.data);

            // 2. Upload para S3 (mantendo compatibilidade)
            s3Success = await uploadS3(buffer, path);

            // 3. Upload para Supabase Storage (Nova storage padrão)
            supabaseUrl = await uploadSupabaseStorage(buffer, path, contentType);
        }
    } catch (e) {
        console.error(`      [Erro] Download/Upload: ${e}`);
    }

    return { s3: s3Success, supabaseUrl };
}

async function registrarNotaNoSupabase(nota: any, cnpjAlvo: string, s3Paths: { pdf: string, xml: string }, companyId: string) {
    try {
        const notaId = nota.id;

        const parseDate = (d: string | null) => {
            if (!d) return null;
            let clean = d.substring(0, 10);
            if (clean.includes('/') && clean.indexOf('/') === 2) {
                const [day, month, year] = clean.split('/');
                return `${year}-${month}-${day}`;
            }
            if (clean.includes('/')) return clean.replace(/\//g, '-');
            return clean;
        };

        const dataIso = parseDate(nota.emissao) || "2000-01-01";
        const dataConv = new Date(dataIso);

        const getUrl = (field: any, typeStr: string) => {
            if (typeof field === 'string' && field.startsWith('http')) return field;
            if (field && typeof field === 'object' && field.url) return field.url;
            return `https://api.plugnotas.com.br/nfse/${typeStr}/${notaId}`;
        };

        const cnpjPrestadorVal = formatCNPJ(typeof nota.prestador === 'object' ? nota.prestador?.cpfCnpj : String(nota.prestador));
        const numeroVal = String(nota.numeroNfse || nota.numero || notaId);

        const data = {
            nota_id: notaId,
            id_dps: nota.idDPS,
            situacao: nota.situacao,
            tomador: nota.tomador,
            prestador: nota.prestador,
            chave_acesso_nfse: nota.chaveAcessoNfse,
            serie: nota.serie,
            numero: String(nota.numero || ""),
            numero_nfse: numeroVal,
            autorizacao: parseDate(nota.autorizacao),
            valor_total: nota.valorServico ||
                (nota.valor && typeof nota.valor === 'object' && 'servico' in nota.valor ? (nota.valor as any).servico : 0) ||
                (nota.total && typeof nota.total === 'object' && 'servico' in nota.total ? (nota.total as any).servico : 0) ||
                (typeof nota.valor === 'number' ? nota.valor : 0),
            company_id: companyId,
            cnpj_tomador: formatCNPJ(cnpjAlvo),
            cnpj_prestador: cnpjPrestadorVal,
            data_emissao: dataIso,
            ano: dataConv.getFullYear(),
            mes: dataConv.getMonth() + 1,
            dia: dataConv.getDate(),
            s3_path_pdf: s3Paths.pdf,
            s3_path_xml: s3Paths.xml,
            s3_bucket: AWS_BUCKET,
            download_url_pdf: s3Paths.pdf ? supabase.storage.from('service-notes').getPublicUrl(s3Paths.pdf).data.publicUrl : getUrl(nota.pdf, 'pdf'),
            download_url_xml: s3Paths.xml ? supabase.storage.from('service-notes').getPublicUrl(s3Paths.xml).data.publicUrl : getUrl(nota.xml, 'xml'),
            sync_status: "synced",
            status: "active"
        };

        // 1. Tentar atualizar pelo ID oficial (Upsert padrão)
        const { data: existingById } = await supabase.from('service_notes').select('id').eq('nota_id', notaId).maybeSingle();

        if (existingById) {
            const { error } = await supabase.from('service_notes').update(data).eq('id', existingById.id);
            if (error) throw error;
        } else {
            // 2. Tentar encontrar por chave semântica (evitar duplicidade com script Python)
            const { data: existingByContent } = await supabase.from('service_notes')
                .select('id')
                .eq('numero_nfse', numeroVal)
                .eq('cnpj_prestador', cnpjPrestadorVal)
                .maybeSingle();

            if (existingByContent) {
                // Atualiza o registro existente (substituindo o ID autogerado pelo oficial)
                const { error } = await supabase.from('service_notes').update(data).eq('id', existingByContent.id);
                if (error) throw error;
                console.log(`      [Duplicate Prevented] Nota ID atualizado para ${numeroVal}`);
            } else {
                // Inserção nova
                const { error } = await supabase.from('service_notes').insert(data);
                if (error) throw error;
            }
        }

        return true;
    } catch (e: any) {
        console.error(`      [Erro] Registro Supabase: ${e.message || e}`);
        return false;
    }
}

async function syncPeriodo(cnpjFormatado: string, companyId: string, ano: number, mes: number): Promise<number> {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY, "Content-Type": "application/json" };
    const cnpjLimpo = cnpjFormatado.replace(/[./-]/g, "");

    // Obter último dia do mês
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataIni = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    const url = `https://api.plugnotas.com.br/nfse/nacional/${cnpjLimpo}/consultar/periodo`;
    let count = 0;
    let hashPagina: string | null = null;

    while (true) {

        const params: any = { dataInicial: dataIni, dataFinal: dataFim, ator: 2, quantidade: 50 };
        if (hashPagina) params.hashProximaPagina = hashPagina;

        try {
            const response = await axios.get(url, { headers, params, timeout: 30000 });
            if (response.status !== 200) break;

            const { notas, hashProximaPagina } = response.data;
            if (notas && notas.length > 0) {
                console.log("DEBUG NOTA:", JSON.stringify(notas[0], null, 2));
            }
            hashPagina = hashProximaPagina;

            if (!notas || notas.length === 0) break;

            for (const nota of notas) {
                console.log("DADOS DA NOTA RECEBIDOS:", JSON.stringify(nota, null, 2));
                const notaId = nota.id;
                const numero = String(nota.numeroNfse || nota.numero || notaId);
                const emissaoLimpa = (nota.emissao || "00-00-00").replace(/\//g, "-").substring(0, 10);

                const pathBase = `notas/${cnpjLimpo}/${ano}/${String(mes).padStart(2, '0')}/NFSe_${emissaoLimpa}_${numero}`;
                const s3Pdf = `${pathBase}.pdf`;
                const s3Xml = `${pathBase}.xml`;

                // Download e Upload S3
                const urlPdf = nota.pdf || `https://api.plugnotas.com.br/nfse/pdf/${notaId}`;
                const urlXml = nota.xml || `https://api.plugnotas.com.br/nfse/xml/${notaId}`;

                await baixarEEnviar(urlPdf, s3Pdf, headers);
                await baixarEEnviar(urlXml, s3Xml, headers);

                // Registro no Supabase
                await registrarNotaNoSupabase(nota, cnpjFormatado, { pdf: s3Pdf, xml: s3Xml }, companyId);
                count++;
            }

            if (!hashPagina) break;
        } catch (e) {
            console.error(`      [Erro] Falha na paginação/request: ${e}`);
            break;
        }
    }

    return count;
}

async function main() {
    console.log(`\n--- Iniciando Sincronização Horária TS (${new Date().toLocaleString()}) ---`);

    try {
        // 1. Buscar empresas ativas do banco
        const { data: empresas, error } = await supabase.from('companies').select('id, cnpj').eq('active', true);

        if (error || !empresas) {
            console.error("Erro ao buscar empresas ou nenhuma empresa ativa encontrada.");
            return;
        }

        let totalGlobal = 0;
        const now = new Date();

        // Sincroniza os últimos 6 meses para garantir que nada foi perdido
        const mesesSincronizar = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(now.getMonth() - i);
            mesesSincronizar.push({ ano: date.getFullYear(), mes: date.getMonth() + 1 });
        }

        // Remover duplicatas
        const mesesUnicos = Array.from(new Set(mesesSincronizar.map(m => JSON.stringify(m)))).map(s => JSON.parse(s));

        for (const emp of empresas) {
            const cnpj = emp.cnpj;
            const companyId = emp.id;
            console.log(`\n> Processando: ${cnpj}`);

            let totalEmpresa = 0;
            for (const { ano, mes } of mesesUnicos) {
                totalEmpresa += await syncPeriodo(cnpj, companyId, ano, mes);
            }

            // Atualizar last_sync da empresa
            await supabase.from('companies').update({ last_sync: new Date().toISOString() }).eq('id', companyId);
            console.log(`  [OK] Concluído. Notas: ${totalEmpresa}`);
            totalGlobal += totalEmpresa;
        }

        await registrarLog('completed', totalGlobal);
        console.log(`\n--- Sincronização Finalizada. Total de Notas: ${totalGlobal} ---`);

    } catch (e: any) {
        await registrarLog('failed', 0, e.message);
        console.error(`Erro Crítico na main: ${e}`);
    }
}

main().catch(err => {
    console.error('Erro fatal na execução:', err);
    process.exit(1);
});
