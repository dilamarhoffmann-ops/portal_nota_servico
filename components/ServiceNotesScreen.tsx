import React, { useState, useEffect } from 'react';
import { supabase } from '../constants';
import { ServiceNote, Company } from '../types';
import './ServiceNotesScreen.css';

export const ServiceNotesScreen: React.FC = () => {
    const [notes, setNotes] = useState<ServiceNote[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all'); // Alterado para 'all' por padrão ou suportar 'all'
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCompanies();
        loadNotes();
    }, []);

    useEffect(() => {
        loadNotes();
    }, [selectedCompany, selectedYear, selectedMonth]);

    const loadCompanies = async () => {
        try {
            // Busca apenas empresas que tenham pelo menos uma nota vinculada
            // O !inner faz um "inner join", filtrando empresas sem notas
            const { data, error } = await supabase
                .from('companies')
                .select(`
                    id, 
                    cnpj, 
                    razao_social, 
                    nome_fantasia,
                    service_notes!inner(id)
                `)
                .eq('status', 'active')
                .order('razao_social');

            if (error) throw error;

            // Remover duplicatas de empresas (caso o PostgREST retorne por nota)
            // Embora o !inner no select de campos geralmente retorne a empresa, 
            // vamos garantir que temos uma lista única de IDs.
            const uniqueCompanies = Array.from(new Map((data || []).map(item => [item.id, item])).values());

            setCompanies(uniqueCompanies as any);
        } catch (err) {
            console.error('Erro ao carregar empresas:', err);
            setError('Erro ao carregar empresas');
        }
    };

    const loadNotes = async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('service_notes')
                .select(`
          *,
          companies:company_id (
            id,
            cnpj,
            razao_social,
            nome_fantasia
          )
        `)
                .eq('status', 'active')
                .order('data_emissao', { ascending: false });

            // Aplicar filtros
            if (selectedCompany !== 'all') {
                query = query.eq('company_id', selectedCompany);
            }

            if (selectedYear !== 'all') {
                query = query.eq('ano', selectedYear);
            }

            if (selectedMonth !== 'all') {
                query = query.eq('mes', selectedMonth);
            }

            const { data, error } = await query;

            if (error) throw error;

            setNotes(data || []);
        } catch (err) {
            console.error('Erro ao carregar notas:', err);
            setError('Erro ao carregar notas fiscais');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (url: string | null, tipo: string, numeroNfse: string) => {
        if (!url) {
            alert(`Arquivo ${tipo.toUpperCase()} não disponível para esta nota.`);
            return;
        }

        try {
            // Abrir URL em nova aba
            window.open(url, '_blank');
        } catch (err) {
            console.error(`Erro ao baixar ${tipo}:`, err);
            alert(`Erro ao baixar ${tipo.toUpperCase()}`);
        }
    };

    const filteredNotes = notes.filter(note => {
        if (!searchTerm) return true;

        const search = searchTerm.toLowerCase();
        // Remove pontuação para busca numérica
        const cleanSearch = search.replace(/[^\d]/g, '');

        // Busca no número da nota
        if (note.numero_nfse.toLowerCase().includes(search)) return true;

        // Busca nos CNPJs (limpando ambos antes de comparar)
        const cleanPrestador = (note.cnpj_prestador || '').replace(/[^\d]/g, '');
        const cleanTomador = (note.cnpj_tomador || '').replace(/[^\d]/g, '');

        if (cleanSearch && (cleanPrestador.includes(cleanSearch) || cleanTomador.includes(cleanSearch))) return true;

        // Busca nos nomes das empresas (se disponíveis via join)
        const company = (note as any).companies;
        if (company) {
            const razao = (company.razao_social || '').toLowerCase();
            const fantasia = (company.nome_fantasia || '').toLowerCase();
            if (razao.includes(search) || fantasia.includes(search)) return true;
        }

        return false;
    });

    // Configurações para os anos (últimos 5 anos + ano atual)
    const currentYear = new Date().getFullYear();
    const years = ['all', ...Array.from({ length: 5 }, (_, i) => currentYear - i)];

    const months = [
        { value: 'all', label: 'Todos os meses' },
        { value: 1, label: 'Janeiro' },
        { value: 2, label: 'Fevereiro' },
        { value: 3, label: 'Março' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Maio' },
        { value: 6, label: 'Junho' },
        { value: 7, label: 'Julho' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Setembro' },
        { value: 10, label: 'Outubro' },
        { value: 11, label: 'Novembro' },
        { value: 12, label: 'Dezembro' },
    ];

    const formatCNPJ = (cnpj: string) => {
        if (!cnpj || cnpj.length !== 14) return cnpj;
        return `${cnpj.substr(0, 2)}.${cnpj.substr(2, 3)}.${cnpj.substr(5, 3)}/${cnpj.substr(8, 4)}-${cnpj.substr(12, 2)}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="animate-fade-in p-2">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-deep-navy dark:text-white tracking-tighter uppercase">
                    Notas Fiscais
                </h1>
                <p className="text-sm font-medium text-light-blue uppercase tracking-[0.2em] mt-1">
                    Gestão e controle de documentos emitidos
                </p>
            </div>

            {/* Filtros */}
            <div className="glass-card rounded-[2rem] p-8 mb-8 animate-slide-up shadow-premium">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1">Empresa Prestadora</label>
                        <select
                            id="company-filter"
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            className="premium-input"
                        >
                            <option value="all">TODAS AS EMPRESAS</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                    {(company.nome_fantasia || company.razao_social || '').toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1">Ano de Referência</label>
                        <select
                            id="year-filter"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="premium-input"
                        >
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year === 'all' ? 'TODOS OS ANOS' : year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1">Mês de Referência</label>
                        <select
                            id="month-filter"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="premium-input"
                        >
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1">Busca Rápida</label>
                        <div className="relative">
                            <input
                                id="search-filter"
                                type="text"
                                placeholder="NÚMERO, CNPJ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="premium-input"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="glass-card rounded-2xl p-6 text-center border-b-4 border-primary shadow-premium">
                    <div className="text-2xl font-black text-deep-navy dark:text-white mb-1">{filteredNotes.length}</div>
                    <div className="text-[9px] font-black text-light-blue uppercase tracking-widest leading-tight">Total Localizado</div>
                </div>
                <div className="glass-card rounded-2xl p-6 text-center border-b-4 border-accent-orange shadow-premium">
                    <div className="text-2xl font-black text-accent-orange mb-1">
                        {filteredNotes.filter(n => n.download_url_pdf).length}
                    </div>
                    <div className="text-[9px] font-black text-light-blue uppercase tracking-widest leading-tight">Documentos PDF</div>
                </div>
                <div className="col-span-2 glass-card rounded-2xl p-6 flex items-center justify-center gap-4 border-l-4 border-primary bg-primary/5">
                    <span className="material-symbols-outlined text-primary text-3xl">info</span>
                    <p className="text-[10px] font-bold text-deep-blue dark:text-light-blue uppercase leading-relaxed max-w-xs">
                        Para visualizar o documento, clique no ícone <span className="text-red-500">PDF</span> ou <span className="text-blue-500">XML</span> correspondente na tabela abaixo.
                    </p>
                </div>
            </div>

            {/* Tabela de Notas */}
            <div className="glass-card rounded-[2rem] overflow-hidden animate-slide-up shadow-premium mb-10" style={{ animationDelay: '0.2s' }}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-xs font-black text-light-blue uppercase tracking-widest">Sincronizando registros...</p>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="py-32 text-center">
                        <span className="material-symbols-outlined text-6xl text-light-blue/20 mb-4 scale-150">search_off</span>
                        <p className="text-sm font-black text-light-blue uppercase tracking-widest">Nenhuma nota encontrada no período</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left premium-table">
                            <thead>
                                <tr>
                                    <th>Número / ID</th>
                                    <th>Emissão</th>
                                    <th>Prestador (CNPJ)</th>
                                    <th>Valor total</th>
                                    <th>Status</th>
                                    <th className="text-center">Downloads</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-blue/10">
                                {filteredNotes.map((note) => (
                                    <tr key={note.id} className="hover:bg-primary/5 transition-all group">
                                        <td className="font-black text-deep-navy dark:text-white">
                                            #{note.numero_nfse}
                                        </td>
                                        <td className="text-sm font-bold text-light-blue italic">
                                            {formatDate(note.data_emissao)}
                                        </td>
                                        <td>
                                            <div className="text-xs font-black text-deep-blue dark:text-ice-blue bg-ice-blue/20 px-3 py-1 rounded-full inline-block">
                                                {formatCNPJ(note.cnpj_prestador)}
                                            </div>
                                        </td>
                                        <td className="font-black text-emerald-600">
                                            {note.valor_total
                                                ? `R$ ${note.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                : '-'}
                                        </td>
                                        <td>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${note.sync_status === 'synced'
                                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                }`}>
                                                {note.sync_status === 'synced' ? 'PRONTO' : 'PENDENTE'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-3">
                                                {note.download_url_pdf && (
                                                    <a
                                                        href={note.download_url_pdf}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-red-500/20"
                                                        title="Visualizar PDF"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                                    </a>
                                                )}
                                                {note.download_url_xml && (
                                                    <a
                                                        href={note.download_url_xml}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-primary/20"
                                                        title="Baixar XML"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">code</span>
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceNotesScreen;
