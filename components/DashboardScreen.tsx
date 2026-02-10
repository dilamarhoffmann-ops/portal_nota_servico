
import React, { useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js/auto';
import { DUMMY_NOTES, MONTHS, COMPANIES } from '../constants';
import { NoteStatus } from '../types';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardScreenProps {
  isDarkMode: boolean;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ isDarkMode }) => {
  const textColor = isDarkMode ? '#CBD5E1' : '#475569'; // slate-300 / slate-700
  const gridColor = isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'; // slate-600/30 / slate-300/50

  const getChartOptions = (chartTitle: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: chartTitle,
        color: textColor,
        font: {
          size: 16,
          weight: 'bold',
          family: 'Inter, sans-serif'
        },
      },
      legend: {
        labels: {
          color: textColor,
          font: {
            family: 'Inter, sans-serif'
          }
        },
      },
      tooltip: {
        titleFont: { family: 'Inter, sans-serif' },
        bodyFont: { family: 'Inter, sans-serif' }
      }
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
          font: {
            family: 'Inter, sans-serif'
          }
        },
      },
      y: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
          font: {
            family: 'Inter, sans-serif'
          }
        },
        beginAtZero: true,
      },
    },
  });

  const pieChartOptions = {
    ...getChartOptions(""), // No main title for Pie, as it's typically in the card header
    scales: {
      x: {
        display: false, // Hide x-axis for pie chart
      },
      y: {
        display: false, // Hide y-axis for pie chart
      },
    },
  };

  // Data for "Notas por Mês"
  const notesByMonthData = useMemo(() => {
    const counts: { [key: number]: number } = {};
    MONTHS.forEach(month => (counts[month.id] = 0)); // Initialize all months
    DUMMY_NOTES.forEach(note => {
      const month = parseInt(note.date.substring(3, 5));
      if (counts[month] !== undefined) {
        counts[month]++;
      }
    });

    return {
      labels: MONTHS.map(month => month.name),
      datasets: [
        {
          label: 'Número de Notas',
          data: MONTHS.map(month => counts[month.id]),
          backgroundColor: isDarkMode ? '#60A5FA' : '#4a5585', // blue-400 / primary
          borderColor: isDarkMode ? '#3B82F6' : '#3d457a',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: isDarkMode ? '#3B82F6' : '#3d457a',
        },
      ],
    };
  }, [isDarkMode]);

  // Data for "Notas por Status"
  const notesByStatusData = useMemo(() => {
    const counts = {
      [NoteStatus.PROCESSED]: 0,
      [NoteStatus.PENDING]: 0,
      [NoteStatus.ERROR]: 0,
    };
    DUMMY_NOTES.forEach(note => {
      counts[note.status]++;
    });

    const backgroundColors = [
      isDarkMode ? '#34D399' : '#10B981', // green-400 / emerald-500
      isDarkMode ? '#60A5FA' : '#3B82F6', // blue-400 / blue-500
      isDarkMode ? '#F87171' : '#EF4444', // red-400 / red-500
    ];

    const borderColors = [
      isDarkMode ? '#10B981' : '#059669', // green-500 / emerald-600
      isDarkMode ? '#3B82F6' : '#2563EB', // blue-500 / blue-600
      isDarkMode ? '#EF4444' : '#DC2626', // red-500 / red-600
    ];

    return {
      labels: Object.values(NoteStatus),
      datasets: [
        {
          label: 'Notas por Status',
          data: Object.values(counts),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  }, [isDarkMode]);

  // Data for "Notas por Empresa"
  const notesByCompanyData = useMemo(() => {
    const companyNames = COMPANIES.filter(c => c.id !== '1').map(c => c.name); // Excluir 'Selecione a Empresa'
    const counts: { [key: string]: number } = {};
    companyNames.forEach(name => (counts[name] = 0));

    DUMMY_NOTES.forEach(note => {
      if (counts[note.company] !== undefined) {
        counts[note.company]++;
      }
    });

    const dynamicColors = [
      isDarkMode ? '#60A5FA' : '#4a5585', // primary/blue
      isDarkMode ? '#34D399' : '#10B981', // green
      isDarkMode ? '#FBBF24' : '#F59E0B', // amber
      isDarkMode ? '#A78BFA' : '#8B5CF6', // violet
      isDarkMode ? '#EC4899' : '#E6498A', // pink
    ];

    return {
      labels: companyNames,
      datasets: [
        {
          label: 'Número de Notas',
          data: companyNames.map(name => counts[name]),
          backgroundColor: dynamicColors.slice(0, companyNames.length), // Use subset of colors if fewer companies
          borderColor: dynamicColors.map(color => color.replace('A5FA', '82F6').replace('D399', 'B981').replace('BF24', 'A057').replace('8BFA', '5CF6').replace('4899', '2D7B')), // Darken border slightly
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: dynamicColors.map(color => color.replace('A5FA', '82F6').replace('D399', 'B981').replace('BF24', 'A057').replace('8BFA', '5CF6').replace('4899', '2D7B')),
        },
      ],
    };
  }, [isDarkMode]);


  return (
    <>
      <h1 className="text-lg font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-6">
        Dashboard Analítico
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Card: Notas por Mês */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col transition-colors">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Notas por Mês</h2>
          <div className="flex-1 min-h-[250px]">
            <Bar data={notesByMonthData} options={getChartOptions("Notas por Mês")} />
          </div>
        </div>

        {/* Card: Notas por Status */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col transition-colors">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Notas por Status</h2>
          <div className="flex-1 min-h-[250px] flex items-center justify-center">
            <Pie data={notesByStatusData} options={pieChartOptions} />
          </div>
        </div>

        {/* Card: Notas por Empresa */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col transition-colors">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Notas por Empresa</h2>
          <div className="flex-1 min-h-[250px]">
            <Bar data={notesByCompanyData} options={getChartOptions("Notas por Empresa")} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardScreen;