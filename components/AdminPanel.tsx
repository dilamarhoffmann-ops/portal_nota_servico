
import React, { useState, useEffect } from 'react';
import supabase from '../src/lib/supabase';
import './AdminPanel.css';

export const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'whitelist'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [whitelist, setWhitelist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Form states
    const [newWhitelistEmail, setNewWhitelistEmail] = useState('');
    const [newWhitelistDesc, setNewWhitelistDesc] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([loadUsers(), loadWhitelist()]);
        setLoading(false);
    };

    const loadUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err: any) {
            console.error('Erro ao listar usuários:', err);
        }
    };

    const loadWhitelist = async () => {
        try {
            const { data, error } = await supabase
                .from('whitelist_emails')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWhitelist(data || []);
        } catch (err: any) {
            console.error('Erro ao carregar whitelist:', err);
        }
    };

    const handleAddWhitelist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWhitelistEmail) return;

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('whitelist_emails')
                .insert([{
                    email: newWhitelistEmail.toLowerCase().trim(),
                    description: newWhitelistDesc
                }]);

            if (error) throw error;

            setMessage('E-mail adicionado à whitelist com sucesso!');
            setNewWhitelistEmail('');
            setNewWhitelistDesc('');
            loadWhitelist();
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            console.error('Erro detalhado:', err);
            setError(err.message || 'Erro desconhecido ao adicionar e-mail.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveWhitelist = async (email: string) => {
        if (!window.confirm(`Remover ${email} da whitelist?`)) return;

        try {
            const { error } = await supabase
                .from('whitelist_emails')
                .delete()
                .eq('email', email);

            if (error) throw error;

            setWhitelist(whitelist.filter(item => item.email !== email));
            setMessage('E-mail removido da whitelist.');
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setError('Erro ao remover e-mail.');
        }
    };

    const toggleRole = async (userId: string, currentRole: string) => {
        try {
            const newRole = currentRole === 'Gestor' ? 'Usuario' : 'Gestor';
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setMessage(`Permissão de nível ${newRole} concedida.`);
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setError('Erro ao alterar permissão.');
        }
    };

    const toggleAllowed = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ allowed: !currentStatus })
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, allowed: !currentStatus } : u));
            setMessage(currentStatus ? 'Acesso revogado.' : 'Acesso autorizado.');
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setError('Erro ao alterar status de acesso.');
        }
    };

    const handlePasswordReset = async (userId: string) => {
        if (!window.confirm("Marcar este usuário para troca obrigatória de senha no próximo login?")) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ requires_password_change: true })
                .eq('id', userId);

            if (error) throw error;
            setMessage('Usuário marcado para troca de senha obrigatória.');
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setError('Erro ao solicitar reset de senha.');
        }
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                <p>Configurando ambiente...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in p-2">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-deep-navy dark:text-white tracking-tighter uppercase">
                        Administração
                    </h1>
                    <p className="text-sm font-medium text-light-blue uppercase tracking-[0.2em] mt-1">
                        Configurações globais e controle de acesso
                    </p>
                </div>
                <div className="flex bg-ice-blue/20 p-1.5 rounded-[1.5rem] border border-light-blue/10 backdrop-blur-sm">
                    <button
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'users'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-light-blue hover:text-deep-blue'}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Usuários
                    </button>
                    <button
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'whitelist'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-light-blue hover:text-deep-blue'}`}
                        onClick={() => setActiveTab('whitelist')}
                    >
                        Whitelist
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 text-xs font-black uppercase tracking-tight animate-shake">
                    <span className="material-symbols-outlined">warning</span>
                    <span>{error}</span>
                </div>
            )}
            {message && (
                <div className="mb-6 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-500 text-xs font-black uppercase tracking-tight animate-fade-in">
                    <span className="material-symbols-outlined">verified</span>
                    <span>{message}</span>
                </div>
            )}

            {activeTab === 'users' ? (
                <div className="glass-card rounded-[2rem] p-10 animate-slide-up shadow-premium">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-xl font-black text-deep-navy dark:text-white uppercase tracking-tight">Usuários do Sistema</h2>
                        <div className="bg-primary/10 text-primary px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                            {users.length} usuários detectados
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left premium-table">
                            <thead>
                                <tr>
                                    <th>Identificação</th>
                                    <th>Departamento</th>
                                    <th>Nível</th>
                                    <th>Status</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-blue/10">
                                {users.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-primary/5 transition-all">
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-blue to-deep-blue flex items-center justify-center text-white font-black text-sm shadow-md border border-white/10 shrink-0 uppercase">
                                                    {profile.full_name?.substring(0, 1) || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-deep-navy dark:text-white uppercase tracking-tighter">{profile.full_name || 'Usuário Sem Nome'}</span>
                                                    <span className="text-[10px] font-bold text-light-blue uppercase tracking-widest">{profile.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-[10px] font-black text-deep-navy dark:text-white uppercase tracking-widest">
                                                {profile.area || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${profile.role === 'Gestor'
                                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                : 'bg-light-blue/10 text-light-blue border-light-blue/20'}`}>
                                                {profile.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${profile.allowed
                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                                {profile.allowed ? 'Autorizado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="text-right space-x-2">
                                            <button
                                                className={`p-2.5 rounded-xl transition-all duration-300 ${profile.allowed
                                                    ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white'
                                                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                                                onClick={() => toggleAllowed(profile.id, profile.allowed)}
                                                title={profile.allowed ? "Revogar Acesso" : "Autorizar Acesso"}
                                            >
                                                <span className="material-symbols-outlined text-sm">{profile.allowed ? 'block' : 'verified_user'}</span>
                                            </button>
                                            <button
                                                className={`p-2.5 rounded-xl transition-all duration-300 ${profile.role === 'Gestor'
                                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                                    : 'bg-light-blue/10 text-light-blue hover:bg-amber-500/20'}`}
                                                onClick={() => toggleRole(profile.id, profile.role)}
                                                title={profile.role === 'Gestor' ? "Remover Privilégios Gestor" : "Promover a Gestor"}
                                            >
                                                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                                            </button>
                                            <button
                                                className="p-2.5 rounded-xl bg-primary-blue/10 text-primary-hover hover:bg-primary-blue hover:text-white transition-all duration-300"
                                                onClick={() => handlePasswordReset(profile.id)}
                                                title="Resetar Senha"
                                            >
                                                <span className="material-symbols-outlined text-sm">lock_reset</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="glass-card rounded-[2rem] p-10 animate-slide-up shadow-premium">
                        <div className="mb-8">
                            <h3 className="text-xl font-black text-deep-navy dark:text-white uppercase tracking-tight">Nova Autorização</h3>
                            <p className="text-[10px] font-black text-light-blue uppercase tracking-widest mt-1">Controle de Whitelist por Domínio de E-mail</p>
                        </div>
                        <form onSubmit={handleAddWhitelist} className="space-y-6 lg:space-y-0 lg:flex lg:gap-6 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1">Endereço de E-mail</label>
                                <input
                                    type="email"
                                    placeholder="NOME@EMPRESA.COM.BR"
                                    value={newWhitelistEmail}
                                    onChange={(e) => setNewWhitelistEmail(e.target.value)}
                                    className="premium-input w-full"
                                    required
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-light-blue uppercase tracking-widest ml-1">Observação / Cargo</label>
                                <input
                                    type="text"
                                    placeholder="EX: DIRETORIA FINANCEIRA"
                                    value={newWhitelistDesc}
                                    onChange={(e) => setNewWhitelistDesc(e.target.value)}
                                    className="premium-input w-full"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-premium px-10 py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 h-[56px] lg:mb-1 w-full lg:w-auto"
                                disabled={processing}
                            >
                                <span className="material-symbols-outlined text-lg">add_task</span>
                                <span className="text-[11px] font-black uppercase tracking-widest">Autorizar</span>
                            </button>
                        </form>
                    </div>

                    <div className="glass-card rounded-[2rem] p-10 animate-slide-up shadow-premium" style={{ animationDelay: '0.1s' }}>
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black text-deep-navy dark:text-white uppercase tracking-tight">Whitelist Ativa</h3>
                            <div className="bg-primary/10 text-primary px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                {whitelist.length} acessos liberados
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left premium-table">
                                <thead>
                                    <tr>
                                        <th>E-mail Autorizado</th>
                                        <th>Descrição</th>
                                        <th>Data Inclusão</th>
                                        <th className="text-right">Revogar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-light-blue/10">
                                    {whitelist.map((item) => (
                                        <tr key={item.email} className="hover:bg-primary/5 transition-all">
                                            <td className="font-black text-deep-navy dark:text-white lowercase tracking-tight">{item.email}</td>
                                            <td className="text-xs font-bold text-light-blue uppercase tracking-widest">{item.description || '—'}</td>
                                            <td className="text-sm font-bold text-light-blue italic">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                                            <td className="text-right">
                                                <button
                                                    className="p-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-red-500/20"
                                                    onClick={() => handleRemoveWhitelist(item.email)}
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete_sweep</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {whitelist.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <span className="material-symbols-outlined text-6xl text-light-blue/20 mb-4 block">verified_user</span>
                                                <p className="text-[11px] font-black text-light-blue uppercase tracking-widest">Sem restrições de whitelist no momento</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
