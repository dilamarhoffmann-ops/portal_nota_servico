
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
    const cnpj = "25249058000102";
    // Buscar todas as notas de Jan 2025 para ver se funciona
    const url = `https://api.plugnotas.com.br/nfse?cnpjTomador=${cnpj}&dataInicial=2025-01-01&dataFinal=2025-01-31`;

    try {
        const res = await axios.get(url, { headers });
        console.log("NOTAS ENCONTRADAS:", res.data.length);
        if (res.data.length > 0) {
            console.log("VALOR DA PRIMEIRA:", res.data[0].valorServico || res.data[0].valor?.servico);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

test();
