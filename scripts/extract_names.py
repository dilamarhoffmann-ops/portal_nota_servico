import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
env_path = r'c:\Users\SR APOIO\OneDrive\Documents\Projetos IA\portal-de-notas-de-serviço\scripts\.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

dir_path = r"C:\Users\SR APOIO\OneDrive\Documents\Certificados Digitais"

def run_extraction():
    if not os.path.exists(dir_path):
        print(f"❌ Diretório não encontrado: {dir_path}")
        return

    files = os.listdir(dir_path)
    mapping = {}

    # Padrão: 14 dígitos + " + " + Nome
    for f in files:
        match = re.search(r"^(\d{14})\s+\+\s+([^+]+)\s+\+", f)
        if match:
            cnpj_clean = match.group(1)
            name = match.group(2).strip()
            
            # Formatar CNPJ: 00.000.000/0000-00
            formatted = f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:]}"
            
            if formatted not in mapping or len(name) > len(mapping[formatted]):
                mapping[formatted] = name

    print(f"🔍 Processando {len(mapping)} empresas...")
    for cnpj, name in mapping.items():
        try:
            # Atualização segura via client (impede SQL Injection)
            res = supabase.table("companies")\
                .update({"razao_social": name})\
                .eq("cnpj", cnpj)\
                .or_("razao_social.eq.,razao_social.is.null")\
                .execute()
            
            if res.data:
                print(f"  ✅ Atualizada: {cnpj} -> {name}")
        except Exception as e:
            print(f"  ❌ Erro ao atualizar {cnpj}: {e}")

if __name__ == "__main__":
    run_extraction()
