'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Store,
  Layers,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatarDataBr, getFaixaBadgeInfo, type FaixaAlerta } from '@/lib/utils';

export default function RelatoriosAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedFaixa, setSelectedFaixa] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  const [records, setRecords] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    async function loadInit() {
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated || meData.user.role !== 'ADMIN') {
          router.push('/login');
          return;
        }
        setCurrentUser(meData.user);

        const sRes = await fetch('/api/admin/stores');
        const sData = await sRes.json();
        if (sData.stores) setStores(sData.stores);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInit();
  }, [router]);

  useEffect(() => {
    async function fetchReportData() {
      setFetching(true);
      try {
        const url = `/api/admin/reports?storeId=${selectedStoreId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.records) {
          setRecords(data.records);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    fetchReportData();
  }, [selectedStoreId]);

  // Client-side filtering on fetched records
  const filteredRecords = records.filter((r) => {
    if (selectedStatus === 'EM_MONITORAMENTO' && r.status !== 'EM_MONITORAMENTO') return false;
    if (selectedStatus === 'BAIXADO' && r.status === 'EM_MONITORAMENTO') return false;
    if (selectedFaixa !== 'TODOS' && r.faixaAlerta !== selectedFaixa) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchSku = r.sku.toLowerCase().includes(q);
      const matchItem = r.product.item.toLowerCase().includes(q);
      const matchStore = r.store.nome.toLowerCase().includes(q);
      const matchCat = r.product.categoria.toLowerCase().includes(q);
      if (!matchSku && !matchItem && !matchStore && !matchCat) return false;
    }
    return true;
  });

  const exportToExcel = () => {
    const rows = filteredRecords.map((r) => ({
      'Código Loja': r.storeId,
      'Nome da Loja': r.store.nome,
      SKU: r.sku,
      'Descrição do Item': r.product.item,
      Categoria: r.product.categoria,
      Quantidade: r.quantidade,
      'Data de Validade': formatarDataBr(r.dataValidade),
      'Dias Restantes': r.diasRestantes,
      'Faixa de Alerta': r.faixaAlerta,
      Status: r.status,
      'Motivo da Baixa': r.motivoBaixa || '',
      'Data da Baixa': r.dataBaixa ? formatarDataBr(r.dataBaixa) : '',
      Lote: r.lote || '',
      Observações: r.observacoes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio_Validades');

    const fileName = `Relatorio_Validades_CasasPedro_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToCSV = () => {
    const rows = filteredRecords.map((r) => ({
      Loja_ID: r.storeId,
      Loja_Nome: r.store.nome,
      SKU: r.sku,
      Item: r.product.item,
      Categoria: r.product.categoria,
      Quantidade: r.quantidade,
      Data_Validade: formatarDataBr(r.dataValidade),
      Dias_Restantes: r.diasRestantes,
      Faixa_Alerta: r.faixaAlerta,
      Status: r.status,
      Motivo_Baixa: r.motivoBaixa || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Validades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              Relatórios e Auditoria de Validades
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Visão consolidada da rede (75 lojas) ou filtro específico por unidade
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCSV}
              className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={exportToExcel}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Store selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Loja:
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800 font-semibold"
              >
                <option value="TODAS">🌐 Todas as 75 Lojas</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Status selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Status do Item:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="EM_MONITORAMENTO">Apenas em Monitoramento (Salão)</option>
                <option value="BAIXADO">Apenas Baixados (Saídas)</option>
              </select>
            </div>

            {/* Faixa Alerta */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Faixa de Alerta:
              </label>
              <select
                value={selectedFaixa}
                onChange={(e) => setSelectedFaixa(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-800"
              >
                <option value="TODOS">Todas as Faixas</option>
                <option value="VENCIDO">🚨 Vencidos (&lt; 0 dias)</option>
                <option value="CRITICO">🟠 Críticos (≤ 7 dias)</option>
                <option value="ATENCAO">🟡 Atenção (8 a 30 dias)</option>
                <option value="REGULAR">🟢 Em dia (&gt; 30 dias)</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Busca Rápida:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SKU, produto ou loja..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Mostrando <strong>{filteredRecords.length}</strong> registro(s) encontrado(s)
            </span>
            {selectedStoreId !== 'TODAS' && (
              <span className="text-amber-800 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                Filtro ativo: Loja {selectedStoreId}
              </span>
            )}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-3">Loja</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-center">Qtd.</th>
                  <th className="py-3 px-3 text-center">Validade</th>
                  <th className="py-3 px-3 text-center">Dias Restantes</th>
                  <th className="py-3 px-3 text-center">Alerta</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Nenhum registro encontrado para estes filtros.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const badge = getFaixaBadgeInfo(r.faixaAlerta as FaixaAlerta);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {r.store.id} - {r.store.nome}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.sku}</td>
                        <td className="py-3 px-3 font-bold text-slate-800 max-w-xs truncate">
                          {r.product.item}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{r.product.categoria}</td>
                        <td className="py-3 px-3 text-center font-bold">{r.quantidade}</td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {formatarDataBr(r.dataValidade)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {r.diasRestantes < 0 ? (
                            <span className="text-red-600">{r.diasRestantes}d (Vencido)</span>
                          ) : (
                            <span>{r.diasRestantes}d</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700">
                            {r.status}
                            {r.motivoBaixa ? ` (${r.motivoBaixa})` : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
