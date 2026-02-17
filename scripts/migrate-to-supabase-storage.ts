
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY }
});

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

async function migrate() {
    console.log("=== INICIANDO MIGRAÇÃO S3 -> SUPABASE STORAGE ===");

    const { data: notes, error } = await supabase
        .from('service_notes')
        .select('id, s3_path_pdf, s3_path_xml')
        .or('s3_path_pdf.not.is.null,s3_path_xml.not.is.null');

    if (error) {
        console.error("Erro ao buscar notas:", error);
        return;
    }

    console.log(`Encontradas ${notes.length} notas para migrar.`);

    for (const note of notes) {
        const paths = [
            { path: note.s3_path_pdf, type: 'pdf', contentType: 'application/pdf' },
            { path: note.s3_path_xml, type: 'xml', contentType: 'application/xml' }
        ];

        let updates: any = {};

        for (const { path: s3Path, type, contentType } of paths) {
            if (!s3Path) continue;

            try {
                // 1. Download do S3
                const getCommand = new GetObjectCommand({ Bucket: AWS_BUCKET, Key: s3Path });
                const { Body } = await s3Client.send(getCommand);
                const buffer = await streamToBuffer(Body);

                // 2. Upload para Supabase
                const { error: uploadError } = await supabase.storage
                    .from('service-notes')
                    .upload(s3Path, buffer, {
                        contentType,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // 3. Obter URL Pública
                const { data: { publicUrl } } = supabase.storage
                    .from('service-notes')
                    .getPublicUrl(s3Path);

                updates[`download_url_${type}`] = publicUrl;
                console.log(`  [OK] Migrado ${type}: ${s3Path}`);

            } catch (e) {
                console.error(`  [ERRO] Falha ao migrar ${s3Path}:`, e);
            }
        }

        if (Object.keys(updates).length > 0) {
            await supabase.from('service_notes').update(updates).eq('id', note.id);
        }
    }

    console.log("=== MIGRAÇÃO CONCLUÍDA ===");
}

migrate().catch(console.error);
