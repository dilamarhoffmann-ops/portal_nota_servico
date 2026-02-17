
import React from 'react';


import { Profile } from '../types';

interface SidebarProps {
  onToggleDarkMode: () => void;
  activeItem: 'dashboard' | 'service-notes' | 'admin';
  onNavigate: (item: 'dashboard' | 'service-notes' | 'admin') => void;
  onLogout: () => void;
  userProfile?: Profile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onToggleDarkMode, activeItem, onNavigate, onLogout, userProfile }) => {
  return (
    <aside className="w-64 bg-deep-navy flex-shrink-0 flex flex-col transition-all duration-300">
      <div className="p-8 flex items-center justify-center border-b border-white/5 space-x-3">
        <div className="w-8 h-8 flex-shrink-0 animate-float">
          <svg className="w-full h-full text-white fill-current" viewBox="0 0 100 100">
            <path d="M50 15L90 85H10L50 15Z"></path>
          </svg>
        </div>
        <span className="text-white text-xl font-black tracking-widest uppercase">APOIO</span>
      </div>
      <nav className="flex-1 flex flex-col py-6">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
          <a
            className={`flex items-center px-4 py-3 rounded-xl mb-1 transition-all duration-300 ${activeItem === 'dashboard'
              ? 'text-white bg-primary shadow-lg shadow-primary/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            href="#"
            onClick={() => onNavigate('dashboard')}
          >
            <span className="material-symbols-outlined text-xl mr-3">dashboard</span>
            <span className="text-sm font-bold">Dashboard</span>
          </a>
          <a
            className={`flex items-center px-4 py-3 rounded-xl mb-1 transition-all duration-300 ${activeItem === 'service-notes'
              ? 'text-white bg-primary shadow-lg shadow-primary/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            href="#"
            onClick={() => onNavigate('service-notes')}
          >
            <span className="material-symbols-outlined text-xl mr-3">receipt_long</span>
            <span className="text-sm font-bold">Notas Fiscais</span>
          </a>


          <div className="mt-8 px-4 mb-3">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Administração</span>
          </div>
          <a
            className={`flex items-center px-4 py-3 rounded-xl mb-1 transition-all duration-300 ${activeItem === 'admin'
              ? 'text-white bg-primary shadow-lg shadow-primary/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            href="#"
            onClick={() => onNavigate('admin')}
          >
            <span className="material-symbols-outlined text-xl mr-3">settings</span>
            <span className="text-sm font-bold">Configurações</span>
          </a>
        </div>
        <div className="mt-auto px-4 py-4 space-y-4">
          {userProfile && (
            <div className="px-4 py-4 bg-white/5 rounded-2xl border border-white/5 mx-2">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary-blue flex items-center justify-center text-white font-black text-xs uppercase">
                  {userProfile.full_name?.substring(0, 1) || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-black text-white truncate uppercase tracking-tighter">{userProfile.full_name}</span>
                  <span className="text-[9px] font-bold text-light-blue uppercase tracking-widest">{userProfile.role}</span>
                </div>
              </div>
            </div>
          )}
          <button
            className="w-full flex items-center px-4 py-3 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 font-bold text-sm"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
          >
            <span className="material-symbols-outlined text-xl mr-3">logout</span>
            Sair da Conta
          </button>
        </div>
      </nav>
      <div className="p-4 border-t border-white/5">
        <button
          className="w-full flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all duration-300 hover:shadow-inner"
          onClick={onToggleDarkMode}
        >
          <span className="material-symbols-outlined text-xl mr-2">contrast</span>
          <span className="text-xs font-bold uppercase tracking-wider">Alternar Tema</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;