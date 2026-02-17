-- Tabela de Notas Fiscais de Serviço
CREATE TABLE IF NOT EXISTS service_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Identificação da Nota
  nota_id VARCHAR(100) NOT NULL, -- ID da nota na PlugNotas
  numero_nfse VARCHAR(50) NOT NULL, -- Número da NFS-e
  
  -- Relacionamento com Empresa
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  cnpj_tomador VARCHAR(14) NOT NULL, -- CNPJ da empresa tomadora (do filtro)
  cnpj_prestador VARCHAR(14), -- CNPJ do prestador de serviço
  
  -- Datas
  data_emissao DATE NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  dia INTEGER NOT NULL,
  
  -- Arquivos S3
  s3_path_pdf TEXT, -- Caminho do PDF no S3
  s3_path_xml TEXT, -- Caminho do XML no S3
  s3_bucket VARCHAR(100) DEFAULT 'plug-notas',
  
  -- URLs de Download (geradas via Supabase Storage ou S3)
  download_url_pdf TEXT,
  download_url_xml TEXT,
  
  -- Metadados da Nota
  valor_total DECIMAL(15,2),
  descricao_servico TEXT,
  codigo_servico VARCHAR(20),
  
  -- Status e Controle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'pending')),
  sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  error_message TEXT,
  
  -- Índice composto para consultas eficientes
  UNIQUE(nota_id, cnpj_tomador)
);

-- Índices para melhorar performance
CREATE INDEX idx_service_notes_company ON service_notes(company_id);
CREATE INDEX idx_service_notes_cnpj_tomador ON service_notes(cnpj_tomador);
CREATE INDEX idx_service_notes_data ON service_notes(data_emissao);
CREATE INDEX idx_service_notes_ano_mes ON service_notes(ano, mes);
CREATE INDEX idx_service_notes_nota_id ON service_notes(nota_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE service_notes ENABLE ROW LEVEL SECURITY;

-- Política de acesso (permitir leitura para autenticados)
CREATE POLICY "Enable read access for authenticated users" ON service_notes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política de inserção (permitir inserção para autenticados)
CREATE POLICY "Enable insert access for authenticated users" ON service_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política de atualização (permitir atualização para autenticados)
CREATE POLICY "Enable update access for authenticated users" ON service_notes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_notes_updated_at BEFORE UPDATE ON service_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
