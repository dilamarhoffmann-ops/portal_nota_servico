export enum ServiceNoteStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PENDING = 'pending',
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  ERROR = 'error',
}

export interface ServiceNote {
  id: string;
  created_at: string;
  updated_at: string;

  // Identificação
  nota_id: string;
  numero_nfse: string;

  // Relacionamentos
  company_id: string | null;
  cnpj_tomador: string;
  cnpj_prestador: string;

  // Datas
  data_emissao: string;
  ano: number;
  mes: number;
  dia: number;

  // Arquivos S3
  s3_path_pdf: string | null;
  s3_path_xml: string | null;
  s3_bucket: string;

  // URLs de Download
  download_url_pdf: string | null;
  download_url_xml: string | null;

  // Metadados
  valor_total: number | null;
  descricao_servico: string | null;
  codigo_servico: string | null;

  // Status
  status: ServiceNoteStatus;
  sync_status: SyncStatus;
  error_message: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'Gestor' | 'Usuario';
  company_id: string | null;
  allowed: boolean;
  requires_password_change: boolean;
  area: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
}

export interface FilterOptions {
  companyId: string;
  year: number;
  month: number;
}
