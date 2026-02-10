
import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isDarkMode, onToggleDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // In a real application, you would send these credentials to an authentication service.
    // For this example, we'll simulate a successful login.
    console.log('Attempting login with:', { email, password });
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen flex transition-colors duration-200">
      {/* Left section (hidden on small screens) */}
      <div className="hidden lg:flex w-1/3 bg-primary relative flex-col items-center justify-between py-12 px-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full -ml-48 -mb-48"></div>

        <div className="relative z-10 flex items-center justify-center space-x-4">
          <div className="w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full text-white fill-current" viewBox="0 0 100 100">
              <path d="M50 15L90 85H10L50 15Z"></path>
            </svg>
          </div>
          <h1 className="text-white text-4xl font-bold tracking-[0.2em] uppercase">APOIO</h1>
        </div>

        <div className="relative z-10 text-center max-w-xs">
          <h2 className="text-3xl font-bold text-white mb-4">Portal de Notas de Serviço</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Bem-vindo ao sistema de gestão e automação. Acesse sua conta para gerenciar chamados e notas.
          </p>
        </div>

        <div className="relative z-10 text-white/50 text-xs">
          © 2024 Apoio Corporativo. Todos os direitos reservados.
        </div>
      </div>

      {/* Right section (Login form) */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12">
        <div className="absolute top-6 right-6">
          <button
            className="p-2 rounded-full bg-white dark:bg-card-dark shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={onToggleDarkMode}
          >
            <span className={`material-symbols-outlined ${isDarkMode ? 'hidden' : 'block'}`}>dark_mode</span>
            <span className={`material-symbols-outlined ${isDarkMode ? 'block' : 'hidden'}`}>light_mode</span>
          </button>
        </div>

        <div className="w-full max-w-md">
          {/* Logo for smaller screens */}
          <div className="lg:hidden flex items-center justify-center mb-8 space-x-3">
            <div className="text-primary w-12 h-12 flex-shrink-0">
              <svg className="w-full h-full fill-current" viewBox="0 0 100 100">
                <path d="M50 10L10 85H30L50 45L70 85H90L50 10Z"></path>
              </svg>
            </div>
            <h1 className="text-primary text-2xl font-bold tracking-[0.2em] uppercase">APOIO</h1>
          </div>

          <div className="bg-white dark:bg-card-dark p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 transition-all">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acessar Portal</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Insira suas credenciais abaixo</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">E-mail Corporativo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-lg">mail</span>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                    id="email"
                    name="email"
                    placeholder="nome@empresa.com.br"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">Senha</label>
                  <a className="text-xs font-semibold text-primary hover:opacity-80" href="#">Esqueceu a senha?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-lg">lock</span>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                />
                <label className="ml-2 block text-sm text-gray-600 dark:text-gray-400" htmlFor="remember-me">
                  Manter conectado
                </label>
              </div>
              <div>
                <button
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-primary hover:bg-[#3d457a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform active:scale-[0.98]"
                  type="submit"
                >
                  Entrar no Sistema
                </button>
              </div>
            </form>
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <a className="hover:text-primary transition-colors" href="#">Termos de Uso</a>
                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                <a className="hover:text-primary transition-colors" href="#">Privacidade</a>
                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                <a className="hover:text-primary transition-colors" href="#">Suporte</a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Servidores operacionais v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;