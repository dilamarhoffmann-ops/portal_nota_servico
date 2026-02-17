
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function test_various() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    const numero = "1133";
    const prestador = "47164830000118";

    const endpoints = [
        `https://api.plugnotas.com.br/nfse?numero=${numero}`,
        `https://api.plugnotas.com.br/nfse?numero=${numero}&cnpjPrestador=${prestador}`,
        `https://api.plugnotas.com.br/nfse?numero=${numero}&prestador=${prestador}`
    ];

    for (const url of endpoints) {
        console.log(`Testando: ${url}`);
        try {
            const response = await axios.get(url, { headers });
            console.log("Status:", response.status, "Notes count:", response.data.length || (response.data.notas ? response.data.notas.length : "N/A"));
            if (response.data.length > 0 || (response.data.notas && response.data.notas.length > 0)) {
                const n = response.data.notas ? response.data.notas[0] : response.data[0];
                console.log("KEYS:", Object.keys(n));
                console.log("VALOR SERVICO:", n.valorServico || n.valor?.servico || n.servico?.valor);
                break;
            }
        } catch (e: any) {
            console.log("Erro:", e.response?.status);
        }
    }
}

test_various();
