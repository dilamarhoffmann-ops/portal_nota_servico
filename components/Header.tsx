import { Profile } from '../types';

interface HeaderProps {
  userProfile?: Profile | null;
}

const Header: React.FC<HeaderProps> = ({ userProfile }) => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="h-20 bg-white/70 dark:bg-deep-navy/70 backdrop-blur-md border-b border-light-blue/10 flex items-center justify-between px-10 sticky top-0 z-30 transition-all duration-300">
      <div className="flex items-center gap-8">
        <button className="text-light-blue hover:text-primary transition-all p-2 rounded-xl border border-transparent hover:border-light-blue/20 bg-light-blue/5" aria-label="Menu principal">
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </button>
        <div className="hidden md:flex flex-col">
          <p className="text-[10px] font-black text-light-blue uppercase tracking-widest leading-none mb-1">Status do Sistema</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-deep-blue dark:text-ice-blue uppercase tracking-tight">Operacional · {currentDate}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
          <span className="material-symbols-outlined text-primary text-xl">corporate_fare</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-light-blue uppercase tracking-tighter leading-none">Empresa Ativa</span>
            <span className="text-[11px] font-black text-deep-blue dark:text-white uppercase tracking-tight">Dilamar Hoffmann</span>
          </div>
        </div>

        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-blue to-deep-blue flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary-blue/20 border-2 border-white dark:border-deep-navy cursor-pointer hover:scale-105 transition-all" aria-label="Perfil do usuário">
          {userProfile?.full_name?.substring(0, 2).toUpperCase() || 'DH'}
        </div>
      </div>
    </header>
  );
};

export default Header;