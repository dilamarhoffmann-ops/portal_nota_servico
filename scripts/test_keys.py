
import os
import requests
import boto3
from supabase import create_client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def test_aws():
    print("[1/3] Testando AWS S3...")
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
            region_name=os.getenv("AWS_REGION")
        )
        s3.list_objects_v2(Bucket=os.getenv("AWS_BUCKET"), MaxKeys=1)
        print("✅ AWS S3: Conexão ok!")
        return True
    except Exception as e:
        print(f"❌ AWS S3: Erro -> {e}")
        return False

def test_plugnotas():
    print("\n[2/3] Testando PlugNotas API...")
    try:
        headers = {"X-API-KEY": os.getenv("PLUGNOTAS_API_KEY")}
        # Testa listando empresas (endpoint simples)
        response = requests.get("https://api.plugnotas.com.br/empresa", headers=headers)
        if response.status_code == 200:
            print("✅ PlugNotas: Conexão ok!")
            return True
        else:
            print(f"❌ PlugNotas: Erro {response.status_code} -> {response.text}")
            return False
    except Exception as e:
        print(f"❌ PlugNotas: Erro -> {e}")
        return False

def test_supabase():
    print("\n[3/3] Testando Supabase...")
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        supabase = create_client(url, key)
        res = supabase.table("companies").select("count").execute()
        print("✅ Supabase: Conexão ok!")
        return True
    except Exception as e:
        print(f"❌ Supabase: Erro -> {e}")
        return False

if __name__ == "__main__":
    print("=== INICIANDO TESTE DE CREDENCIAIS ===\n")
    aws = test_aws()
    plug = test_plugnotas()
    supa = test_supabase()
    
    print("\n" + "="*40)
    if aws and plug and supa:
        print("🎯 TUDO PRONTO! Todas as chaves estão corretas.")
    else:
        print("⚠️ ATENÇÃO: Verifique os erros acima antes de prosseguir.")
    print("="*40)
