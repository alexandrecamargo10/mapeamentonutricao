'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, Plus, Search, Upload, Edit2, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getCachedClientUser, fetchClientUser } from '@/lib/client-auth';

export default function ProdutosAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(() => getCachedClientUser());
  const [loading, setLoading] = useState<boolean>(() => !getCachedClientUser());

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sku, setSku] = useState('');
  const [item, setItem] = useState('');
  const [categoria, setCategoria] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Batch Upload State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');
  const [uploadingBatch, setUploadingBatch] = useState(false);

  const loadData = async () => {
    try {
      const url = `/api/admin/products?page=${page}&limit=50&q=${encodeURIComponent(
        search
      )}&categoria=${encodeURIComponent(selectedCategory)}`;

      const [meUser, res] = await Promise.all([
        fetchClientUser(),
        fetch(url),
      ]);

      if (!meUser || meUser.role !== 'ADMIN') {
        router.replace('/login');
        return;
      }
      setCurrentUser(meUser);

      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          setProducts(data.products);
          setTotal(data.total);
          setCategories(data.categories || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, selectedCategory, router]);

  const openNewModal = () => {
    setIsEditing(false);
    setSku('');
    setItem('');
    setCategoria(categories.length > 0 ? categories[0] : 'Geral');
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setIsEditing(true);
    setSku(p.sku);
    setItem(p.item);
    setCategoria(p.categoria);
    setModalError('');
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSaving(true);

    try {
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, item, categoria }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Erro ao salvar produto.');
        return;
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      setModalError('Erro de conexão ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBatch(true);
    setBatchMessage('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        // Map columns (handling variations like SKU, sku, Item, item, Produto, Categoria)
        const itemsToUpload = rawJson.map((row) => ({
          sku: String(row.SKU || row.sku || row.Codigo || ''),
          item: String(row.Item || row.item || row.Produto || row.Descricao || ''),
          categoria: String(row.Categoria || row.categoria || 'Geral'),
        })).filter((r) => r.sku && r.item);

        if (itemsToUpload.length === 0) {
          setBatchMessage('Nenhum produto válido encontrado. A planilha deve conter as colunas: SKU, Item, Categoria.');
          setUploadingBatch(false);
          return;
        }

        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToUpload }),
        });

        const data = await res.json();
        if (res.ok) {
          setBatchMessage(data.message || 'Importação realizada com sucesso!');
          loadData();
        } else {
          setBatchMessage(data.error || 'Erro ao processar importação.');
        }
      } catch (err) {
        setBatchMessage('Erro ao ler arquivo da planilha.');
      } finally {
        setUploadingBatch(false);
      }
    };
    reader.readAsBinaryString(file);
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
              Catálogo de Produtos ({total} itens)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Base oficial de SKUs e Categorias das Casas Pedro
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setBatchMessage('');
                setBatchModalOpen(true);
              }}
              className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Excel</span>
            </button>

            <button
              onClick={openNewModal}
              className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por SKU ou descrição..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-56 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-700 font-medium"
            >
              <option value="TODAS">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Página <strong>{page}</strong> de {Math.max(1, Math.ceil(total / 50))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-4 w-28">SKU</th>
                  <th className="py-3 px-4">Descrição do Produto</th>
                  <th className="py-3 px-4 w-48">Categoria</th>
                  <th className="py-3 px-4 text-right w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.sku} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{p.item}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {p.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="py-1.5 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">
              Mostrando {products.length} de {total} itens
            </span>
            <button
              disabled={page >= Math.ceil(total / 50)}
              onClick={() => setPage(page + 1)}
              className="py-1.5 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </main>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Produto' : 'Novo Produto'}
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

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SKU (Código do Produto)
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: 99420"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome / Descrição do Item
                </label>
                <input
                  type="text"
                  required
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="Ex: CASTANHA DE CAJU TORRADA 500G"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  required
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Grãos, Chocolates, Conservas..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                />
              </div>

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
                  {saving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH UPLOAD MODAL */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Importação em Lote (.xlsx / .csv)</h3>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Faça upload de uma planilha contendo as colunas: <strong>SKU</strong>, <strong>Item</strong> e <strong>Categoria</strong>. Novos produtos serão criados e existentes serão atualizados.
            </p>

            {batchMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl font-medium">
                {batchMessage}
              </div>
            )}

            <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-3 bg-slate-50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <label className="cursor-pointer text-xs font-bold text-amber-700 hover:underline">
                  <span>Selecionar arquivo Excel (.xlsx ou .csv)</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    disabled={uploadingBatch}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">Formatos suportados: Excel ou CSV</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="py-2 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
