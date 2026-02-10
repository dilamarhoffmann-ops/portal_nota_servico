
import React from 'react';

interface SidebarProps {
  onToggleDarkMode: () => void;
  activeItem: 'dashboard' | 'notes';
  onNavigate: (item: 'dashboard' | 'notes') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onToggleDarkMode, activeItem, onNavigate }) => {
  return (
    <aside className="w-64 bg-sidebar-light dark:bg-sidebar-dark flex-shrink-0 flex flex-col transition-colors duration-200">
      <div className="p-6 flex items-center justify-center border-b border-white/10 space-x-3">
        <div className="w-8 h-8 flex-shrink-0">
          <svg className="w-full h-full text-white fill-current" viewBox="0 0 100 100">
            <path d="M50 15L90 85H10L50 15Z"></path>
          </svg>
        </div>
        <span className="text-white text-lg font-bold tracking-widest uppercase mt-1">APOIO</span>
      </div>
      <nav className="flex-1 flex flex-col py-6">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <a
            className={`sidebar-item flex items-center px-6 py-3 transition-colors ${activeItem === 'dashboard'
              ? 'text-white bg-white/5 border-l-4 border-white'
              : 'text-white/80 hover:text-white'
              }`}
            href="#"
            onClick={() => onNavigate('dashboard')}
            aria-current={activeItem === 'dashboard' ? 'page' : undefined}
          >
            <span className="material-symbols-outlined text-xl mr-3">dashboard</span>
            <span className="text-sm font-medium">Dashboard</span>
          </a>
          <a
            className={`sidebar-item flex items-center px-6 py-3 transition-colors ${activeItem === 'notes'
              ? 'text-white bg-white/5 border-l-4 border-white'
              : 'text-white/80 hover:text-white'
              }`}
            href="#"
            onClick={() => onNavigate('notes')}
            aria-current={activeItem === 'notes' ? 'page' : undefined}
          >
            <span className="material-symbols-outlined text-xl mr-3">description</span>
            <span className="text-sm font-medium">Notas</span>
          </a>
        </div>
        <div className="mt-auto pt-4 border-t border-white/10">
          <a className="sidebar-item flex items-center px-6 py-4 text-white/80 hover:text-white transition-colors group" href="#">
            <span className="material-symbols-outlined text-xl mr-3 group-hover:text-red-300">logout</span>
            <span className="text-sm font-medium group-hover:text-red-300">Sair</span>
          </a>
        </div>
      </nav>
      <div className="p-4 border-t border-white/10">
        <button
          className="w-full flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
          onClick={onToggleDarkMode}
          aria-label="Alternar Tema"
        >
          <span className="material-symbols-outlined text-xl mr-2">dark_mode</span>
          <span className="text-xs font-medium">Alternar Tema</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;