'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Store, Plus, Search, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export default function LojasAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [storeNome, setStoreNome] = useState('');
  const [storeAtivo, setStoreAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user.role !== 'ADMIN') {
        router.push('/login');
        return;
      }
      setCurrentUser(meData.user);

      const res = await fetch('/api/admin/stores');
      const data = await res.json();
      if (data.stores) setStores(data.stores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const filteredStores = stores.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openNewModal = () => {
    setIsEditing(false);
    setStoreId('');
    setStoreNome('');
    setStoreAtivo(true);
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setIsEditing(true);
    setStoreId(s.id);
    setStoreNome(s.nome);
    setStoreAtivo(s.ativo);
    setModalError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSaving(true);

    try {
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/stores', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: storeId,
          nome: storeNome,
          ativo: storeAtivo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Erro ao salvar loja.');
        return;
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      setModalError('Erro de conexão ao salvar loja.');
    } finally {
      setSaving(false);
    }
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
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestão de Lojas (Rede Casas Pedro)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              75 filiais ativas no mapeamento corporativo
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar loja por código ou nome..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              onClick={openNewModal}
              className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Loja</span>
            </button>
          </div>
        </div>

        {/* Store Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-4">Código (ID)</th>
                  <th className="py-3 px-4">Nome da Loja</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Itens Monitorados</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStores.map((s) => (
                  <tr key={s.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{s.nome}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.ativo
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {s.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {s.itensMonitorados} lotes
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                        title="Editar loja"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Loja' : 'Cadastrar Nova Loja'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código da Loja (ID)
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="Ex: 101099"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  required
                  value={storeNome}
                  onChange={(e) => setStoreNome(e.target.value)}
                  placeholder="Ex: BARRA DA TIJUCA 5"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              {isEditing && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="storeAtivo"
                    checked={storeAtivo}
                    onChange={(e) => setStoreAtivo(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <label htmlFor="storeAtivo" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Loja ativa e operando
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
