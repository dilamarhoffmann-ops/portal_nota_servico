# 🚀 Guia de Implementação - Portal de Notas Fiscais

## ✅ Arquivos Criados

### 📁 Banco de Dados (Supabase Migrations)
1. **`supabase/migrations/20260210_create_service_notes_table.sql`**
   - Tabela `service_notes` para armazenar as notas fiscais
   - Relacionamento com a tabela `companies` via CNPJ
   - Campos para armazenar caminhos S3 e URLs de download
   - Índices para otimização de consultas
   - Políticas RLS para segurança

### 🐍 Scripts Python
1. **`sync_notas_s3_supabase.py`** - Script principal de sincronização
   - Lista todos os PDFs e XMLs no bucket S3
   - Parseia nomes dos arquivos para extrair metadados
   - Relaciona notas com empresas via CNPJ
   - Gera URLs pré-assinadas para download
   - Insere/atualiza registros no Supabase

2. **`update_download_urls.py`** - Script de manutenção
   - Renova URLs de download (expiram em 24h)
   - Deve ser executado diariamente (via cron/agendador)

3. **`requirements.txt`** - Dependências Python
   - boto3 (AWS S3)
   - supabase-py (cliente Supabase)
   - python-dotenv (variáveis de ambiente)

### ⚛️ Frontend (React + TypeScript)
1. **`components/ServiceNotesScreen.tsx`** - Componente principal
   - Lista de notas fiscais com filtros avançados
   - Busca por empresa, ano, mês, número, CNPJ
   - Botões de download para PDF e XML
   - Estatísticas visuais

2. **`components/ServiceNotesScreen.css`** - Estilos
   - Design moderno com gradientes
   - Animações suaves
   - Totalmente responsivo

3. **`types.ts`** - Tipos TypeScript atualizados
   - Interface `ServiceNote`
   - Enums para status
   - Tipos para filtros

4. **`constants.ts`** - Cliente Supabase
   - Exportação do cliente configurado
   - Constantes compartilhadas

5. **`vite-env.d.ts`** - Tipos de ambiente
   - Definições de variáveis de ambiente Vite

6. **`App.tsx`** - App principal atualizado
   - Nova rota 'service-notes'
   - Renderização condicional da tela

7. **`components/Sidebar.tsx`** - Navegação atualizada
   - Novo item "Notas Fiscais" no menu

---

## 📋 Passo a Passo para Execução

### 1️⃣ Aplicar Migrations no Supabase

Acesse o painel do Supabase e execute a migration:

```sql
-- Cole o conteúdo de: supabase/migrations/20260210_create_service_notes_table.sql
```

Ou use a CLI:
```bash
supabase db push
```

### 2️⃣ Instalar Dependências Python

```bash
# Certifique-se de ter Python 3.8+ instalado
python --version

# Instalar dependências
pip install boto3==1.35.81
pip install supabase-py==2.13.1
pip install python-dotenv==1.0.1

# Ou usando requirements.txt
pip install -r requirements.txt
```

### 3️⃣ Sincronizar Notas do S3 para Supabase

Execute o script de sincronização:

```bash
python sync_notas_s3_supabase.py
```

Este processo irá:
- ✅ Listar todos os arquivos no S3
- ✅ Parsear metadados dos nomes
- ✅ Relacionar com empresas
- ✅ Gerar URLs de download
- ✅ Salvar no Supabase

### 4️⃣ Configurar Atualização Automática de URLs

As URLs do S3 expiram em 24 horas. Configure execução diária:

**Windows (Agendador de Tarefas):**
1. Abra o "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Nome: "Atualizar URLs Notas Fiscais"
4. Gatilho: Diariamente às 03:00
5. Ação: Iniciar programa
   - Programa: `python`
   - Argumentos: `"C:\caminho\completo\update_download_urls.py"`
6. Salvar

**Linux/Mac (crontab):**
```bash
# Editar crontab
crontab -e

# Adicionar linha (executa diariamente às 03:00)
0 3 * * * /usr/bin/python3 /caminho/completo/update_download_urls.py
```

### 5️⃣ Iniciar Frontend

```bash
# Instalar dependências do Node
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: **http://localhost:5173**

---

## 🗂️ Estrutura de Dados S3

Os arquivos no S3 seguem este padrão:

```
notas/
  └── {CNPJ_TOMADOR}/          # Ex: 25249058000102
      └── {ANO}/                # Ex: 2026
          └── {MÊS}/            # Ex: 02
              ├── NFSe_{DATA}_{NUMERO}_{CNPJ_PRESTADOR}.pdf
              └── NFSe_{DATA}_{NUMERO}_{CNPJ_PRESTADOR}.xml
```

**Exemplo real:**
```
notas/25249058000102/2026/02/NFSe_10-02-2026_12345_12345678000199.pdf
notas/25249058000102/2026/02/NFSe_10-02-2026_12345_12345678000199.xml
```

---

## 🔍 Como Funciona

### 1. Sincronização S3 → Supabase

```
┌─────────────┐
│   Bucket    │
│     S3      │ ──┐
│ (plug-notas)│   │
└─────────────┘   │
                  │ sync_notas_s3_supabase.py
                  │ • Lista arquivos
                  │ • Parseia nomes
                  │ • Gera URLs
                  ↓
┌─────────────┐
│  Supabase   │
│  Database   │
│service_notes│
└─────────────┘
```

### 2. Download pelo Portal

```
┌──────────────┐
│   Usuário    │
│  no Portal   │
└──────┬───────┘
       │ Clica em "Baixar PDF"
       ↓
┌──────────────┐
│  Supabase    │
│download_url_ │ ──┐
│     pdf      │   │ URL pré-assinada
└──────────────┘   │ (válida 24h)
                   ↓
               ┌─────────┐
               │   S3    │
               │ Arquivo │
               │   PDF   │
               └─────────┘
```

---

## 🎯 Funcionalidades do Portal

1. **Filtros Avançados**
   - Por empresa (CNPJ)
   - Por ano
   - Por mês
   - Busca por número da nota ou CNPJ

2. **Visualização**
   - Lista completa de notas
   - Informações: número, data, prestador, tomador, valor
   - Status de sincronização

3. **Download**
   - Botão para baixar PDF
   - Botão para baixar XML
   - Downloads diretos do S3 via URLs pré-assinadas

4. **Estatísticas**
   - Total de notas encontradas
   - PDFs disponíveis
   - XMLs disponíveis

---

## 🔐 Segurança

- ✅ **RLS habilitado** no Supabase
- ✅ **URLs pré-assinadas** do S3 (expiram em 24h)
- ✅ **Autenticação** necessária para acessar dados
- ⚠️ **Não commitar credenciais** AWS no código
- ⚠️ **Usar variáveis de ambiente** para chaves sensíveis

---

## 🐛 Solução de Problemas

### Erro: "boto3 not found"
```bash
pip install boto3
```

### Erro: "supabase not found"
```bash
pip install supabase-py
```

### Notas não aparecem no portal
1. Verificar se a migration foi aplicada
2. Executar `sync_notas_s3_supabase.py`
3. Verificar se as empresas estão cadastradas na tabela `companies`

### URLs de download não funcionam
```bash
python update_download_urls.py
```

### Empresa não encontrada
Certifique-se de que a empresa está cadastrada em `companies` com o CNPJ correto (sem formatação: apenas números)

---

## 📊 Monitoramento

Para monitorar o sistema:

1. **Ver logs de sincronização**
   - Execute `sync_notas_s3_supabase.py` manualmente
   - Verifique output no console

2. **Consultar Supabase**
   ```sql
   -- Total de notas sincronizadas
   SELECT COUNT(*) FROM service_notes WHERE sync_status = 'synced';
   
   -- Notas com erro
   SELECT * FROM service_notes WHERE sync_status = 'error';
   
   -- Notas por empresa
   SELECT 
     c.razao_social, 
     COUNT(sn.id) as total_notas
   FROM service_notes sn
   JOIN companies c ON sn.company_id = c.id
   GROUP BY c.razao_social
   ORDER BY total_notas DESC;
   ```

---

## 🎉 Conclusão

Agora você tem um sistema completo para:
- ✅ Sincronizar automaticamente notas do S3
- ✅ Armazenar metadados no Supabase
- ✅ Consultar e filtrar notas via interface web
- ✅ Fazer download seguro de PDFs e XMLs
- ✅ Manter URLs atualizadas automaticamente

**Próximos passos sugeridos:**
- Configurar autenticação de usuários
- Adicionar mais filtros (por valor, descrição)
- Implementar cache de consultas
- Adicionar gráficos e relatórios
- Notificações de novas notas

---

📧 **Dúvidas?** Entre em contato com a equipe de desenvolvimento.
