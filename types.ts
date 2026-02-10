
export enum NoteStatus {
  PROCESSED = 'PROCESSED',
  PENDING = 'Aguardando',
  ERROR = 'Erro',
}

export interface Note {
  id: number;
  number: string;
  company: string;
  date: string;
  status: NoteStatus;
}

export interface Company {
  id: string;
  name: string;
}

export interface FilterOptions {
  companyId: string;
  year: number;
  month: number;
}
