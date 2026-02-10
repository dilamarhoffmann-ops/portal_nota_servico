
import { Company, Note, NoteStatus } from './types';

export const COMPANIES: Company[] = [
  { id: '1', name: 'Selecione a Empresa' },
  { id: '2', name: 'RODOTRUCK - RIO PRETO' },
  { id: '3', name: 'LOGÍSTICA INTEGRADA S.A.' },
  { id: '4', name: 'TRANSPORTES RÁPIDOS LTDA' },
];

export const YEARS: number[] = [2026, 2025, 2024, 2023];

export const MONTHS: { id: number; name: string }[] = [
  { id: 1, name: 'Janeiro' },
  { id: 2, name: 'Fevereiro' },
  { id: 3, name: 'Março' },
  { id: 4, name: 'Abril' },
  { id: 5, name: 'Maio' },
  { id: 6, name: 'Junho' },
  { id: 7, name: 'Julho' },
  { id: 8, name: 'Agosto' },
  { id: 9, name: 'Setembro' },
  { id: 10, name: 'Outubro' },
  { id: 11, name: 'Novembro' },
  { id: 12, name: 'Dezembro' },
];

export const DUMMY_NOTES: Note[] = [
  {
    id: 1,
    number: '6357',
    company: 'RODOTRUCK - RIO PRETO',
    date: '08/02/2026',
    status: NoteStatus.PROCESSED,
  },
  {
    id: 2,
    number: '6358',
    company: 'LOGÍSTICA INTEGRADA S.A.',
    date: '09/02/2026',
    status: NoteStatus.PENDING,
  },
  {
    id: 3,
    number: '6359',
    company: 'RODOTRUCK - RIO PRETO',
    date: '09/02/2026',
    status: NoteStatus.ERROR,
  },
  {
    id: 4,
    number: '6360',
    company: 'TRANSPORTES RÁPIDOS LTDA',
    date: '10/02/2026',
    status: NoteStatus.PROCESSED,
  },
  {
    id: 5,
    number: '6361',
    company: 'LOGÍSTICA INTEGRADA S.A.',
    date: '11/02/2026',
    status: NoteStatus.PENDING,
  },
  {
    id: 6,
    number: '6362',
    company: 'RODOTRUCK - RIO PRETO',
    date: '12/02/2026',
    status: NoteStatus.ERROR,
  },
  {
    id: 7,
    number: '6363',
    company: 'TRANSPORTES RÁPIDOS LTDA',
    date: '13/02/2026',
    status: NoteStatus.PROCESSED,
  },
  {
    id: 8,
    number: '6364',
    company: 'LOGÍSTICA INTEGRADA S.A.',
    date: '14/02/2026',
    status: NoteStatus.PENDING,
  },
  {
    id: 9,
    number: '6365',
    company: 'RODOTRUCK - RIO PRETO',
    date: '15/02/2026',
    status: NoteStatus.ERROR,
  },
  {
    id: 10,
    number: '6366',
    company: 'TRANSPORTES RÁPIDOS LTDA',
    date: '16/02/2026',
    status: NoteStatus.PROCESSED,
  },
];
