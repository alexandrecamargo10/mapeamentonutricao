'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearCachedClientUser, setCachedClientUser } from '@/lib/client-auth';
import {
  Store,
  LogOut,
  Menu,
  X,
  Printer,
  Camera,
  User as UserIcon,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Settings,
  ShieldAlert,
} from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    nome: string;
    email: string;
    telefone?: string | null;
    avatarUrl?: string | null;
    role: string;
    mustChangePassword?: boolean;
    stores: { id: string; nome: string }[];
  };
  currentStoreId?: string;
  onStoreChange?: (storeId: string) => void;
  pendingUsersCount?: number;
}

function formatPhoneBr(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Navbar({
  user,
  currentStoreId,
  onStoreChange,
  pendingUsersCount = 0,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Local profile state synced with user prop
  const [profileUser, setProfileUser] = useState(user);
  useEffect(() => {
    if (user) {
      setProfileUser(user);
      if (user.mustChangePassword) {
        setEditNome(user.nome || '');
        setEditTelefone(user.telefone || '');
        setEditAvatar(user.avatarUrl || null);
        setProfileModalOpen(true);
      }
    }
  }, [user]);

  // Profile Modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  if (!profileUser) return null;

  const isAdmin = profileUser.role === 'ADMIN' || profileUser.role === 'SUPER_ADMIN';
  const isForcePasswordChange = Boolean(profileUser.mustChangePassword);

  const openProfileModal = () => {
    setEditNome(profileUser.nome || '');
    setEditTelefone(profileUser.telefone || '');
    setEditAvatar(profileUser.avatarUrl || null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setProfileError('');
    setProfileSuccess('');
    setProfileModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 180;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setEditAvatar(dataUrl);
          setProfileError('');
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (isForcePasswordChange && !newPassword) {
      setProfileError('Por segurança, você precisa definir uma nova senha pessoal para continuar.');
      return;
    }

    if (newPassword || confirmNewPassword) {
      if (!isForcePasswordChange && !currentPassword) {
        setProfileError('Digite sua senha atual para poder alterá-la.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setProfileError('A confirmação da nova senha não confere.');
        return;
      }
      if (newPassword.length < 6) {
        setProfileError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editNome,
          telefone: editTelefone,
          avatarUrl: editAvatar,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Erro ao salvar perfil.');
        return;
      }

      const updatedUser = {
        ...profileUser,
        nome: data.user.nome,
        telefone: data.user.telefone,
        avatarUrl: data.user.avatarUrl,
        mustChangePassword: Boolean(data.user.mustChangePassword),
      };
      setProfileUser(updatedUser);
      setCachedClientUser(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setProfileSuccess('Perfil atualizado com sucesso!');
    } catch {
      setProfileError('Erro de conexão ao salvar as alterações.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      clearCachedClientUser();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const roleBadge = () => {
    switch (profileUser.role) {
      case 'SUPER_ADMIN':
        return (
          <span className="bg-amber-100 text-amber-900 text-[11px] px-2 py-0.5 rounded-full font-bold border border-amber-300">
            🛡️ Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="bg-purple-100 text-purple-800 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-purple-200">
            Admin
          </span>
        );
      case 'ESTAGIARIO_360':
        return (
          <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-blue-200">
            Estagiário 360
          </span>
        );
      default:
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
            Estagiário Padrão
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo & Main nav */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-pedro-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform">
                  CP
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 leading-tight">Casas Pedro</span>
                  <span className="text-xs text-slate-500 font-medium">Controle de Validades</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {isAdmin ? (
                  <>
                    <Link
                      href="/admin"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pathname === '/admin'
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/usuarios"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative flex items-center space-x-1.5 ${
                        pathname.startsWith('/admin/usuarios')
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>Usuários</span>
                      {pendingUsersCount > 0 && (
                        <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                          {pendingUsersCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/admin/lojas"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pathname.startsWith('/admin/lojas')
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Lojas
                    </Link>
                    <Link
                      href="/admin/produtos"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pathname.startsWith('/admin/produtos')
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Produtos
                    </Link>
                    <Link
                      href="/admin/relatorios"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pathname.startsWith('/admin/relatorios')
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Relatórios
                    </Link>
                    <Link
                      href="/loja"
                      className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center space-x-1"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Visão de Loja</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/loja"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pathname === '/loja'
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Minha Loja
                    </Link>
                    {currentStoreId && (
                      <Link
                        href={`/loja/imprimir?storeId=${currentStoreId}`}
                        target="_blank"
                        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-1.5"
                      >
                        <Printer className="w-4 h-4 text-slate-500" />
                        <span>Imprimir Lista</span>
                      </Link>
                    )}
                  </>
                )}
              </nav>
            </div>

            {/* Right side: Store switcher (for 360 / admin) and Clickable User Profile */}
            <div className="hidden md:flex items-center space-x-3">
              {(profileUser.role === 'ESTAGIARIO_360' ||
                (isAdmin && pathname.startsWith('/loja'))) &&
                profileUser.stores &&
                profileUser.stores.length > 1 &&
                onStoreChange && (
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <Store className="w-4 h-4 text-amber-600" />
                    <select
                      value={currentStoreId || ''}
                      onChange={(e) => onStoreChange(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[200px]"
                    >
                      {profileUser.stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id} - {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <button
                  onClick={openProfileModal}
                  title="Clique para editar seu perfil, foto, telefone e senha"
                  className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors group text-left"
                >
                  {profileUser.avatarUrl ? (
                    <img
                      src={profileUser.avatarUrl}
                      alt={profileUser.nome}
                      className="w-9 h-9 rounded-full object-cover border-2 border-amber-500/40 shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-xs shadow-sm">
                      {getInitials(profileUser.nome)}
                    </div>
                  )}
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-amber-700 flex items-center justify-end space-x-1">
                      <span>{profileUser.nome}</span>
                      <Settings className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
                    </span>
                    <div className="flex items-center justify-end">{roleBadge()}</div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  title="Sair do sistema"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2">
            <button
              onClick={openProfileModal}
              className="w-full pb-3 border-b border-slate-100 flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-3">
                {profileUser.avatarUrl ? (
                  <img
                    src={profileUser.avatarUrl}
                    alt={profileUser.nome}
                    className="w-10 h-10 rounded-full object-cover border border-amber-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    {getInitials(profileUser.nome)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900 flex items-center space-x-1">
                    <span>{profileUser.nome}</span>
                    <Settings className="w-3.5 h-3.5 text-amber-600" />
                  </p>
                  <p className="text-xs text-slate-500">{profileUser.email}</p>
                </div>
              </div>
              {roleBadge()}
            </button>

            {/* Store switcher on mobile */}
            {(profileUser.role === 'ESTAGIARIO_360' || isAdmin) &&
              profileUser.stores &&
              profileUser.stores.length > 1 &&
              onStoreChange && (
                <div className="py-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Loja Ativa:
                  </label>
                  <select
                    value={currentStoreId || ''}
                    onChange={(e) => onStoreChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-medium"
                  >
                    {profileUser.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} - {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div className="space-y-1 pt-1">
              <button
                onClick={openProfileModal}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50/70 hover:bg-amber-100 flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Meu Perfil (Foto, Senha e Telefone)</span>
              </button>

              {isAdmin ? (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/usuarios"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Usuários {pendingUsersCount > 0 ? `(${pendingUsersCount})` : ''}
                  </Link>
                  <Link
                    href="/admin/lojas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Lojas
                  </Link>
                  <Link
                    href="/admin/produtos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Produtos
                  </Link>
                  <Link
                    href="/admin/relatorios"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Relatórios
                  </Link>
                  <Link
                    href="/loja"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50"
                  >
                    Visão de Loja
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/loja"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Minha Loja
                  </Link>
                  {currentStoreId && (
                    <Link
                      href={`/loja/imprimir?storeId=${currentStoreId}`}
                      target="_blank"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Imprimir Checklist
                    </Link>
                  )}
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MODAL DE AJUSTES DO MEU PERFIL / TROCA OBRIGATÓRIA DE SENHA PROVISÓRIA */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isForcePasswordChange
                    ? '🔒 Troca Obrigatória de Senha Provisória'
                    : 'Configurações do Meu Perfil'}
                </h3>
                <p className="text-xs text-slate-500">{profileUser.email}</p>
              </div>
              {!isForcePasswordChange && (
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>

            {isForcePasswordChange && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl font-medium flex items-start space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Sua senha atual é provisória!</strong>
                  <span>
                    Um administrador redefiniu sua senha. Por segurança e privacidade, crie agora uma nova senha definitiva exclusiva sua para continuar.
                  </span>
                </div>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Foto de Perfil */}
              <div className="flex items-center space-x-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="relative shrink-0">
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Foto de perfil"
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-300 flex items-center justify-center font-black text-lg">
                      {getInitials(editNome || profileUser.nome)}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <span className="block text-xs font-bold text-slate-800">Foto de Perfil</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center space-x-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editAvatar ? 'Alterar Foto' : 'Adicionar Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar(null)}
                        className="py-1.5 px-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 text-xs font-semibold rounded-lg inline-flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome de Exibição */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome de Exibição
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Contato Telefônico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contato Telefônico / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(formatPhoneBr(e.target.value))}
                    placeholder="(21) 99999-9999"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Alterar Senha */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {isForcePasswordChange
                      ? 'Defina sua Nova Senha Pessoal (Obrigatório)'
                      : 'Alterar Senha (Opcional)'}
                  </span>
                  {!isForcePasswordChange && (
                    <span className="text-[10px] text-slate-400">
                      Preencha apenas se desejar trocar
                    </span>
                  )}
                </div>

                {!isForcePasswordChange && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      required={isForcePasswordChange}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required={isForcePasswordChange}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                {!isForcePasswordChange && (
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="py-2 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Fechar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
