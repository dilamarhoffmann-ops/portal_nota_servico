
import axios from 'axios';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function debug() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    const cnpj = "00641761000122";
    const url = `https://api.plugnotas.com.br/nfse/nacional/${cnpj}/consultar/periodo?dataInicial=2025-01-01&dataFinal=2025-12-31&ator=2`;

    try {
        const res = await axios.get(url, { headers });
        if (res.data.notas && res.data.notas.length > 0) {
            fs.writeFileSync('nota_debug.json', JSON.stringify(res.data.notas[0], null, 2));
            console.log("Nota salva em nota_debug.json");
        } else {
            console.log("Nada encontrado.");
        }
    } catch (e: any) {
        console.error("Erro:", e.response?.status, e.response?.data);
    }
}

debug();
