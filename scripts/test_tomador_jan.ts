
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function test() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    const cnpjTomador = "25249058000102";
    // Buscar um período curto onde sabemos que tem nota
    const url = `https://api.plugnotas.com.br/nfse?cnpjTomador=${cnpjTomador}&dataInicial=2026-01-10&dataFinal=2026-01-20`;

    console.log("Chamando:", url);
    try {
        const res = await axios.get(url, { headers });
        console.log("Notas encontradas:", res.data.length);
        if (res.data.length > 0) {
            console.log("Nota 1:", JSON.stringify(res.data[0], null, 2));
        }
    } catch (e: any) {
        console.error("Erro:", e.response?.status, e.response?.data);
    }
}
test();
