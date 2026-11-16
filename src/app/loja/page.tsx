'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Plus,
  Search,
  Printer,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  ChevronRight,
  Filter,
  Package,
  Layers,
  ArrowDownCircle,
  HelpCircle,
  Trash2,
  ShoppingBag,
  Truck,
  HeartHandshake,
} from 'lucide-react';
import { formatarDataBr, getFaixaBadgeInfo, type FaixaAlerta } from '@/lib/utils';
import { getCachedClientUser, fetchClientUser } from '@/lib/client-auth';

export default function LojaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(() => getCachedClientUser());
  const [loading, setLoading] = useState<boolean>(() => !getCachedClientUser());

  // Store state
  const [currentStoreId, setCurrentStoreId] = useState<string>('');
  const [currentStoreNome, setCurrentStoreNome] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({
    total: 0,
    vencidos: 0,
    criticos: 0,
    atencao: 0,
    regular: 0,
    baixados: 0,
  });

  // Filter state
  const [activeFaixa, setActiveFaixa] = useState<string>('TODOS');
  const [activeStatus, setActiveStatus] = useState<string>('EM_MONITORAMENTO');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // New record form state
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [dataValidade, setDataValidade] = useState<string>('');
  const [lote, setLote] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [savingRecord, setSavingRecord] = useState(false);
  const [formError, setFormError] = useState('');

  // Baixa form state
  const [baixaStatus, setBaixaStatus] = useState<string>('VENDIDO');
  const [baixaMotivo, setBaixaMotivo] = useState<string>('');
  const [savingBaixa, setSavingBaixa] = useState(false);

  // 1. Load Session
  useEffect(() => {
    async function loadUser() {
      try {
        const meUser = await fetchClientUser();
        if (!meUser) {
          router.replace('/login');
          return;
        }
        setUser(meUser);

        if (meUser.stores && meUser.stores.length > 0) {
          setCurrentStoreId(meUser.stores[0].id);
          setCurrentStoreNome(meUser.stores[0].nome);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  // 2. Load Store Records when currentStoreId, status or faixa changes
  useEffect(() => {
    if (!currentStoreId) return;

    // update store nome
    if (user?.stores) {
      const found = user.stores.find((s: any) => s.id === currentStoreId);
      if (found) setCurrentStoreNome(found.nome);
    }

    async function fetchRecords() {
      try {
        const url = `/api/validades?storeId=${currentStoreId}&status=${activeStatus}&faixa=${activeFaixa}&search=${encodeURIComponent(
          searchQuery
        )}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.records) {
          setRecords(data.records);
          setCounts(data.counts);
        }
      } catch (err) {
        console.error('Erro ao buscar validades:', err);
      }
    }
    fetchRecords();
  }, [currentStoreId, activeStatus, activeFaixa, searchQuery, user]);

  // Product Search autocomplete
  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(productSearch)}`);
        const data = await res.json();
        if (data.products) {
          setSearchResults(data.products);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleStoreChange = (newStoreId: string) => {
    setCurrentStoreId(newStoreId);
  };

  // Preset Date Helper
  const setPresetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDataValidade(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProduct) {
      setFormError('Selecione um produto do catálogo.');
      return;
    }
    if (!dataValidade) {
      setFormError('Informe a data de validade.');
      return;
    }

    setSavingRecord(true);
    try {
      const res = await fetch('/api/validades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: currentStoreId,
          sku: selectedProduct.sku,
          quantidade,
          dataValidade,
          lote,
          observacoes,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar registro.');
        return;
      }

      // Reset and close
      setNewModalOpen(false);
      setSelectedProduct(null);
      setProductSearch('');
      setQuantidade(1);
      setDataValidade('');
      setLote('');
      setObservacoes('');

      // Refresh records
      const url = `/api/validades?storeId=${currentStoreId}&status=${activeStatus}&faixa=${activeFaixa}&search=${encodeURIComponent(
        searchQuery
      )}`;
      const refRes = await fetch(url);
      const refData = await refRes.json();
      if (refData.records) {
        setRecords(refData.records);
        setCounts(refData.counts);
      }
    } catch (err) {
      setFormError('Falha ao comunicar com o servidor.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleSaveBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSavingBaixa(true);
    try {
      const res = await fetch(`/api/validades/${selectedRecord.id}/baixa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: baixaStatus,
          motivoBaixa: baixaMotivo,
        }),
      });

      if (res.ok) {
        setBaixaModalOpen(false);
        setSelectedRecord(null);
        setBaixaMotivo('');

        // Refresh
        const url = `/api/validades?storeId=${currentStoreId}&status=${activeStatus}&faixa=${activeFaixa}&search=${encodeURIComponent(
          searchQuery
        )}`;
        const refRes = await fetch(url);
        const refData = await refRes.json();
        if (refData.records) {
          setRecords(refData.records);
          setCounts(refData.counts);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBaixa(false);
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
      <Navbar
        user={user}
        currentStoreId={currentStoreId}
        onStoreChange={handleStoreChange}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Store Title Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 font-black text-xl">
              📍
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Loja {currentStoreId}
                </span>
                <span className="text-xs text-slate-500">
                  {user?.role === 'ESTAGIARIO_360' ? '(Estagiário 360)' : '(Estagiário Padrão)'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentStoreNome || `Loja ${currentStoreId}`}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setNewModalOpen(true)}
              className="flex-1 md:flex-initial py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Registro de Validade</span>
            </button>

            {currentStoreId && (
              <button
                onClick={() => router.push(`/loja/imprimir?storeId=${currentStoreId}`)}
                className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-200"
                title="Imprimir lista para prancheta"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Checklist</span>
              </button>
            )}
          </div>
        </div>

        {/* Status / Faixas Filter Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Vencidos */}
          <button
            onClick={() => {
              setActiveStatus('EM_MONITORAMENTO');
              setActiveFaixa('VENCIDO');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'VENCIDO'
                ? 'bg-red-500 text-white border-red-600 shadow-md ring-2 ring-red-400'
                : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider">🚨 Vencidos</span>
              <span className={`text-lg font-black ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'VENCIDO' ? 'text-white' : 'text-red-600'}`}>
                {counts.vencidos}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'VENCIDO' ? 'text-red-100' : 'text-slate-500'}`}>
              Passou da data
            </p>
          </button>

          {/* Críticos */}
          <button
            onClick={() => {
              setActiveStatus('EM_MONITORAMENTO');
              setActiveFaixa('CRITICO');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'CRITICO'
                ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider">🟠 Críticos</span>
              <span className={`text-lg font-black ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'CRITICO' ? 'text-white' : 'text-orange-600'}`}>
                {counts.criticos}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'CRITICO' ? 'text-orange-100' : 'text-slate-500'}`}>
              Até 7 dias
            </p>
          </button>

          {/* Atenção */}
          <button
            onClick={() => {
              setActiveStatus('EM_MONITORAMENTO');
              setActiveFaixa('ATENCAO');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'ATENCAO'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider">🟡 Atenção</span>
              <span className={`text-lg font-black ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'ATENCAO' ? 'text-white' : 'text-amber-600'}`}>
                {counts.atencao}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'ATENCAO' ? 'text-amber-100' : 'text-slate-500'}`}>
              8 a 30 dias
            </p>
          </button>

          {/* Regular / Em dia */}
          <button
            onClick={() => {
              setActiveStatus('EM_MONITORAMENTO');
              setActiveFaixa('REGULAR');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'REGULAR'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider">🟢 Em dia</span>
              <span className={`text-lg font-black ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'REGULAR' ? 'text-white' : 'text-emerald-600'}`}>
                {counts.regular}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'REGULAR' ? 'text-emerald-100' : 'text-slate-500'}`}>
              &gt; 30 dias
            </p>
          </button>

          {/* Todos Ativos */}
          <button
            onClick={() => {
              setActiveStatus('EM_MONITORAMENTO');
              setActiveFaixa('TODOS');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStatus === 'EM_MONITORAMENTO' && activeFaixa === 'TODOS'
                ? 'bg-slate-800 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider">📦 Todos</span>
              <span className="text-lg font-black">
                {counts.vencidos + counts.criticos + counts.atencao + counts.regular}
              </span>
            </div>
            <p className="text-[11px] mt-1 opacity-80">Em monitoramento</p>
          </button>

          {/* Baixados */}
          <button
            onClick={() => {
              setActiveStatus('BAIXADO');
              setActiveFaixa('TODOS');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStatus === 'BAIXADO'
                ? 'bg-slate-700 text-white border-slate-800 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider">⚪ Baixados</span>
              <span className="text-lg font-black">{counts.baixados}</span>
            </div>
            <p className="text-[11px] mt-1 opacity-80">Histórico de saída</p>
          </button>
        </div>

        {/* Search & Counter info */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por SKU, nome ou lote..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Exibindo <strong>{records.length}</strong> registro(s) encontrado(s)
          </div>
        </div>

        {/* Product Cards / Table */}
        {records.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3 shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Nenhum registro encontrado</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Não há produtos correspondentes a este filtro na Loja {currentStoreId}. Clique no botão acima para cadastrar novos lotes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((rec) => {
              const badge = getFaixaBadgeInfo(rec.faixaAlerta as FaixaAlerta);
              return (
                <div
                  key={rec.id}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                    rec.faixaAlerta === 'VENCIDO'
                      ? 'border-red-300 bg-red-50/20'
                      : rec.faixaAlerta === 'CRITICO'
                      ? 'border-orange-300 bg-orange-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header card: SKU + Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                        SKU {rec.sku}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center space-x-1 ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Product Name & Category */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                        {rec.product.item}
                      </h4>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {rec.product.categoria}
                      </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                          Validade
                        </span>
                        <span className="font-bold text-slate-800">
                          {formatarDataBr(rec.dataValidade)}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                          Quantidade
                        </span>
                        <span className="font-bold text-slate-800">
                          {rec.quantidade} un.
                        </span>
                      </div>
                    </div>

                    {/* Days indicator & Batch */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-600">
                          {rec.diasRestantes < 0
                            ? `Vencido há ${Math.abs(rec.diasRestantes)} dia(s)`
                            : rec.diasRestantes === 0
                            ? 'Vence hoje!'
                            : `${rec.diasRestantes} dia(s) restante(s)`}
                        </span>
                      </div>

                      {rec.lote && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Lote: {rec.lote}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {rec.status === 'EM_MONITORAMENTO' ? (
                      <button
                        onClick={() => {
                          setSelectedRecord(rec);
                          setBaixaModalOpen(true);
                        }}
                        className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>Dar Baixa no Item</span>
                      </button>
                    ) : (
                      <div className="w-full bg-slate-100 p-2 rounded-xl text-center text-xs text-slate-600 font-medium">
                        Baixado como: <strong className="text-slate-900">{rec.status}</strong>{' '}
                        em {formatarDataBr(rec.dataBaixa)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Novo Registro de Validade */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Novo Registro de Validade</h3>
                <p className="text-xs text-slate-500">Loja {currentStoreId} – {currentStoreNome}</p>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRecord} className="space-y-4">
              {/* Product Search */}
              <div className="space-y-1 relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Buscar Produto (1.115 SKUs)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      if (selectedProduct) setSelectedProduct(null);
                    }}
                    placeholder="Digite o SKU ou nome do item..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>

                {/* Autocomplete dropdown */}
                {searchResults.length > 0 && !selectedProduct && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                    {searchResults.map((p) => (
                      <button
                        key={p.sku}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setProductSearch(`${p.sku} - ${p.item}`);
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-2.5 hover:bg-amber-50/60 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.item}</p>
                          <p className="text-slate-400 text-[11px]">Categoria: {p.categoria}</p>
                        </div>
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          {p.sku}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedProduct && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 uppercase block">
                        Produto Selecionado
                      </span>
                      <p className="text-xs font-bold text-slate-900">{selectedProduct.item}</p>
                      <p className="text-[11px] text-slate-500">
                        SKU: {selectedProduct.sku} | Categoria: {selectedProduct.categoria}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setProductSearch('');
                      }}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Trocar
                    </button>
                  </div>
                )}
              </div>

              {/* Quantidade */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Quantidade em Loja
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseFloat(e.target.value) || 1)}
                    className="flex-1 py-2 text-center font-bold text-base bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantidade(quantidade + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Data de Validade & Presets */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Data de Validade
                </label>
                <input
                  type="date"
                  required
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                />

                {/* Preset shortcuts */}
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Atalhos:</span>
                  <button
                    type="button"
                    onClick={() => setPresetDate(7)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-medium"
                  >
                    +7 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(15)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-medium"
                  >
                    +15 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(30)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-medium"
                  >
                    +30 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(60)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-medium"
                  >
                    +60 dias
                  </button>
                </div>
              </div>

              {/* Lote & Observações (Opcionais) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Lote (Opcional)
                  </label>
                  <input
                    type="text"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    placeholder="Ex: L2409"
                    className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Observação
                  </label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Prateleira 2"
                    className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="py-2.5 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  {savingRecord ? 'Salvando...' : 'Salvar Validade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dar Baixa */}
      {baixaModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dar Baixa no Item</h3>
                <p className="text-xs text-slate-500">
                  {selectedRecord.product.item} ({selectedRecord.quantidade} un.)
                </p>
              </div>
              <button
                onClick={() => setBaixaModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBaixa} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Motivo / Destino da Saída:
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Vendido */}
                <button
                  type="button"
                  onClick={() => setBaixaStatus('VENDIDO')}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all ${
                    baixaStatus === 'VENDIDO'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block text-xs">Vendido</strong>
                    <span className="text-[10px] text-slate-500">Com desconto / Promoção</span>
                  </div>
                </button>

                {/* Descartado */}
                <button
                  type="button"
                  onClick={() => setBaixaStatus('DESCARTADO')}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all ${
                    baixaStatus === 'DESCARTADO'
                      ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />
                  <div>
                    <strong className="block text-xs">Descartado</strong>
                    <span className="text-[10px] text-slate-500">Perda / Avaria / Vencido</span>
                  </div>
                </button>

                {/* Retirado */}
                <button
                  type="button"
                  onClick={() => setBaixaStatus('RETIRADO')}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all ${
                    baixaStatus === 'RETIRADO'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Truck className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                  <div>
                    <strong className="block text-xs">Retirado</strong>
                    <span className="text-[10px] text-slate-500">Devolvido ao CD</span>
                  </div>
                </button>

                {/* Doado */}
                <button
                  type="button"
                  onClick={() => setBaixaStatus('DOADO')}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all ${
                    baixaStatus === 'DOADO'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 mt-0.5 text-purple-600 shrink-0" />
                  <div>
                    <strong className="block text-xs">Doado</strong>
                    <span className="text-[10px] text-slate-500">Doação autorizada</span>
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observação / Justificativa
                </label>
                <textarea
                  rows={2}
                  value={baixaMotivo}
                  onChange={(e) => setBaixaMotivo(e.target.value)}
                  placeholder="Informação adicional sobre a baixa..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBaixaModalOpen(false)}
                  className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBaixa}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  {savingBaixa ? 'Processando...' : 'Confirmar Baixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
