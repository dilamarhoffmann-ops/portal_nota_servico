
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function test_links() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    // Nota 1133 - Prestador 47164830000118
    const numero = "1133";
    const cnpjPrestador = "47164830000118";
    const url = `https://api.plugnotas.com.br/nfse?numero=${numero}&cnpjPrestador=${cnpjPrestador}`;

    try {
        const res = await axios.get(url, { headers });
        if (res.data && res.data.length > 0) {
            console.log("CHAVES DISPONÍVEIS:", Object.keys(res.data[0]));
            console.log("PDF:", res.data[0].pdf);
            console.log("XML:", res.data[0].xml);
            console.log("URL PDF (alternative):", res.data[0].urlPdf);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
test_links();
