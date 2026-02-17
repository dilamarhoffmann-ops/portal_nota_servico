
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PLUGNOTAS_API_KEY = process.env.PLUGNOTAS_API_KEY!;

async function inspect() {
    const headers = { "X-API-KEY": PLUGNOTAS_API_KEY };
    const id = "698398d618afd500125bfb51";
    const res = await axios.get(`https://api.plugnotas.com.br/nfse/${id}`, { headers });
    console.log(JSON.stringify(res.data, null, 2));
}
inspect();
