
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function test_one() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY, "Content-Type": "application/json" };
    // CNPJ: 25.249.058/0001-02 (Sabemos que tem nota de Jan 2026)
    const cnpj = "25249058000102";
    const url = `https://api.plugnotas.com.br/nfse/nacional/${cnpj}/consultar/periodo`;
    const params = { dataInicial: "2026-01-01", dataFinal: "2026-01-31", ator: 2 };

    console.log("Buscando...");
    try {
        const res = await axios.get(url, { headers, params });
        const notas = res.data.notas;
        if (notas && notas.length > 0) {
            console.log("PRIMEIRA NOTA:");
            console.log(JSON.stringify(notas[0], null, 2));
        } else {
            console.log("Nenhuma nota.");
        }
    } catch (e: any) {
        console.error("Erro:", e.response?.status, e.response?.data);
    }
}

test_one();
