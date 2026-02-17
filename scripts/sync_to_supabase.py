
import os
import requests
import boto3
import time
import calendar
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente do .env local da pasta de scripts
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# ================= CONFIGURAÇÕES AMBIENTE =================
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION", "sa-east-1")
AWS_BUCKET = os.getenv("AWS_BUCKET", "plug-notas")

PLUGNOTAS_API_KEY = os.getenv("PLUGNOTAS_API_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Clientes
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def registrar_log(status, notes=0, error=None):
    try:
        data = {
            "status": status,
            "notes_synced": notes,
            "error_message": error,
            "finished_at": datetime.now().isoformat()
        }
        supabase.table("sync_logs").insert(data).execute()
    except Exception as e:
        print(f"Erro ao registrar log: {e}")

def upload_s3(content, key):
    try:
        s3_client.put_object(Bucket=AWS_BUCKET, Key=key, Body=content)
        return True
    except Exception as e:
        print(f"      [S3] Erro: {e}")
        return False

def generate_presigned_url(key, expiration=604800): # 7 dias
    if not key: return None
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': AWS_BUCKET, 'Key': key},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        print(f"      [S3] Erro ao gerar URL: {e}")
        return None

def baixar_e_enviar(url, s3_key, headers):
    try:
        try:
            s3_client.head_object(Bucket=AWS_BUCKET, Key=s3_key)
            return True # Já existe
        except: pass

        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            return upload_s3(response.content, s3_key)
    except Exception as e:
        print(f"      [Erro] Download/Upload: {e}")
    return False

def registrar_nota_no_supabase(nota, cnpj_alvo, s3_paths, company_id):
    try:
        nota_id = nota.get("id")
        emissao = nota.get("emissao") or "2000-01-01"
        emissao_limpa = emissao[:10].replace("/", "-")
        
        try:
            # Tenta YYYY-MM-DD primeiro
            data_conv = datetime.strptime(emissao_limpa, "%Y-%m-%d")
        except ValueError:
            # Tenta DD-MM-YYYY
            data_conv = datetime.strptime(emissao_limpa, "%d-%m-%Y")
        
        data_iso = data_conv.strftime("%Y-%m-%d")

        # DETECTAR O VALOR CORRETO
        valor = nota.get("valorServico") or 0
        if valor == 0 and isinstance(nota.get("servico"), list) and len(nota.get("servico")) > 0:
            valor = nota.get("servico")[0].get("valor", {}).get("servico", 0)
        
        # Fallback para o objeto 'valor' ou 'total'
        if valor == 0:
            for field in ["valor", "total"]:
                v_obj = nota.get(field)
                if isinstance(v_obj, dict):
                    valor = v_obj.get("servico", 0)
                elif isinstance(v_obj, (int, float)):
                    valor = v_obj
                if valor > 0: break

        # RESOLVER URLS DE DOWNLOAD
        def get_url(field, type_str):
            if isinstance(field, str) and field.startswith('http'): return field
            if isinstance(field, dict) and field.get('url'): return field.get('url')
            if nota_id: return f"https://api.plugnotas.com.br/nfse/{type_str}/{nota_id}"
            return None

        # CNPJ Formatado para as colunas de busca rápida
        def format_cnpj(c):
            if not c: return c
            c = str(c).replace(".", "").replace("/", "").replace("-", "")
            if len(c) != 14: return c
            return f"{c[:2]}.{c[2:5]}.{c[5:8]}/{c[8:12]}-{c[12:]}"

        # Se o tomador ou prestador forem apenas strings (CNPJ), ou se o valor for zero,
        # e tivermos um nota_id válido, tentamos buscar o detalhe completo da nota.
        # Isso garante que teremos o endereço (dentro do objeto tomador/prestador).
        full_nota = nota
        if nota_id and len(nota_id) == 24 and (not isinstance(nota.get("tomador"), dict) or valor == 0):
            try:
                headers = {"X-API-KEY": PLUGNOTAS_API_KEY}
                res = requests.get(f"https://api.plugnotas.com.br/nfse/{nota_id}", headers=headers, timeout=15)
                if res.status_code == 200:
                    full_nota = res.json()
                    # Recalcular valor com dados completos
                    if valor == 0:
                        valor = full_nota.get("valorServico") or 0
                        if valor == 0 and isinstance(full_nota.get("servico"), list) and len(full_nota.get("servico")) > 0:
                            valor = full_nota.get("servico")[0].get("valor", {}).get("servico", 0)
                        if valor == 0 and isinstance(full_nota.get("valor"), dict):
                            valor = full_nota.get("valor").get("servico", 0)
            except: pass

        # RESOLVER URLS DE DOWNLOAD (Prioridade para S3 pré-assinado)
        url_pdf = generate_presigned_url(s3_paths.get("pdf"))
        url_xml = generate_presigned_url(s3_paths.get("xml"))
        
        # Fallback para PlugNotas se não estiver no S3
        if not url_pdf:
            field = full_nota.get("pdf")
            if isinstance(field, str) and field.startswith('http'): url_pdf = field
            elif isinstance(field, dict) and field.get('url'): url_pdf = field.get('url')
            elif nota_id: url_pdf = f"https://api.plugnotas.com.br/nfse/pdf/{nota_id}"
            
        if not url_xml:
            field = full_nota.get("xml")
            if isinstance(field, str) and field.startswith('http'): url_xml = field
            elif isinstance(field, dict) and field.get('url'): url_xml = field.get('url')
            elif nota_id: url_xml = f"https://api.plugnotas.com.br/nfse/xml/{nota_id}"

        data = {
            "nota_id": nota_id,
            "id_dps": full_nota.get("idDPS") or full_nota.get("id_dps"),
            "situacao": full_nota.get("situacao"),
            "serie": full_nota.get("serie"),
            "numero": str(full_nota.get("numero") or ""),
            "numero_nfse": str(full_nota.get("numeroNfse") or full_nota.get("numero") or nota_id),
            "chave_acesso_nfse": full_nota.get("chaveAcessoNfse"),
            "company_id": company_id,
            "cnpj_tomador": format_cnpj(cnpj_alvo),
            "cnpj_prestador": format_cnpj(full_nota.get("prestador", {}).get("cpfCnpj") if isinstance(full_nota.get("prestador"), dict) else str(full_nota.get("prestador"))),
            "tomador": full_nota.get("tomador"),
            "prestador": full_nota.get("prestador"),
            "data_emissao": data_iso,
            "ano": data_conv.year,
            "mes": data_conv.month,
            "dia": data_conv.day,
            "valor_total": valor,
            "s3_path_pdf": s3_paths.get("pdf"),
            "s3_path_xml": s3_paths.get("xml"),
            "s3_bucket": AWS_BUCKET,
            "download_url_pdf": url_pdf,
            "download_url_xml": url_xml,
            "sync_status": "synced",
            "status": "active"
        }
        
        # Limpar campos None para não quebrar o banco se houver restrições
        data = {k: v for k, v in data.items() if v is not None}
        
        supabase.table("service_notes").upsert(data, on_conflict="nota_id").execute()
        return True
    except Exception as e:
        print(f"      [Erro] Registro Supabase: {e}")
        return False

def sync_periodo(cnpj_formatado, company_id, ano, mes):
    headers = {"X-API-KEY": PLUGNOTAS_API_KEY, "Content-Type": "application/json"}
    cnpj_limpo = cnpj_formatado.replace(".", "").replace("/", "").replace("-", "")
    
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    data_ini = f"{ano}-{mes:02d}-01"
    data_fim = f"{ano}-{mes:02d}-{ultimo_dia:02d}"

    url = f"https://api.plugnotas.com.br/nfse/nacional/{cnpj_limpo}/consultar/periodo"
    count = 0
    hash_pagina = None

    while True:
        params = {"dataInicial": data_ini, "dataFinal": data_fim, "ator": 2, "quantidade": 50}
        if hash_pagina: params["hashProximaPagina"] = hash_pagina

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            if response.status_code != 200: break
            
            dados = response.json()
            notas = dados.get("notas", [])
            hash_pagina = dados.get("hashProximaPagina")

            for nota in notas:
                nota_id = nota.get("id")
                numero = str(nota.get("numeroNfse") or nota.get("numero") or nota_id)
                emissao_limpa = str(nota.get("emissao", "00-00-00")).replace("/", "-")[:10]
                
                path_base = f"notas/{cnpj_limpo}/{ano}/{mes:02d}/NFSe_{emissao_limpa}_{numero}"
                s3_pdf, s3_xml = path_base + ".pdf", path_base + ".xml"

                # Download e Upload S3
                baixar_e_enviar(nota.get("pdf") or f"https://api.plugnotas.com.br/nfse/pdf/{nota_id}", s3_pdf, headers)
                baixar_e_enviar(nota.get("xml") or f"https://api.plugnotas.com.br/nfse/xml/{nota_id}", s3_xml, headers)
                
                # Registro no Supabase
                registrar_nota_no_supabase(nota, cnpj_formatado, {"pdf": s3_pdf, "xml": s3_xml}, company_id)
                count += 1
            
            if not hash_pagina or len(notas) == 0: break
        except Exception as e:
            print(f"      [Erro] Falha na paginação: {e}")
            break
            
    return count

def corrigir_registros_incompletos():
    print("\n--- Verificando registros incompletos no Supabase ---")
    headers = {"X-API-KEY": PLUGNOTAS_API_KEY, "Content-Type": "application/json"}
    
    try:
        # Buscar notas com valor nulo ou sem endereço (tomador nulo)
        response = supabase.table("service_notes").select("id, nota_id, numero_nfse, cnpj_prestador, cnpj_tomador")\
            .or_("valor_total.is.null,tomador.is.null").limit(100).execute()
        
        incompletas = response.data
        if not incompletas:
            print("Nenhum registro incompleto encontrado.")
            return

        print(f"Encontrados {len(incompletas)} registros para tentar correção.")
        for note in incompletas:
            numero = note.get("numero_nfse")
            # Limpar CNPJ para pesquisa
            cnpj_prestador = str(note.get("cnpj_prestador", "")).replace(".", "").replace("/", "").replace("-", "")
            cnpj_tomador = str(note.get("cnpj_tomador", "")).replace(".", "").replace("/", "").replace("-", "")
            
            print(f"  > Corrigindo Nota {numero} (Prest: {cnpj_prestador})")
            
            # 1. Tentar buscar por ID se for um ID válido do PlugNotas (24 chars hex)
            full_data = None
            orig_id = note.get("nota_id")
            if orig_id and len(orig_id) == 24:
                try:
                    res = requests.get(f"https://api.plugnotas.com.br/nfse/{orig_id}", headers=headers, timeout=20)
                    if res.status_code == 200: full_data = res.json()
                except: pass
            
            # 2. Se não encontrou por ID, buscar por Numero/Prestador
            if not full_data:
                try:
                    params = {"numero": numero, "cnpjPrestador": cnpj_prestador}
                    if cnpj_tomador: params["cnpjTomador"] = cnpj_tomador
                    res = requests.get("https://api.plugnotas.com.br/nfse", headers=headers, params=params, timeout=20)
                    if res.status_code == 200:
                        results = res.json()
                        if isinstance(results, list) and len(results) > 0:
                            full_data = results[0]
                except: pass
            
            if full_data:
                # Re-utilizar a lógica de registro para atualizar
                # Note: aqui passamos caminhos vazios para S3 se não soubermos, 
                # mas o upsert manterá os existentes se não sobrescrevermos.
                # Para garantir que não deletamos os caminhos S3, vamos buscar os atuais.
                # Na verdade, a lógica de registrar_nota_no_supabase agora reconstrói tudo.
                s3_paths = {
                    "pdf": note.get("s3_path_pdf"),
                    "xml": note.get("s3_path_xml")
                }
                # Se não tem caminhos S3, vamos tentar gerar o base
                if not s3_paths["pdf"]:
                    # Tentar extrair ano/mes da emissao se disponível
                    emissao = full_data.get("emissao", "2000-01-01")
                    try:
                        dt = datetime.strptime(emissao[:10].replace("/", "-"), "%Y-%m-%d")
                    except:
                        dt = datetime.now()
                    path_base = f"notas/{cnpj_tomador}/{dt.year}/{dt.month:02d}/NFSe_{emissao[:10].replace('/', '-')}_{numero}"
                    s3_paths = {"pdf": path_base + ".pdf", "xml": path_base + ".xml"}

                # Pegar o company_id original
                company_id = note.get("company_id")
                # Se mudou o nota_id (ex: de manual para PlugNotas ID), precisamos deletar o antigo 
                # ou o upsert criará um novo. Como nota_id é o conflict target, se mudar, vira novo.
                new_id = full_data.get("id")
                
                if registrar_nota_no_supabase(full_data, cnpj_tomador, s3_paths, company_id):
                    print(f"    [OK] Atualizada com sucesso.")
                    # Se o ID mudou, deletar o registro antigo (o incompleto)
                    if new_id and orig_id and new_id != orig_id:
                        supabase.table("service_notes").delete().eq("id", note.get("id")).execute()
                        print(f"    [OK] Removido registro legado duplicado.")
            else:
                print(f"    [Aviso] Não encontrada na API.")

    except Exception as e:
        print(f"Erro na correção: {e}")

def main():
    print(f"\n--- Iniciando Sincronização Horária ({datetime.now().strftime('%d/%m/%Y %H:%M')}) ---")
    
    # 0. Corrigir registros legados sem valor ou endereço
    corrigir_registros_incompletos()
    
    try:
        # 1. Buscar empresas ativas do banco
        empresas = supabase.table("companies").select("id, cnpj").eq("active", True).execute()
        if not empresas.data:
            print("Nenhuma empresa ativa encontrada para sincronização.")
            return

        total_global = 0
        now = datetime.now()
        
        # Sincroniza o mês atual e o anterior para garantir que nada foi perdido
        meses_a_sincronizar = [
            (now.year, now.month),
            ((now - timedelta(days=28)).year, (now - timedelta(days=28)).month)
        ]
        # Remover duplicata se for o mesmo mês
        meses_a_sincronizar = list(set(meses_a_sincronizar))

        for emp in empresas.data:
            cnpj = emp['cnpj']
            company_id = emp['id']
            print(f"\n> Processando: {cnpj}")
            
            total_empresa = 0
            for ano, mes in meses_a_sincronizar:
                total_empresa += sync_periodo(cnpj, company_id, ano, mes)
            
            # Atualizar last_sync da empresa
            supabase.table("companies").update({"last_sync": now.isoformat()}).eq("id", company_id).execute()
            print(f"  [OK] Concluído. Notas: {total_empresa}")
            total_global += total_empresa

        registrar_log('completed', notes=total_global)
        print(f"\n--- Sincronização Finalizada. Total de Notas: {total_global} ---")

    except Exception as e:
        registrar_log('failed', error=str(e))
        print(f"Erro Crítico na main: {e}")

if __name__ == "__main__":
    main()
