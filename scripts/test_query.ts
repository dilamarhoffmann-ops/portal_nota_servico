
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function test_query() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    // Usar dados da nota 1133_47164830000118
    const numero = "1133";
    const cnpjPrestador = "47164830000118";

    const url = `https://api.plugnotas.com.br/nfse`;
    const params = { numero, cnpjPrestador };

    console.log(`Buscando nota: ${numero} prestador: ${cnpjPrestador}`);
    try {
        const response = await axios.get(url, { headers, params });
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
    } catch (e: any) {
        console.error("Erro:", e.response?.status, e.response?.data || e.message);
    }
}

test_query();
