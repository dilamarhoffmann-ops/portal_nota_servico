
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function test_id() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    const id = "698398d618afd500125bfb51";
    const url = `https://api.plugnotas.com.br/nfse/${id}`;

    try {
        const res = await axios.get(url, { headers });
        console.log("=== RESULTADO ===");
        console.log("PDF LINK:", res.data.pdf);
        console.log("XML LINK:", res.data.xml);
    } catch (e: any) {
        console.error("Erro:", e.response?.status);
    }
}
test_id();
