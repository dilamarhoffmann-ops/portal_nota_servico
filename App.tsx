
import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import NotesScreen from './components/NotesScreen';
import DashboardScreen from './components/DashboardScreen'; // Novo Dashboard de gráficos
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'notes'>('dashboard'); // Estado para controlar a visualização ativa

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

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleNavigate = useCallback((item: 'dashboard' | 'notes') => {
    setActiveView(item);
  }, []);

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onToggleDarkMode={handleToggleDarkMode} activeItem={activeView} onNavigate={handleNavigate} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark custom-scrollbar">
          {activeView === 'dashboard' ? (
            <DashboardScreen isDarkMode={isDarkMode} /> // Passa isDarkMode para o Dashboard
          ) : (
            <NotesScreen onToggleDarkMode={handleToggleDarkMode} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;