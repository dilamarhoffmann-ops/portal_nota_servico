
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
    // Usar um número real que vimos: 1133
    const numero = "1133";
    const cnpjTomador = "25249058000102"; // Um dos nossos

    // Tenta buscar por Tomador + Numero
    const url = `https://api.plugnotas.com.br/nfse?numero=${numero}&cnpjTomador=${cnpjTomador}`;

    try {
        const res = await axios.get(url, { headers });
        console.log("Status:", res.status, "Notes:", res.data.length);
        if (res.data.length > 0) {
            console.log("EXEMPLO VALORES:", res.data[0].valor);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

test();
