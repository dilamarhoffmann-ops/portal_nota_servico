
import React, { useMemo, useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js/auto';
import { MONTHS, supabase } from '../constants';
import { ServiceNote, Company } from '../types';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardScreenProps {
  isDarkMode: boolean;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ isDarkMode }) => {
  const [notes, setNotes] = useState<ServiceNote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all active notes
      const { data: notesData, error: notesError } = await supabase
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
        .eq('status', 'active');

      if (notesError) throw notesError;

      // Fetch all active companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('status', 'active');

      if (companiesError) throw companiesError;

      setNotes(notesData || []);
      setCompanies(companiesData || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const textColor = isDarkMode ? '#C1E8FF' : '#052659';
  const gridColor = isDarkMode ? 'rgba(125, 160, 202, 0.1)' : 'rgba(5, 38, 89, 0.05)';

  const getChartOptions = (chartTitle: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: chartTitle,
        color: textColor,
        font: {
          size: 14,
          weight: 'bold' as const,
          family: "'Inter', sans-serif"
        },
        padding: { bottom: 20 }
      },
      legend: {
        labels: {
          color: textColor,
          font: {
            family: "'Inter', sans-serif",
            weight: 'bold' as const,
            size: 11
          }
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: textColor,
          font: { family: "'Inter', sans-serif", weight: 'normal' as const }
        },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: "'Inter', sans-serif", weight: 'normal' as const }
        },
        beginAtZero: true,
      },
    },
  });

  const pieChartOptions = {
    ...getChartOptions(""),
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  // Data for "Notas por Mês" (Current Year)
  const notesByMonthData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const counts: { [key: number]: number } = {};
    MONTHS.forEach(month => (counts[month.id] = 0));

    notes.forEach(note => {
      const noteDate = new Date(note.data_emissao);
      if (noteDate.getFullYear() === currentYear) {
        const month = noteDate.getMonth() + 1;
        if (counts[month] !== undefined) {
          counts[month]++;
        }
      }
    });

    return {
      labels: MONTHS.map(month => month.name),
      datasets: [
        {
          label: `Notas em ${currentYear}`,
          data: MONTHS.map(month => counts[month.id]),
          backgroundColor: '#5483B3',
          borderColor: '#052659',
          borderWidth: 0,
          borderRadius: 8,
          hoverBackgroundColor: '#052659',
        },
      ],
    };
  }, [notes]);

  // Data for "Notas por Status"
  const notesByStatusData = useMemo(() => {
    const syncedCount = notes.filter(n => n.sync_status === 'synced').length;
    const pendingCount = notes.filter(n => n.sync_status === 'pending' || !n.sync_status).length;
    const errorCount = notes.filter(n => n.sync_status === 'error').length;

    const backgroundColors = [
      '#10B981', // green (synced)
      '#5483B3', // primary (pending)
      '#EF4444', // red (error)
    ];

    return {
      labels: ['SINCRONIZADAS', 'PENDENTES', 'ERRO'],
      datasets: [
        {
          data: [syncedCount, pendingCount, errorCount],
          backgroundColor: backgroundColors,
          borderWidth: 0,
          hoverOffset: 15
        },
      ],
    };
  }, [notes]);

  // Data for "Notas por Empresa"
  const notesByCompanyData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    companies.forEach(c => (counts[c.id] = 0));

    notes.forEach(note => {
      if (note.company_id && counts[note.company_id] !== undefined) {
        counts[note.company_id]++;
      }
    });

    const sortedCompanies = [...companies]
      .map(c => ({ ...c, count: counts[c.id] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const dynamicColors = [
      '#052659',
      '#5483B3',
      '#7DA0CA',
      '#C1E8FF',
      '#f59e0b',
    ];

    return {
      labels: sortedCompanies.map(c => c.nome_fantasia || c.razao_social || 'Empresa'),
      datasets: [
        {
          label: 'Número de Notas',
          data: sortedCompanies.map(c => c.count),
          backgroundColor: dynamicColors,
          borderWidth: 0,
          borderRadius: 8,
        },
      ],
    };
  }, [notes, companies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-red-600 dark:text-red-400 glass-card">
        <p className="font-bold">{error}</p>
        <button onClick={fetchDashboardData} className="mt-2 text-sm font-black underline uppercase tracking-widest">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-deep-navy dark:text-white tracking-tighter uppercase">
            Visão Geral
          </h1>
          <p className="text-sm font-medium text-light-blue uppercase tracking-[0.2em] mt-1">
            Inteligência de documentos fiscais
          </p>
        </div>
        <div className="flex items-center gap-6 px-8 py-4 glass-card rounded-3xl shadow-premium">
          <div className="text-center">
            <div className="text-[10px] font-black text-light-blue uppercase tracking-widest mb-1">Total de Notas</div>
            <div className="text-3xl font-black text-deep-navy dark:text-ice-blue">{notes.length}</div>
          </div>
          <div className="w-px h-10 bg-light-blue/20"></div>
          <div className="text-center">
            <div className="text-[10px] font-black text-light-blue uppercase tracking-widest mb-1">Empresas</div>
            <div className="text-3xl font-black text-deep-navy dark:text-ice-blue">{companies.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 glass-card rounded-[2rem] p-10 animate-slide-up shadow-premium">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-deep-navy dark:text-white uppercase tracking-tight">Fluxo de Emissões</h2>
            <div className="p-3 bg-ice-blue/30 rounded-2xl">
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
          </div>
          <div className="h-[400px]">
            <Bar data={notesByMonthData} options={getChartOptions("Volume Mensal")} />
          </div>
        </div>

        <div className="lg:col-span-4 glass-card rounded-[2rem] p-10 animate-slide-up shadow-premium" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-black text-deep-navy dark:text-white uppercase tracking-tight mb-8">Integridade</h2>
          <div className="h-[250px] flex items-center justify-center">
            <Pie data={notesByStatusData} options={pieChartOptions} />
          </div>
          <div className="mt-10 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Sincronizadas</span>
              <span className="text-xl font-black text-emerald-700">{notes.filter(n => n.sync_status === 'synced').length}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Pendentes</span>
              <span className="text-xl font-black text-primary">{notes.filter(n => n.sync_status === 'pending' || !n.sync_status).length}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 glass-card rounded-[2rem] p-10 animate-slide-up shadow-premium" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-deep-navy dark:text-white uppercase tracking-tight">Top Performance por Cliente</h2>
            <button className="px-6 py-2 bg-primary/10 text-primary text-xs font-black rounded-xl uppercase hover:bg-primary hover:text-white transition-all">Relatório Completo</button>
          </div>
          <div className="h-[350px]">
            <Bar data={notesByCompanyData} options={getChartOptions("Ranking de Notas")} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;