
import React from 'react';

const Header: React.FC = () => {
  const currentDate = '09/02/2026'; // Placeholder for current date

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 transition-colors duration-200">
      <div className="flex items-center space-x-6">
        <button className="text-slate-500 hover:text-primary transition-colors" aria-label="Abrir menu">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="relative">
          <input
            className="pl-4 pr-10 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-sm w-40 focus:ring-primary focus:border-primary transition-colors"
            readOnly
            type="text"
            value={currentDate}
            aria-label="Data atual"
          />
          <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 text-lg">calendar_today</span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative group cursor-pointer" aria-label="Notificações da empresa">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">domain</span>
          <span className="absolute -top-2 -right-2 bg-sky-400 text-white text-[10px] px-1 rounded-full font-bold">100</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs" aria-label="Iniciais do usuário">
          DH
        </div>
      </div>
    </header>
  );
};

export default Header;