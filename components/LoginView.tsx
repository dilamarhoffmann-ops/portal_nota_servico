
import React, { useState } from 'react';
import supabase from '../src/lib/supabase';
import { Profile } from '../types';

interface LoginViewProps {
    onLoginSuccess: (profile: Profile) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [area, setArea] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (password.length < 6) {
                throw new Error('A senha deve ter no mínimo 6 caracteres.');
            }

            const emailNormalized = email.trim().toLowerCase();

            if (isSignUp) {
                // Fluxo de Cadastro
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: emailNormalized,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            area: area,
                        },
                    },
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    setMessage('Solicitação de cadastro enviada! Um gestor precisa liberar seu acesso.');
                    setIsSignUp(false);
                }
            } else {
                // Fluxo de Login
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email: emailNormalized,
                    password,
                });

                if (signInError) throw signInError;

                if (data.user) {
                    // Busca o perfil para verificar permissão
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) throw profileError;

                    if (!profile.allowed) {
                        await supabase.auth.signOut();
                        throw new Error('Seu acesso ainda não foi liberado por um gestor.');
                    }

                    onLoginSuccess(profile as Profile);
                }
            }
        } catch (err: any) {
            console.error('Erro na autenticação:', err);
            let errorMessage = err.message || 'Erro ao processar solicitação.';

            if (errorMessage.includes('Invalid login credentials')) {
                errorMessage = 'E-mail ou senha incorretos.';
            } else if (errorMessage.includes('Email not confirmed')) {
                errorMessage = 'E-mail ainda não confirmado. Verifique seu e-mail.';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f0f7ff] overflow-hidden relative">
            {/* Background elements - Design Apoio Pulse */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-blue/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-deep-blue/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Left Section: Brand info */}
            <div className="hidden lg:flex w-5/12 relative flex-col justify-between p-16 z-10 border-r border-black/5">
                <div className="flex items-center gap-4 animate-fade-in">
                    <div className="w-12 h-12 bg-deep-navy flex items-center justify-center rounded-2xl shadow-xl">
                        <span className="material-symbols-outlined text-white text-3xl font-black">shield</span>
                    </div>
                    <h1 className="text-deep-navy text-3xl font-black tracking-tighter uppercase italic">APOIO <span className="text-primary-blue not-italic">PORTAL</span></h1>
                </div>

                <div className="max-w-md animate-slide-up">
                    <div className="w-12 h-1 bg-primary-blue mb-8 rounded-full"></div>
                    <h2 className="text-5xl font-black text-deep-navy mb-6 uppercase tracking-tighter leading-none">
                        Excelência em Gestão <span className="text-primary-blue italic">Corporativa.</span>
                    </h2>
                    <p className="text-deep-blue/60 text-lg font-medium leading-relaxed uppercase tracking-widest text-[11px]">
                        Sua central de inteligência para documentos fiscais e automação de processos. Praticidade e segurança em um só lugar.
                    </p>
                </div>

                <div className="text-deep-navy/30 text-[10px] font-black uppercase tracking-[0.3em]">
                    © 2026 APOIO CORPORATIVO · NFSE INTELLIGENCE
                </div>
            </div>

            {/* Right Section: Glass Form */}
            <div className="flex-1 flex justify-center items-center p-8 z-10 bg-white/10 backdrop-blur-sm">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="glass-card rounded-[2.5rem] p-10 border border-primary-blue/20 shadow-2xl">
                        <div className="mb-10">
                            <h3 className="text-3xl font-black text-deep-navy uppercase tracking-tighter mb-2 italic">
                                {isSignUp ? 'Criar Acesso' : 'Entrar Agora'}
                            </h3>
                            <p className="text-xs font-bold text-light-blue uppercase tracking-widest">
                                {isSignUp ? 'Solicite sua entrada no ecossistema Apoio' : 'Insira seus dados para prosseguir'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-red-500 text-xs font-black uppercase tracking-tight animate-shake">
                                <span className="material-symbols-outlined text-xl">warning</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4 text-emerald-500 text-xs font-black uppercase tracking-tight">
                                <span className="material-symbols-outlined text-xl">verified</span>
                                <span>{message}</span>
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {isSignUp && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1" htmlFor="fullName">Nome Completo</label>
                                        <input
                                            className="premium-input text-deep-navy text-sm"
                                            id="fullName"
                                            placeholder="DIGITE SEU NOME"
                                            required
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1" htmlFor="area">Área / Departamento</label>
                                        <input
                                            className="premium-input text-deep-navy text-sm"
                                            id="area"
                                            placeholder="EX: FINANCEIRO"
                                            required
                                            type="text"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1" htmlFor="email">E-mail Corporativo</label>
                                <input
                                    className="premium-input text-deep-navy text-sm"
                                    id="email"
                                    placeholder="NOME@EMPRESA.COM.BR"
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between mx-1">
                                    <label className="text-[10px] font-black text-light-blue uppercase tracking-widest" htmlFor="password">Chave de Acesso</label>
                                    {!isSignUp && (
                                        <button type="button" className="text-[10px] font-black text-primary-blue hover:text-white uppercase tracking-tighter italic">
                                            Esqueceu?
                                        </button>
                                    )}
                                </div>
                                <input
                                    className="premium-input text-deep-navy text-sm"
                                    id="password"
                                    placeholder="••••••••"
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button
                                className="btn-premium w-full py-5 text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary-blue/20 disabled:opacity-50 mt-4 group"
                                type="submit"
                                disabled={loading}
                            >
                                <span className="flex items-center justify-center gap-3">
                                    {loading ? 'AUTENTICANDO...' : (isSignUp ? 'SOLICITAR ACESSO' : 'Acessar Central')}
                                    {!loading && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                                </span>
                            </button>
                        </form>

                        <div className="mt-10 pt-8 border-t border-white/5 text-center">
                            <button
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setMessage(null);
                                }}
                                className="text-[11px] font-black text-light-blue hover:text-white transition-colors uppercase tracking-[0.1em]"
                            >
                                {isSignUp ? 'Já possui acesso? Voltar ao login' : 'Primeiro acesso? Solicitar cadastro'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-deep-navy/20 uppercase tracking-[0.3em]">Ambiente Seguro · v2.6.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
