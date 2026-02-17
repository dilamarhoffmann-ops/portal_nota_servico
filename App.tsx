import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './components/LoginView';
import DashboardScreen from './components/DashboardScreen';
import { ServiceNotesScreen } from './components/ServiceNotesScreen';
import { AdminPanel } from './components/AdminPanel';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import supabase from './src/lib/supabase';
import { Profile } from './types';
import './index.css';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'service-notes' | 'admin'>('dashboard');

  useEffect(() => {
    // Verificar sessão existente ao carregar
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.allowed) {
          setUserProfile(profile as Profile);
          setIsLoggedIn(true);
          if (profile.requires_password_change) {
            setMustChangePassword(true);
          }
        } else {
          // Se não estiver autorizado, garante logout
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setUserProfile(null);
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const handleLoginSuccess = (profile: Profile) => {
    setUserProfile(profile);
    setIsLoggedIn(true);
    if (profile.requires_password_change) {
      setMustChangePassword(true);
    }
  };

  const handleNavigate = useCallback((item: 'dashboard' | 'service-notes' | 'admin') => {
    setActiveView(item);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setUserProfile(null);
      setMustChangePassword(false);
      setActiveView('dashboard');
    } catch (error) {
      console.error('Erro ao sair:', error);
      setIsLoggedIn(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginView onLoginSuccess={handleLoginSuccess} />
    );
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-navy p-4">
        <div className="glass-card max-w-md w-full p-10 rounded-[2.5rem] border border-white/10 text-center">
          <span className="material-symbols-outlined text-primary-blue text-6xl mb-6">lock_reset</span>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Senha Temporária</h2>
          <p className="text-light-blue text-sm font-medium uppercase tracking-widest mb-8">
            Sua senha foi resetada por um gestor. Por segurança, você deve definir uma nova senha agora.
          </p>
          <button
            onClick={async () => {
              const newPass = window.prompt("Digite sua nova senha (mínimo 6 caracteres):");
              if (newPass && newPass.length >= 6) {
                const { error } = await supabase.auth.updateUser({ password: newPass });
                if (!error) {
                  await supabase.from('profiles').update({ requires_password_change: false }).eq('id', userProfile?.id);
                  setMustChangePassword(false);
                  alert("Senha atualizada com sucesso!");
                } else {
                  alert("Erro ao atualizar senha: " + error.message);
                }
              }
            }}
            className="btn-premium w-full py-4 uppercase tracking-[0.2em] mb-4"
          >
            Definir Nova Senha
          </button>
          <button onClick={handleLogout} className="text-[10px] font-black text-light-blue hover:text-white uppercase tracking-widest">
            Sair e Voltar depois
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar
        onToggleDarkMode={handleToggleDarkMode}
        activeItem={activeView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userProfile={userProfile}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header userProfile={userProfile} />
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pt-10">
          <div className="max-w-[1600px] mx-auto w-full">
            {activeView === 'dashboard' ? (
              <DashboardScreen isDarkMode={isDarkMode} />
            ) : activeView === 'admin' ? (
              <div className="max-w-7xl mx-auto"><AdminPanel /></div>
            ) : (
              <ServiceNotesScreen />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;