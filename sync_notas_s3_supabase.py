"""
Script para sincronizar notas fiscais do S3 para o Supabase.
Busca todas as notas no bucket S3 e registra no banco de dados.
"""
import boto3
from datetime import datetime
from typing import List, Dict, Optional
import os
import sys

# Corrigir conflito de nomes: se houver um diretório local chamado 'supabase', 
# o Python tentará importar dele em vez da biblioteca instalada.
# Removemos o diretório atual do sys.path temporariamente para a importação.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir in sys.path:
    sys.path.remove(current_dir)

from supabase import create_client, Client

# Restaurar o path para outras importações locais se necessário
sys.path.insert(0, current_dir)

import re

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
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Usando Service Role para sync de backend

# Cliente S3 com configuração de Assinatura V4 (Obrigatório para sa-east-1)
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


def parse_s3_key(s3_key: str) -> Optional[Dict]:
    """
    Extrai informações do caminho S3.
    Formato esperado: notas/{CNPJ}/{ANO}/{MES}/NFSe_{EMISSAO}_{NUMERO}_{PRESTADOR}.{pdf|xml}
    
    Exemplo: notas/25249058000102/2026/02/NFSe_10-02-2026_12345_12345678000199.pdf
    """
    pattern = r'notas/(\d{14})/(\d{4})/(\d{2})/NFSe_(\d{2})-(\d{2})-(\d{4})_(\d+)_(\d{14})\.(pdf|xml)'
    match = re.match(pattern, s3_key)
    
    if not match:
        print(f"  ⚠️  Formato inválido: {s3_key}")
        return None
    
    cnpj_tomador, ano_path, mes_path, dia, mes_emissao, ano_emissao, numero, cnpj_prestador, tipo = match.groups()
    
    # IMPORTANTE: Removida a validação de correspondência entre pasta e arquivo
    # Algumas notas podem estar em pastas de 2026 mesmo sendo de 2025.
    # Vamos confiar na data contida no nome do arquivo (NFSe_DD-MM-YYYY).
    
    data_emissao = f"{ano_emissao}-{mes_emissao}-{dia}"
    
    return {
        'cnpj_tomador': cnpj_tomador,
        'cnpj_prestador': cnpj_prestador,
        'ano': int(ano_emissao),
        'mes': int(mes_emissao),
        'dia': int(dia),
        'data_emissao': data_emissao,
        'numero_nfse': numero,
        'tipo': tipo  # pdf ou xml
    }


def list_all_s3_files(prefix: str = "notas/") -> List[str]:
    """Lista todos os arquivos no bucket S3."""
    print(f"🔍 Listando arquivos no bucket S3: {BUCKET_NAME}/{prefix}")
    
    all_files = []
    paginator = s3_client.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        if 'Contents' in page:
            for obj in page['Contents']:
                key = obj['Key']
                # Filtrar apenas PDFs e XMLs
                if key.endswith('.pdf') or key.endswith('.xml'):
                    all_files.append(key)
    
    print(f"✅ Total de arquivos encontrados: {len(all_files)}")
    return all_files


def generate_s3_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """Gera URL pré-assinada para download do S3 (válida por 1 hora)."""
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


def get_company_id_by_cnpj(cnpj: str) -> Optional[str]:
    """Busca o ID da empresa no Supabase pelo CNPJ."""
    try:
        response = supabase.table('companies').select('id').eq('cnpj', cnpj).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        return None
    except Exception as e:
        print(f"  ⚠️  Erro ao buscar empresa com CNPJ {cnpj}: {e}")
        return None


def group_files_by_nota(files: List[str]) -> Dict[str, Dict]:
    """
    Agrupa arquivos PDF e XML da mesma nota.
    Retorna dict com chave única e dados consolidados.
    """
    notas = {}
    
    for file_path in files:
        info = parse_s3_key(file_path)
        if not info:
            continue
        
        # Chave única: cnpj_tomador + numero + data_emissao
        nota_key = f"{info['cnpj_tomador']}_{info['numero_nfse']}_{info['data_emissao']}"
        
        if nota_key not in notas:
            notas[nota_key] = {
                'cnpj_tomador': info['cnpj_tomador'],
                'cnpj_prestador': info['cnpj_prestador'],
                'numero_nfse': info['numero_nfse'],
                'data_emissao': info['data_emissao'],
                'ano': info['ano'],
                'mes': info['mes'],
                'dia': info['dia'],
                's3_path_pdf': None,
                's3_path_xml': None,
            }
        
        # Adicionar o caminho do arquivo
        if info['tipo'] == 'pdf':
            notas[nota_key]['s3_path_pdf'] = file_path
        elif info['tipo'] == 'xml':
            notas[nota_key]['s3_path_xml'] = file_path
    
    return notas


def sync_nota_to_supabase(nota_data: Dict) -> bool:
    """Insere ou atualiza uma nota no Supabase."""
    try:
        # Buscar company_id
        company_id = get_company_id_by_cnpj(nota_data['cnpj_tomador'])
        
        # Gerar URLs de download (válidas por 24 horas)
        download_url_pdf = generate_s3_presigned_url(nota_data['s3_path_pdf'], 86400) if nota_data['s3_path_pdf'] else None
        download_url_xml = generate_s3_presigned_url(nota_data['s3_path_xml'], 86400) if nota_data['s3_path_xml'] else None
        
        # Nota ID: usar numero_nfse + cnpj_prestador como ID único
        nota_id = f"{nota_data['numero_nfse']}_{nota_data['cnpj_prestador']}"
        
        # Dados para inserir/atualizar
        record = {
            'nota_id': nota_id,
            'numero_nfse': nota_data['numero_nfse'],
            'company_id': company_id,
            'cnpj_tomador': nota_data['cnpj_tomador'],
            'cnpj_prestador': nota_data['cnpj_prestador'],
            'data_emissao': nota_data['data_emissao'],
            'ano': nota_data['ano'],
            'mes': nota_data['mes'],
            'dia': nota_data['dia'],
            's3_path_pdf': nota_data['s3_path_pdf'],
            's3_path_xml': nota_data['s3_path_xml'],
            's3_bucket': BUCKET_NAME,
            'download_url_pdf': download_url_pdf,
            'download_url_xml': download_url_xml,
            'sync_status': 'synced',
            'status': 'active'
        }
        
        # Verificar se a nota já existe
        existing = supabase.table('service_notes')\
            .select('id')\
            .eq('nota_id', nota_id)\
            .eq('cnpj_tomador', nota_data['cnpj_tomador'])\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Atualizar registro existente
            result = supabase.table('service_notes')\
                .update(record)\
                .eq('id', existing.data[0]['id'])\
                .execute()
            print(f"  ✅ Atualizada: NFS-e {nota_data['numero_nfse']} - {nota_data['data_emissao']}")
        else:
            # Inserir novo registro
            result = supabase.table('service_notes').insert(record).execute()
            print(f"  ✅ Inserida: NFS-e {nota_data['numero_nfse']} - {nota_data['data_emissao']}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao sincronizar nota {nota_data.get('numero_nfse')}: {e}")
        return False


def main():
    """Função principal."""
    print("=" * 80)
    print("🚀 SINCRONIZAÇÃO DE NOTAS FISCAIS: S3 → SUPABASE")
    print("=" * 80)
    
    # 1. Listar todos os arquivos no S3
    all_files = list_all_s3_files()
    
    if not all_files:
        print("⚠️  Nenhum arquivo encontrado no S3.")
        return
    
    # 2. Agrupar arquivos por nota (PDF + XML)
    print("\n📦 Agrupando arquivos por nota...")
    notas = group_files_by_nota(all_files)
    print(f"✅ Total de notas identificadas: {len(notas)}")
    
    # 3. Sincronizar cada nota para o Supabase
    print("\n💾 Sincronizando notas para o Supabase...")
    success_count = 0
    error_count = 0
    
    for nota_key, nota_data in notas.items():
        if sync_nota_to_supabase(nota_data):
            success_count += 1
        else:
            error_count += 1
    
    # 4. Resumo final
    print("\n" + "=" * 80)
    print("✅ SINCRONIZAÇÃO CONCLUÍDA")
    print("=" * 80)
    print(f"✅ Notas sincronizadas com sucesso: {success_count}")
    print(f"❌ Erros durante a sincronização: {error_count}")
    print(f"📊 Total processado: {len(notas)}")
    print("=" * 80)


if __name__ == "__main__":
    main()
