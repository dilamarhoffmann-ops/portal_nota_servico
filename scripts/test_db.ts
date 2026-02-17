
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test_db() {
    const nota_id = "1133_47164830000118";
    const data = {
        nota_id: nota_id,
        valor_total: 100.50,
        sync_status: "test_update"
    };

    console.log("Tentando update...");
    const { data: res, error } = await supabase
        .from('service_notes')
        .upsert(data, { onConflict: 'nota_id' })
        .select();

    if (error) {
        console.error("Erro no upsert:", error);
    } else {
        console.log("Sucesso! Resultado:", res);
    }
}

test_db();
