
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function debug() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY, "Content-Type": "application/json" };
    // Usar um CNPJ que sabemos que tem notas no DB
    const cnpjLimpo = "25249058000102";
    const url = `https://api.plugnotas.com.br/nfse/nacional/${cnpjLimpo}/consultar/periodo`;

    // Simplificar params
    const params = {
        dataInicial: "2026-01-01",
        dataFinal: "2026-02-10"
    };

    console.log(`Buscando em: ${url}`);
    try {
        const response = await axios.get(url, { headers, params });
        const notas = response.data.notas;
        if (notas && notas.length > 0) {
            console.log("=== ENCONTRADO ===");
            const n = notas[0];
            console.log("ID:", n.id);
            console.log("Numero:", n.numero);
            console.log("NumeroNFSe:", n.numeroNfse);
            console.log("Valor:", JSON.stringify(n.valor));
            console.log("Servico:", JSON.stringify(n.servico));
            console.log("ValorServico:", n.valorServico);
        } else {
            console.log("Nada encontrado.");
        }
    } catch (e: any) {
        console.error("Erro:", e.response?.status, e.response?.data);
    }
}

debug();
