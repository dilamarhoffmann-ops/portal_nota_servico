
import axios from 'axios';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function dump() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    // CNPJ: 25.249.058/0001-02
    const cnpj = "25249058000102";
    // Tentar buscar uma nota específica que sabemos o número
    const numero = "1133";
    const url = `https://api.plugnotas.com.br/nfse?numero=${numero}&cnpjTomador=${cnpj}`;

    try {
        const res = await axios.get(url, { headers });
        if (res.data && res.data.length > 0) {
            fs.writeFileSync('nota_sample.json', JSON.stringify(res.data[0], null, 2));
            console.log("Nota salva em nota_sample.json");
        } else {
            console.log("Nenhuma nota encontrada com esse critério. Tentando busca por período...");
            const url2 = `https://api.plugnotas.com.br/nfse/nacional/${cnpj}/consultar/periodo?dataInicial=2026-01-01&dataFinal=2026-01-31&ator=2`;
            const res2 = await axios.get(url2, { headers });
            if (res2.data.notas && res2.data.notas.length > 0) {
                fs.writeFileSync('nota_sample.json', JSON.stringify(res2.data.notas[0], null, 2));
                console.log("Nota (período) salva em nota_sample.json");
            }
        }
    } catch (e: any) {
        console.error("Erro:", e.response?.status, e.response?.data);
    }
}
dump();
