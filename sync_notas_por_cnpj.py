"""
Script para sincronizar notas fiscais DIRETAMENTE da API PlugNotas para o Supabase.
Busca notas onde o CNPJ informado é o TOMADOR (ator=2).
"""
import requests
from datetime import datetime, timezone
from typing import List, Dict, Optional
import os
import sys
import argparse
import re

# Configuração de path para importações
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir in sys.path:
    sys.path.remove(current_dir)

from supabase import create_client, Client
from dotenv import load_dotenv

sys.path.insert(0, current_dir)

# Carregar env
env_path = os.path.join(current_dir, 'scripts', '.env')
load_dotenv(env_path)

# ================= CONFIGURAÇÕES =================
PLUGNOTAS_API_KEY = os.getenv("PLUGNOTAS_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not PLUGNOTAS_API_KEY:
    print("❌ ERRO: PLUGNOTAS_API_KEY não encontrada no arquivo .env")
    print(f"   Tentou carregar de: {env_path}")
    sys.exit(1)

# ================= CLIENTES =================
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def format_cnpj(cnpj: str) -> str:
    """Formata CNPJ: 00000000000191 -> 00.000.000/0001-91"""
    if not cnpj or len(cnpj) != 14: return cnpj
    return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"

def get_company_id_by_cnpj(cnpj: str) -> Optional[str]:
    try:
        # Tenta formatado e não formatado
        response = supabase.table('companies').select('id').or_(f"cnpj.eq.{cnpj},cnpj.eq.{format_cnpj(cnpj)}").execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        return None
    except Exception:
        return None

from datetime import datetime, timedelta

def fetch_notes_from_api(cnpj_tomador: str, data_inicial: str = "2024-01-01", data_final: str = "2026-12-31") -> List[Dict]:
    """Busca notas na API PlugNotas (Tomador) em intervalos de 30 dias."""
    print(f"📡 Consultando API PlugNotas para CNPJ: {cnpj_tomador}...")
    print(f"   🔑 Usando API Key: {PLUGNOTAS_API_KEY[:4]}...{PLUGNOTAS_API_KEY[-4:]}")
    
    url = "https://api.plugnotas.com.br/nfse/consultar/periodo"
    headers = {
        "X-API-KEY": PLUGNOTAS_API_KEY,
        "Content-Type": "application/json"
    }

    # Converter para datetime
    start_date = datetime.strptime(data_inicial, "%Y-%m-%d")
    end_date = datetime.strptime(data_final, "%Y-%m-%d")
    
    all_notes = []
    current_start = start_date

    while current_start <= end_date:
        # Definir intervalo de 30 dias (limite da API é 31)
        current_end = current_start + timedelta(days=30)
        if current_end > end_date:
            current_end = end_date
            
        periodo_ini = current_start.strftime("%Y-%m-%d")
        periodo_fim = current_end.strftime("%Y-%m-%d")
        
        print(f"   � Buscando período: {periodo_ini} a {periodo_fim}...")

        params = {
            "cpfCnpj": cnpj_tomador,
            "dataInicial": periodo_ini,
            "dataFinal": periodo_fim,
            "ator": 2, 
            "pagina": 1,
            "tamanhoPagina": 50
        }
        
        while True:
            try:
                response = requests.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()
                
                page_notes = []
                if isinstance(data, list):
                    page_notes = data
                elif 'notas' in data:
                    page_notes = data['notas']
                
                if not page_notes:
                    break
                    
                all_notes.extend(page_notes)
                print(f"      ✅ Página {params['pagina']}: {len(page_notes)} notas encontradas.")
                
                if len(page_notes) < params['tamanhoPagina']:
                    break
                    
                params['pagina'] += 1
                
            except requests.exceptions.RequestException as e:
                print(f"      ❌ Erro API: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"      Detalhe (Status {e.response.status_code}): {e.response.text}")
                break
        
        # Avançar para o próximo período
        current_start = current_end + timedelta(days=1)
            
    return all_notes

def sync_api_note_to_supabase(api_note: Dict, target_cnpj: str) -> bool:
    """Mapeia nota da API para Supabase."""
    try:
        # Extração de campos básicos
        # Estrutura esperada: { id, numero, emissao, prestador: { cpfCnpj }, tomador: { cpfCnpj }, ... }
        
        nota_id_plug = api_note.get('id')
        numero = str(api_note.get('numero', ''))
        
        # Datas
        data_emissao_raw = api_note.get('emissao', '')
        # Formatos possíveis: YYYY-MM-DDTHH:MM:SS, YYYY-MM-DD, DD/MM/YYYY
        if 'T' in data_emissao_raw:
            data_date = datetime.fromisoformat(data_emissao_raw.replace('Z', '+00:00'))
        elif '/' in data_emissao_raw:
             # Formato DD/MM/YYYY
             data_date = datetime.strptime(data_emissao_raw, '%d/%m/%Y')
        else:
            # Assume YYYY-MM-DD
            data_date = datetime.strptime(data_emissao_raw, '%Y-%m-%d')
            
        data_emissao = data_date.strftime('%Y-%m-%d')
        ano = data_date.year
        mes = data_date.month
        dia = data_date.day
        
        # Prestador / Tomador
        prestador = api_note.get('prestador', {})
        if isinstance(prestador, str):
            print(f"⚠️ Aviso: Prestador é string na nota {api_note.get('id')}: {prestador}")
            cnpj_prestador_raw = '' # Ou tentar extrair se for CNPJ
        else:
            cnpj_prestador_raw = prestador.get('cpfCnpj', '')
        
        tomador = api_note.get('tomador', {})
        if isinstance(tomador, str):
            print(f"⚠️ Aviso: Tomador é string na nota {api_note.get('id')}: {tomador}")
            cnpj_tomador_raw = target_cnpj
        else:
            cnpj_tomador_raw = tomador.get('cpfCnpj', target_cnpj)
        
        # Formatar
        cnpj_prestador_fmt = format_cnpj(cnpj_prestador_raw)
        cnpj_tomador_fmt = format_cnpj(cnpj_tomador_raw)
        
        # Buscar Company
        company_id = get_company_id_by_cnpj(cnpj_tomador_raw)
        
        # IDs e URLs
        # Se a API retornar URLs, usamos. Senão, deixamos None ou construímos se soubessemos o padrão.
        # Geralmente a API retorna 'pdf' ou 'linkPdf'?
        download_url_pdf = api_note.get('pdf') or api_note.get('urlPdf')
        download_url_xml = api_note.get('xml') or api_note.get('urlXml')
        
        # Verificar existência (por ID plugnotas OU Numero+Prestador)
        query = supabase.table('service_notes').select('id, nota_id')
        
        # Prioridade 1: Buscar pelo ID oficial do PlugNotas
        existing_by_id = None
        if nota_id_plug:
            existing_by_id = query.eq('nota_id', nota_id_plug).execute()
        
        record_id = None
        is_update = False
        
        if existing_by_id and existing_by_id.data:
            record_id = existing_by_id.data[0]['id']
            is_update = True
        else:
            # Prioridade 2: Buscar por chave semântica (Numero + Prestador)
            existing_by_content = supabase.table('service_notes')\
                .select('id')\
                .eq('numero_nfse', numero)\
                .or_(f"cnpj_prestador.eq.{cnpj_prestador_fmt},cnpj_prestador.eq.{cnpj_prestador_raw}")\
                .execute()
                
            if existing_by_content.data:
                record_id = existing_by_content.data[0]['id']
                is_update = True
        
        # Se não tem ID oficial mas estamos criando, gerar um fallback ou usar o numero
        final_nota_id = nota_id_plug or f"{numero}_{cnpj_prestador_raw}"

        record = {
            'nota_id': final_nota_id,
            'numero_nfse': numero,
            'company_id': company_id,
            'cnpj_tomador': cnpj_tomador_fmt,
            'cnpj_prestador': cnpj_prestador_fmt,
            'data_emissao': data_emissao,
            'ano': ano,
            'mes': mes,
            'dia': dia,
            'sync_status': 'synced',
            'status': 'active',
            's3_bucket': 'plugnotas-api', # Marcador de origem
            # URLs da API podem expirar, mas salvamos se tiver
            'download_url_pdf': download_url_pdf,
            'download_url_xml': download_url_xml
        }
        
        if is_update:
            supabase.table('service_notes').update(record).eq('id', record_id).execute()
            print(f"  ✅ Atualizada: {numero} (Prestador: {cnpj_prestador_fmt})")
        else:
            supabase.table('service_notes').insert(record).execute()
            print(f"  ✅ Inserida: {numero} (Prestador: {cnpj_prestador_fmt})")
            
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao processar nota {api_note.get('id')}: {e}")
        return False

def registrar_log(inicio: datetime, sucesso: int, total: int, erros: int, cnpj_filtro: str):
    try:
        agora = datetime.now(timezone.utc)
        log_data = {
            'started_at': inicio.isoformat(),
            'finished_at': agora.isoformat(),
            'status': 'completed',
            'notes_found': total,
            'notes_synced': sucesso,
            'error_message': f"Erros: {erros}" if erros > 0 else None,
            'metadata': {'source': 'plugnotas_api', 'cnpj_filter': cnpj_filtro}
        }
        supabase.table('sync_logs').insert(log_data).execute()
        print("✅ Log de execução registrado.")
    except Exception as e:
        print(f"⚠️ Erro log: {e}")

def main():
    parser = argparse.ArgumentParser(description="Sincronizar notas via API PlugNotas.")
    parser.add_argument("cnpj", nargs="?", help="CNPJ do Tomador (somente números)")
    args = parser.parse_args()

    target_cnpj = args.cnpj
    if not target_cnpj:
        target_cnpj = input("Digite o CNPJ do Tomador: ").strip()
    
    # Limpar CNPJ
    target_cnpj = re.sub(r'\D', '', target_cnpj)
    if len(target_cnpj) != 14:
        print("❌ CNPJ inválido.")
        return

    inicio_sync = datetime.now(timezone.utc)
    print("=" * 80)
    print(f"🚀 SYNC VIA API PLUGNOTAS | TOMADOR: {target_cnpj}")
    print("=" * 80)
    
    # 1. Buscar Notas
    notas = fetch_notes_from_api(target_cnpj)
    print(f"✅ Total de notas retornadas pela API: {len(notas)}")
    
    # 2. Sincronizar
    print("\n💾 Salvando no Supabase...")
    sucesso = 0
    erros = 0
    
    for nota in notas:
        if sync_api_note_to_supabase(nota, target_cnpj):
            sucesso += 1
        else:
            erros += 1
            
    print("=" * 80)
    print(f"✅ FIM. Sucesso: {sucesso} | Erros: {erros}")
    
    registrar_log(inicio_sync, sucesso, len(notas), erros, target_cnpj)

if __name__ == "__main__":
    main()
