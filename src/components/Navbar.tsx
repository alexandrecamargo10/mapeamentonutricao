'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearCachedClientUser } from '@/lib/client-auth';
import {
  Shield,
  Store,
  Users,
  Package,
  BarChart3,
  LogOut,
  Menu,
  X,
  Printer,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    nome: string;
    email: string;
    role: string;
    stores: { id: string; nome: string }[];
  };
  currentStoreId?: string;
  onStoreChange?: (storeId: string) => void;
  pendingUsersCount?: number;
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
    switch (user.role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">Admin</span>;
      case 'ESTAGIARIO_360':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">Estagiário 360</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">Estagiário Padrão</span>;
    }
  };

  return (
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
              {user.role === 'ADMIN' ? (
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

          {/* Right side: Store switcher (for 360 / admin) and User profile */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Store switcher for 360 or admin on store view */}
            {(user.role === 'ESTAGIARIO_360' || (user.role === 'ADMIN' && pathname.startsWith('/loja'))) &&
              user.stores &&
              user.stores.length > 1 &&
              onStoreChange && (
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Store className="w-4 h-4 text-amber-600" />
                  <select
                    value={currentStoreId || ''}
                    onChange={(e) => onStoreChange(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[200px]"
                  >
                    {user.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} - {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800">{user.nome}</span>
                <div className="flex items-center justify-end space-x-1.5">
                  {roleBadge()}
                </div>
              </div>
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
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{user.nome}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            {roleBadge()}
          </div>

          {/* Store switcher on mobile */}
          {(user.role === 'ESTAGIARIO_360' || user.role === 'ADMIN') &&
            user.stores.length > 1 &&
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
                  {user.stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

          <div className="space-y-1 pt-1">
            {user.role === 'ADMIN' ? (
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
  );
}
