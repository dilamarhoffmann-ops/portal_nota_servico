
-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Informações Básicas
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  
  -- Inscrições
  inscricao_municipal VARCHAR(50),
  inscricao_estadual VARCHAR(50),
  
  -- Endereço
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(255),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado CHAR(2),
  cep VARCHAR(8),
  
  -- Contato
  email VARCHAR(255),
  telefone VARCHAR(20),
  
  -- Status e Controle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  certificate_id UUID, -- Referência futura para certificados
  
  -- Metadados
  owner_id UUID REFERENCES auth.users(id) -- Opcional: Vincular ao usuário que criou
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Política de acesso (Exemplo básico: permitir leitura para autenticados)
CREATE POLICY "Enable read access for authenticated users" ON companies
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política de inserção (Exemplo básico: permitir inserção para autenticados)
CREATE POLICY "Enable insert access for authenticated users" ON companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política de atualização (Exemplo básico: permitir atualização para autenticados)
CREATE POLICY "Enable update access for authenticated users" ON companies
  FOR UPDATE USING (auth.role() = 'authenticated');
