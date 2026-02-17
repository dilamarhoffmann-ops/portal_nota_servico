
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
    // CNPJ que sabemos que tem notas
    const cnpj = "00641761000122";
    const url = `https://api.plugnotas.com.br/nfse/nacional/${cnpj}/consultar/periodo?dataInicial=2025-01-01&dataFinal=2025-12-31&ator=2`;

    try {
        const res = await axios.get(url, { headers });
        if (res.data.notas && res.data.notas.length > 0) {
            console.log("CHAVES DA NOTA:", Object.keys(res.data.notas[0]));
            console.log("VALOR:", res.data.notas[0].valor);
            console.log("VALOR SERVICO:", res.data.notas[0].valorServico);
            console.log("NOTAS[0] COMPLETA:");
            console.log(JSON.stringify(res.data.notas[0], null, 2));
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

test();
