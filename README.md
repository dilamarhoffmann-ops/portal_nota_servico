# Portal de Notas de Serviço

Sistema completo para gerenciamento de Notas Fiscais de Serviço (NFS-e), com sincronização automática do S3 para Supabase e interface web para consulta e download.

## 🎯 Funcionalidades

- ✅ Sincronização automática de notas do S3 para Supabase
- ✅ Relacionamento automático de notas com empresas via CNPJ
- ✅ Organização por ano, mês e dia
- ✅ Interface web para consulta e download de PDFs/XMLs
- ✅ Filtros avançados (empresa, período, busca)
- ✅ URLs de download pré-assinadas do S3

## 📋 Pré-requisitos

- Python 3.8+
- Node.js 16+
- Conta Supabase
- Acesso ao bucket S3 com as notas

## 🚀 Instalação e Configuração

### 1. Instalar dependências Python

```bash
pip install -r requirements.txt
```

### 2. Aplicar migrations no Supabase

Acesse o painel do Supabase e execute as migrations na ordem:

1. `supabase/migrations/20260210_create_companies_table.sql`
2. `supabase/migrations/20260210_import_companies.sql`
3. `supabase/migrations/20260210_create_service_notes_table.sql`

Ou use a CLI do Supabase:

```bash
supabase db push
```

### 3. Configurar variáveis de ambiente

Certifique-se de que o arquivo `.env.local` está configurado:

```env
VITE_SUPABASE_URL=https://aknylhdkjepjrhmukknx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 4. Instalar dependências do frontend

```bash
npm install
```

## 📊 Uso

### Sincronizar notas do S3 para Supabase

Execute o script de sincronização pela primeira vez:

```bash
python sync_notas_s3_supabase.py
```

Este script irá:
1. Listar todos os arquivos PDF e XML no bucket S3
2. Parsear os nomes dos arquivos para extrair metadados
3. Relacionar cada nota com a empresa correspondente (via CNPJ)
4. Gerar URLs pré-assinadas para download
5. Inserir/atualizar os registros no Supabase

### Atualizar URLs de download

As URLs do S3 são pré-assinadas e expiram após 24 horas. Para renovar:

```bash
python update_download_urls.py
```

**Recomendação:** Agende este script para executar diariamente via cron job ou task scheduler.

#### Configurar execução automática (Windows)

1. Abra o Agendador de Tarefas
2. Crie nova tarefa básica
3. Trigger: Diariamente
4. Ação: Iniciar programa
   - Programa: `python`
   - Argumentos: `"C:\caminho\para\update_download_urls.py"`
5. Salvar

### Iniciar o portal web

```bash
npm run dev
```

Acesse: `http://localhost:5173`

## 🗂️ Estrutura de Dados

### Tabela `companies`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único da empresa |
| cnpj | VARCHAR(14) | CNPJ sem formatação |
| razao_social | VARCHAR(255) | Razão social |
| nome_fantasia | VARCHAR(255) | Nome fantasia |

### Tabela `service_notes`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único da nota |
| nota_id | VARCHAR(100) | ID da nota (número + CNPJ prestador) |
| numero_nfse | VARCHAR(50) | Número da NFS-e |
| company_id | UUID | FK para companies |
| cnpj_tomador | VARCHAR(14) | CNPJ da empresa tomadora |
| cnpj_prestador | VARCHAR(14) | CNPJ do prestador |
| data_emissao | DATE | Data de emissão |
| ano | INTEGER | Ano |
| mes | INTEGER | Mês |
| dia | INTEGER | Dia |
| s3_path_pdf | TEXT | Caminho do PDF no S3 |
| s3_path_xml | TEXT | Caminho do XML no S3 |
| download_url_pdf | TEXT | URL pré-assinada PDF |
| download_url_xml | TEXT | URL pré-assinada XML |
| sync_status | VARCHAR(20) | Status da sincronização |

## 📁 Estrutura de Arquivos no S3

```
notas/
  ├── {CNPJ_TOMADOR}/
  │   ├── {ANO}/
  │   │   ├── {MES}/
  │   │   │   ├── NFSe_{DATA}_{NUMERO}_{CNPJ_PRESTADOR}.pdf
  │   │   │   └── NFSe_{DATA}_{NUMERO}_{CNPJ_PRESTADOR}.xml
```

Exemplo:
```
notas/25249058000102/2026/02/NFSe_10-02-2026_12345_12345678000199.pdf
```

## 🔧 Solução de Problemas

### Erro: "boto3 not found"
```bash
pip install boto3
```

### Erro: "supabase not found"
```bash
pip install supabase-py
```

### URLs de download não funcionam
Execute o script de atualização:
```bash
python update_download_urls.py
```

### Empresa não encontrada para CNPJ
Certifique-se de que a empresa está cadastrada na tabela `companies` com o CNPJ correto (sem formatação).

## 🔐 Segurança

- ⚠️ **IMPORTANTE**: Nunca commite credenciais AWS no código
- Use variáveis de ambiente para chaves sensíveis
- As URLs pré-assinadas do S3 expiram após 24 horas
- Políticas RLS habilitadas no Supabase

## 🤝 Contribuindo

Para adicionar novas funcionalidades ou melhorias:

1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Faça suas alterações
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto é de uso interno.

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.
