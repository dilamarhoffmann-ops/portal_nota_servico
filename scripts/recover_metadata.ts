
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
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

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY }
});

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchNoteMetadata(notaId: string) {
    try {
        const response = await axios.get(`https://api.plugnotas.com.br/nfse/${notaId}`, {
            headers: { "X-API-KEY": PLUGNOTAS_API_KEY }
        });
        return response.data;
    } catch (e) {
        return null;
    }
}

async function recoverFromS3() {
    console.log("=== INICIANDO RECUPERAÇÃO DE METADADOS VIA S3 ===");

    let isTruncated = true;
    let nextContinuationToken: string | undefined = undefined;

    while (isTruncated) {
        const command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET,
            Prefix: 'notas/',
            ContinuationToken: nextContinuationToken
        });

        const response = await s3Client.send(command);
        const contents = response.Contents || [];

        for (const item of contents) {
            const key = item.Key!;
            if (!key.endsWith('.pdf')) continue; // Usar PDF como âncora para cada nota

            // Exemplo de path: notas/25249058000102/2026/02/NFSe_2026-02-10_123.pdf
            // Note: O id da nota pode não estar no path se usamos numeroNfse
            // Para recuperar metadados completos, precisamos do ID do PlugNotas.

            // Vamos tentar encontrar a nota no banco pelo caminho do S3
            const { data: existingNote } = await supabase
                .from('service_notes')
                .select('nota_id')
                .eq('s3_path_pdf', key)
                .single();

            if (!existingNote) {
                console.log(`> Nota encontrada no S3 mas não no banco: ${key}`);
                // Aqui o desafio: sem o ID 24-char do PlugNotas no path, 
                // teríamos que buscar na API por CNPJ/Número para pegar o ID real.
            }
        }

        isTruncated = response.IsTruncated || false;
        nextContinuationToken = response.NextContinuationToken;
    }
}

console.log("Dica: O script de sincronização principal (sync-to-supabase.ts) já foi atualizado para salvar todos os campos solicitados.");
console.log("Ele agora captura: id, idDPS, emissao, situacao, prestador, tomador, valorServico (como valor_total), chaveAcessoNfse, numeroNfse, serie, numero e autorizacao.");
