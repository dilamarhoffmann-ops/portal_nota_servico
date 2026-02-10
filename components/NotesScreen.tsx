
import React, { useState, useCallback } from 'react';
import { COMPANIES, YEARS, MONTHS, DUMMY_NOTES } from '../constants';
import { FilterOptions, Note, NoteStatus } from '../types';

interface NotesScreenProps {
  onToggleDarkMode: () => void; // Mantido para consistência, embora o Sidebar agora controle
}

const NotesScreen: React.FC<NotesScreenProps> = ({ onToggleDarkMode }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    companyId: COMPANIES[0].id,
    year: YEARS[0],
    month: MONTHS[1].id, // February is selected by default in the mockup
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilterOptions((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'month' ? parseInt(value) : value,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const filteredNotes = DUMMY_NOTES.filter((note) => {
    const companyMatch =
      filterOptions.companyId === COMPANIES[0].id ||
      note.company === COMPANIES.find((c) => c.id === filterOptions.companyId)?.name;
    const yearMatch = note.date.endsWith(filterOptions.year.toString());
    // Extract month from "DD/MM/YYYY" date string
    const noteMonth = parseInt(note.date.substring(3, 5));
    const monthMatch = filterOptions.month === 0 || noteMonth === filterOptions.month; // 0 for "Selecione o Mês" if needed, currently not used

    const searchMatch = note.number.includes(searchTerm) ||
                      note.company.toLowerCase().includes(searchTerm.toLowerCase());

    return companyMatch && yearMatch && monthMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const currentNotes = filteredNotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  return (
    <>
      <h1 className="text-lg font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-6">
        Notas de Serviço
      </h1>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tighter" htmlFor="company-select">
              Empresa
            </label>
            <select
              id="company-select"
              name="companyId"
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-md py-2 px-3 text-sm focus:ring-primary focus:border-primary"
              value={filterOptions.companyId}
              onChange={handleFilterChange}
            >
              {COMPANIES.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tighter" htmlFor="year-select">
              Ano
            </label>
            <select
              id="year-select"
              name="year"
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-md py-2 px-3 text-sm focus:ring-primary focus:border-primary"
              value={filterOptions.year}
              onChange={handleFilterChange}
            >
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tighter" htmlFor="month-select">
              Mês
            </label>
            <select
              id="month-select"
              name="month"
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-md py-2 px-3 text-sm focus:ring-primary focus:border-primary"
              value={filterOptions.month}
              onChange={handleFilterChange}
            >
              {MONTHS.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex space-x-2">
            <button className="w-8 h-8 rounded-full border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors" aria-label="Adicionar Nota">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
            <button className="w-8 h-8 rounded-full border border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors" aria-label="Editar Nota">
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
          <div className="relative w-72">
            <input
              className="w-full pl-3 pr-10 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-sm focus:ring-primary focus:border-primary placeholder:text-slate-400 transition-colors"
              placeholder="Buscar em Notas..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar notas"
            />
            <span className="material-symbols-outlined absolute right-3 top-1.5 text-slate-400 text-lg">search</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredNotes.length > 0 ? (
            <table className="w-full text-left border-collapse" aria-label="Tabela de Notas de Serviço">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-6 w-12 text-slate-400">
                    <input
                      className="rounded border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-primary focus:ring-primary"
                      type="checkbox"
                      aria-label="Selecionar todas as notas"
                    />
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-primary transition-colors">
                      <span>#Número</span>
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                    </div>
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-primary transition-colors">
                      <span>Empresa</span>
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                    </div>
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-primary transition-colors">
                      <span>Data</span>
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                    </div>
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-primary transition-colors">
                      <span>Situação</span>
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                    </div>
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <input
                        className="rounded border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-primary focus:ring-primary"
                        type="checkbox"
                        aria-label={`Selecionar nota ${note.number}`}
                      />
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {note.number}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {note.company}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {note.date}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          note.status === NoteStatus.PROCESSED
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : note.status === NoteStatus.PENDING
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {note.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {note.status === NoteStatus.ERROR ? (
                        <button className="text-slate-300 cursor-not-allowed" disabled aria-label="Download indisponível">
                          <span className="material-symbols-outlined">file_download_off</span>
                        </button>
                      ) : (
                        <button className="text-primary hover:text-blue-700 dark:text-blue-400 transition-colors" aria-label={`Download da nota ${note.number}`}>
                          <span className="material-symbols-outlined">download</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              Nenhuma nota encontrada para os filtros selecionados.
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredNotes.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Exibindo {(currentPage - 1) * itemsPerPage + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filteredNotes.length)} de {filteredNotes.length} resultados
            </div>
            <div className="flex space-x-1">
              <button
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Página anterior"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`px-3 py-1 rounded font-medium ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => handlePageChange(page)}
                  aria-label={`Página ${page}`}
                >
                  {page}
                </button>
              ))}
              <button
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Próxima página"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotesScreen;