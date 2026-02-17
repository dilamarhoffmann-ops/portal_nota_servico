"""
Script auxiliar para atualizar URLs de download das notas fiscais.
As URLs do S3 são pré-assinadas e expiram após 24 horas.
Este script pode ser executado periodicamente (ex: via cron job) para manter as URLs atualizadas.
"""
import boto3
import os
import sys

# Corrigir conflito de nomes: se houver um diretório local chamado 'supabase', 
# o Python tentará importar dele em vez da biblioteca instalada.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir in sys.path:
    sys.path.remove(current_dir)

from supabase import create_client, Client

# Restaurar o path
sys.path.insert(0, current_dir)

from datetime import datetime, timedelta
from botocore.config import Config

from dotenv import load_dotenv

# Carregar variáveis de ambiente
env_path = os.path.join(current_dir, 'scripts', '.env')
load_dotenv(env_path)

# ================= CONFIGURAÇÕES AWS =================
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
REGION_NAME = os.getenv("AWS_REGION", "sa-east-1")
BUCKET_NAME = os.getenv("AWS_BUCKET", "plug-notas")

# ================= CONFIGURAÇÕES SUPABASE =================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Cliente S3 com Assinatura V4
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=REGION_NAME,
    endpoint_url=f"https://s3.{REGION_NAME}.amazonaws.com",
    config=Config(signature_version='s3v4')
)

# Cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def generate_presigned_url(s3_key: str, expiration: int = 86400) -> str:
    """Gera URL pré-assinada válida por 24 horas."""
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        print(f"  ❌ Erro ao gerar URL para {s3_key}: {e}")
        return ""


def update_download_urls():
    """Atualiza as URLs de download para todas as notas ativas."""
    print("🔄 Atualizando URLs de download...")
    
    try:
        # Buscar todas as notas ativas
        response = supabase.table('service_notes')\
            .select('id, s3_path_pdf, s3_path_xml')\
            .eq('status', 'active')\
            .execute()
        
        notas = response.data
        print(f"📊 Total de notas para atualizar: {len(notas)}")
        
        success_count = 0
        error_count = 0
        
        for nota in notas:
            try:
                updates = {}
                
                # Gerar nova URL para PDF
                if nota.get('s3_path_pdf'):
                    url_pdf = generate_presigned_url(nota['s3_path_pdf'])
                    if url_pdf:
                        updates['download_url_pdf'] = url_pdf
                
                # Gerar nova URL para XML
                if nota.get('s3_path_xml'):
                    url_xml = generate_presigned_url(nota['s3_path_xml'])
                    if url_xml:
                        updates['download_url_xml'] = url_xml
                
                # Atualizar no banco
                if updates:
                    supabase.table('service_notes')\
                        .update(updates)\
                        .eq('id', nota['id'])\
                        .execute()
                    success_count += 1
                    print(f"  ✅ Atualizada nota ID: {nota['id']}")
                
            except Exception as e:
                error_count += 1
                print(f"  ❌ Erro ao atualizar nota ID {nota.get('id')}: {e}")
        
        print("\n" + "=" * 60)
        print("✅ ATUALIZAÇÃO CONCLUÍDA")
        print("=" * 60)
        print(f"✅ URLs atualizadas: {success_count}")
        print(f"❌ Erros: {error_count}")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Erro ao buscar notas: {e}")


def main():
    """Função principal."""
    print("=" * 60)
    print("🔗 ATUALIZAÇÃO DE URLs DE DOWNLOAD")
    print("=" * 60)
    update_download_urls()


if __name__ == "__main__":
    main()
