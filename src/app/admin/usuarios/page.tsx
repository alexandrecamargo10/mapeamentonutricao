'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getCachedClientUser, fetchClientUser } from '@/lib/client-auth';
import {
  Users,
  CheckCircle2,
  Clock,
  Edit2,
  UserCheck,
  Search,
  Trash2,
  KeyRound,
  Phone,
  Shield,
  Lock,
} from 'lucide-react';

export default function UsuariosAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(() => getCachedClientUser());
  const [loading, setLoading] = useState<boolean>(() => !getCachedClientUser());

  const [activeTab, setActiveTab] = useState<'pendentes' | 'ativos'>('pendentes');
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Approval / Edit Modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [targetRole, setTargetRole] = useState<
    'ESTAGIARIO_PADRAO' | 'ESTAGIARIO_360' | 'ADMIN' | 'SUPER_ADMIN'
  >('ESTAGIARIO_PADRAO');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [editModalMyPassword, setEditModalMyPassword] = useState('');
  const [savingApproval, setSavingApproval] = useState(false);
  const [approvalError, setApprovalError] = useState('');

  // Dedicated Quick Password Modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<any>(null);
  const [quickNewPassword, setQuickNewPassword] = useState('');
  const [myAdminCurrentPassword, setMyAdminCurrentPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordModalMsg, setPasswordModalMsg] = useState('');
  const [passwordModalError, setPasswordModalError] = useState('');

  const loadData = async () => {
    try {
      const [meUser, sRes, uRes] = await Promise.all([
        fetchClientUser(),
        fetch('/api/admin/stores'),
        fetch('/api/admin/users'),
      ]);

      if (!meUser || (meUser.role !== 'ADMIN' && meUser.role !== 'SUPER_ADMIN')) {
        router.replace('/login');
        return;
      }
      setCurrentUser(meUser);

      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.stores) setStores(sData.stores);
      }

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.users) setUsers(uData.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const isCurrentSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isTargetAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Verifica se o administrador logado tem permissão hierárquica (Opção 1) sobre o usuário-alvo
  const canManageUser = (targetUser: any): boolean => {
    if (!currentUser) return false;
    if (isCurrentSuperAdmin) return true;
    // Admin comum só gerencia Estagiários (não pode alterar outros Admins ou Super Admins)
    return !isTargetAdminRole(targetUser.role);
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDENTE');
  const activeUsers = users.filter((u) => u.status !== 'PENDENTE');

  const filteredUsers = (activeTab === 'pendentes' ? pendingUsers : activeUsers).filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.telefone && u.telefone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openApproveModal = (u: any) => {
    setSelectedUser(u);
    setTargetRole(
      u.role === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : u.role === 'ADMIN'
        ? 'ADMIN'
        : u.role === 'ESTAGIARIO_360'
        ? 'ESTAGIARIO_360'
        : 'ESTAGIARIO_PADRAO'
    );
    const existingStoreIds = u.userStores ? u.userStores.map((us: any) => us.storeId) : [];
    setSelectedStoreIds(
      existingStoreIds.length > 0 ? existingStoreIds : stores.length > 0 ? [stores[0].id] : []
    );
    setAdminNewPassword('');
    setEditModalMyPassword('');
    setApprovalError('');
    setApprovalModalOpen(true);
  };

  const openPasswordModal = (u: any) => {
    setPasswordTargetUser(u);
    setQuickNewPassword('');
    setMyAdminCurrentPassword('');
    setPasswordModalError('');
    setPasswordModalMsg('');
    setPasswordModalOpen(true);
  };

  const handleSaveQuickPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordModalError('');
    setPasswordModalMsg('');

    if (quickNewPassword.length < 6) {
      setPasswordModalError('A senha provisória deve ter no mínimo 6 caracteres.');
      return;
    }

    const requiresReauth =
      isTargetAdminRole(passwordTargetUser.role) && passwordTargetUser.id !== currentUser?.id;

    if (requiresReauth && !myAdminCurrentPassword) {
      setPasswordModalError(
        'Por segurança, confirme a SUA senha de Super Admin para redefinir a senha de outro Administrador.'
      );
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: passwordTargetUser.id,
          action: 'ALTERAR_SENHA',
          newPassword: quickNewPassword,
          adminCurrentPassword: myAdminCurrentPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordModalError(data.error || 'Erro ao alterar senha.');
        return;
      }
      setPasswordModalMsg(data.message || 'Senha provisória definida com sucesso!');
      setQuickNewPassword('');
      setMyAdminCurrentPassword('');
      loadData();
    } catch {
      setPasswordModalError('Erro de conexão ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Deseja realmente rejeitar este cadastro?')) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'REJEITAR' }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (u.id === currentUser?.id) {
      alert('Você não pode excluir sua própria conta.');
      return;
    }
    if (!canManageUser(u)) {
      alert('Apenas o Super Admin pode excluir contas de Administradores.');
      return;
    }
    if (
      !confirm(
        `ATENÇÃO: Deseja realmente excluir permanentemente o usuário "${u.nome}" (${u.email}) do sistema?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action: 'EXCLUIR' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir usuário.');
        return;
      }
      if (approvalModalOpen) setApprovalModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao tentar excluir o usuário.');
    }
  };

  const handleToggleStoreSelection = (storeId: string) => {
    if (targetRole === 'ESTAGIARIO_PADRAO') {
      setSelectedStoreIds([storeId]);
    } else {
      if (selectedStoreIds.includes(storeId)) {
        setSelectedStoreIds(selectedStoreIds.filter((id) => id !== storeId));
      } else {
        setSelectedStoreIds([...selectedStoreIds, storeId]);
      }
    }
  };

  const handleSelectAllStores = () => {
    if (selectedStoreIds.length === stores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(stores.map((s) => s.id));
    }
  };

  const handleSaveApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalError('');

    if (targetRole === 'ESTAGIARIO_PADRAO' && selectedStoreIds.length !== 1) {
      setApprovalError('Para o Estagiário Padrão, selecione exatamente 1 loja.');
      return;
    }

    if (targetRole === 'ESTAGIARIO_360' && selectedStoreIds.length === 0) {
      setApprovalError('Para o Estagiário 360, selecione ao menos 1 loja.');
      return;
    }

    if (adminNewPassword && adminNewPassword.length < 6) {
      setApprovalError('A nova senha provisória deve ter no mínimo 6 caracteres.');
      return;
    }

    if (
      adminNewPassword &&
      isTargetAdminRole(selectedUser.role) &&
      selectedUser.id !== currentUser?.id &&
      !editModalMyPassword
    ) {
      setApprovalError(
        'Confirme a SUA senha de Super Admin para redefinir a senha de outro Administrador.'
      );
      return;
    }

    setSavingApproval(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: selectedUser.status === 'PENDENTE' ? 'APROVAR' : 'ATUALIZAR',
          role: targetRole,
          storeIds: isTargetAdminRole(targetRole) ? [] : selectedStoreIds,
          newPassword: adminNewPassword || undefined,
          adminCurrentPassword: editModalMyPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApprovalError(data.error || 'Erro ao processar aprovação.');
        return;
      }

      setApprovalModalOpen(false);
      loadData();
    } catch {
      setApprovalError('Erro de conexão ao salvar.');
    } finally {
      setSavingApproval(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={currentUser} pendingUsersCount={pendingUsers.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestão de Usuários & Estagiários
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Hierarquia de Super Admin, aprovação de cadastros, senhas provisórias e vinculação de lojas
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 space-x-4">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'pendentes'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pendentes de Aprovação</span>
            {pendingUsers.length > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ativos')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'ativos'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Usuários Ativos / Cadastrados ({activeUsers.length})</span>
          </button>
        </div>

        {/* Tab Content: Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-2 shadow-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">
              {activeTab === 'pendentes'
                ? 'Nenhum cadastro pendente de aprovação no momento!'
                : 'Nenhum usuário encontrado.'}
            </h4>
            <p className="text-xs text-slate-500">
              {activeTab === 'pendentes'
                ? 'Quando novos estagiários realizarem o cadastro na tela inicial, eles aparecerão aqui.'
                : 'Cadastros aprovados aparecerão nesta lista.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const userStores = u.userStores || [];
              const isSelf = u.id === currentUser?.id;
              const allowedToManage = canManageUser(u);

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-2xl p-5 border shadow-sm space-y-4 flex flex-col justify-between ${
                    u.role === 'SUPER_ADMIN'
                      ? 'border-amber-300 ring-1 ring-amber-200/60'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.nome}
                            className="w-11 h-11 rounded-full object-cover border border-amber-300 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(u.nome)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{u.nome}</h4>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          {u.telefone && (
                            <p className="text-[11px] text-slate-600 font-medium flex items-center space-x-1 mt-0.5">
                              <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{u.telefone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            u.status === 'PENDENTE'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : u.status === 'APROVADO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-700 border-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                        {u.mustChangePassword && (
                          <span className="text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded">
                            Senha Provisória
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role & Stores Info */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">
                          Perfil
                        </span>
                        <span className="font-bold text-slate-800">
                          {u.role === 'SUPER_ADMIN'
                            ? '🛡️ Super Admin'
                            : u.role === 'ADMIN'
                            ? '👑 Administrador'
                            : u.role === 'ESTAGIARIO_360'
                            ? '🌐 Estagiário 360'
                            : '📍 Estagiário Padrão'}
                        </span>
                      </div>

                      <div className="pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                          Lojas Autorizadas:
                        </span>
                        {isTargetAdminRole(u.role) ? (
                          <span className="text-purple-700 font-bold">
                            Acesso global a todas as 75 lojas
                          </span>
                        ) : userStores.length === 0 ? (
                          <span className="text-slate-400 italic">Nenhuma loja vinculada</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {userStores.map((us: any) => (
                              <span
                                key={us.store.id}
                                className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700"
                              >
                                {us.store.id} - {us.store.nome}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {!allowedToManage ? (
                      <div className="w-full py-1.5 px-3 bg-slate-100 rounded-xl text-center text-[11px] text-slate-500 font-semibold flex items-center justify-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>Gerenciado apenas por Super Admin</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-1">
                          {!isSelf ? (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Excluir usuário permanentemente"
                              className="p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic px-1.5">
                              Sua conta
                            </span>
                          )}

                          {!isSelf && (
                            <button
                              onClick={() => openPasswordModal(u)}
                              title="Definir senha provisória para este usuário"
                              className="py-1.5 px-2.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center space-x-1"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Senha</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {u.status === 'PENDENTE' ? (
                            <>
                              <button
                                onClick={() => handleReject(u.id)}
                                className="py-1.5 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                              >
                                Rejeitar
                              </button>
                              <button
                                onClick={() => openApproveModal(u)}
                                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openApproveModal(u)}
                              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center space-x-1"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Editar Perfil / Lojas</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* QUICK PASSWORD RESET MODAL (Opção 2: Senha Provisória + Reautenticação para Admins) */}
      {passwordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Definir Senha Provisória
                </h3>
                <p className="text-xs text-slate-500">
                  {passwordTargetUser.nome} ({passwordTargetUser.email})
                </p>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>🔒 Privacidade Garantida (Senha Provisória):</strong> Assim que{' '}
              <strong>{passwordTargetUser.nome}</strong> fizer login com esta senha provisória, o sistema solicitará automaticamente que ele(a) crie uma senha pessoal definitiva.
            </div>

            {passwordModalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {passwordModalError}
              </div>
            )}

            {passwordModalMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
                {passwordModalMsg}
              </div>
            )}

            <form onSubmit={handleSaveQuickPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nova Senha Provisória para {passwordTargetUser.nome}
                </label>
                <input
                  type="text"
                  required
                  value={quickNewPassword}
                  onChange={(e) => setQuickNewPassword(e.target.value)}
                  placeholder="Digite a senha provisória (mín. 6 caracteres)"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              {isTargetAdminRole(passwordTargetUser.role) &&
                passwordTargetUser.id !== currentUser?.id && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Confirme a SUA Senha de Super Admin</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={myAdminCurrentPassword}
                      onChange={(e) => setMyAdminCurrentPassword(e.target.value)}
                      placeholder="Digite sua própria senha atual para autorizar"
                      className="w-full p-2.5 text-xs bg-rose-50/40 border border-rose-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-60"
                >
                  {savingPassword ? 'Salvando...' : 'Confirmar Senha Provisória'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVAL / EDIT MODAL */}
      {approvalModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedUser.status === 'PENDENTE'
                    ? 'Aprovar Cadastro'
                    : 'Editar Permissões e Nível de Acesso'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedUser.nome} ({selectedUser.email})
                </p>
              </div>
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {approvalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {approvalError}
              </div>
            )}

            <form onSubmit={handleSaveApproval} className="space-y-4">
              {/* Profile Type Radio */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Perfil de Acesso:
                </label>
                <div className={`grid gap-2 ${isCurrentSuperAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRole('ESTAGIARIO_PADRAO');
                      if (selectedStoreIds.length > 1) {
                        setSelectedStoreIds([selectedStoreIds[0]]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      targetRole === 'ESTAGIARIO_PADRAO'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <strong className="block text-xs">Padrão</strong>
                    <span className="text-[10px] text-slate-500">1 única loja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetRole('ESTAGIARIO_360')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      targetRole === 'ESTAGIARIO_360'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <strong className="block text-xs">360</strong>
                    <span className="text-[10px] text-slate-500">Múltiplas lojas</span>
                  </button>

                  {isCurrentSuperAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setTargetRole('ADMIN')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          targetRole === 'ADMIN'
                            ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-400'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <strong className="block text-xs">👑 Admin</strong>
                        <span className="text-[10px] text-slate-500">Equipe Nutrição</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetRole('SUPER_ADMIN')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          targetRole === 'SUPER_ADMIN'
                            ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-400'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <strong className="block text-xs">🛡️ Super Admin</strong>
                        <span className="text-[10px] text-slate-500">Gestão Total</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Store Selector */}
              {!isTargetAdminRole(targetRole) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Selecionar Loja(s) ({selectedStoreIds.length} selecionada(s))
                    </label>
                    {targetRole === 'ESTAGIARIO_360' && (
                      <button
                        type="button"
                        onClick={handleSelectAllStores}
                        className="text-[11px] font-bold text-amber-700 hover:underline"
                      >
                        {selectedStoreIds.length === stores.length
                          ? 'Desmarcar Todas'
                          : 'Selecionar Todas (75)'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                    {stores.map((s) => {
                      const isSelected = selectedStoreIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleToggleStoreSelection(s.id)}
                          className={`p-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                              : 'hover:bg-white text-slate-700'
                          }`}
                        >
                          <span>
                            {s.id} - {s.nome}
                          </span>
                          <input
                            type={targetRole === 'ESTAGIARIO_PADRAO' ? 'radio' : 'checkbox'}
                            checked={isSelected}
                            readOnly
                            className="text-amber-600 focus:ring-amber-500 rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Password Reset inside Edit Modal */}
              {selectedUser.id !== currentUser?.id && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      3. Definir Senha Provisória (Opcional)
                    </label>
                    <input
                      type="text"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="Deixe em branco para manter a senha atual"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  {adminNewPassword && isTargetAdminRole(selectedUser.role) && (
                    <div>
                      <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">
                        Confirme a SUA Senha de Super Admin
                      </label>
                      <input
                        type="password"
                        required
                        value={editModalMyPassword}
                        onChange={(e) => setEditModalMyPassword(e.target.value)}
                        placeholder="Sua senha atual de Super Admin"
                        className="w-full p-2.5 text-xs bg-rose-50/40 border border-rose-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {selectedUser.id !== currentUser?.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser)}
                    className="py-2.5 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Usuário</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setApprovalModalOpen(false)}
                    className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingApproval}
                    className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-60"
                  >
                    {savingApproval ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
