'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatarDataBr, calcularDiasRestantes, classificarFaixa } from '@/lib/utils';

function ImprimirContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId') || '';

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [storeNome, setStoreNome] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      if (!storeId) return;
      try {
        const res = await fetch(`/api/validades?storeId=${storeId}&status=EM_MONITORAMENTO&faixa=TODOS`);
        const data = await res.json();
        if (data.records) {
          setRecords(data.records);
          if (data.records.length > 0 && data.records[0].store) {
            setStoreNome(data.records[0].store.nome);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [storeId]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando checklist de impressão...</div>;
  }

  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-white text-black p-6 font-sans">
      {/* Action bar for screen only */}
      <div className="no-print flex items-center justify-between bg-slate-100 p-4 rounded-xl mb-6 border border-slate-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-slate-800">Visualização de Impressão (Checklist A4)</span>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow flex items-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Agora (Ctrl + P)</span>
        </button>
      </div>

      {/* Header Document */}
      <div className="border-b-2 border-black pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight">CASAS PEDRO – CONTROLE DE QUALIDADE</h1>
            <h2 className="text-base font-bold text-slate-700">
              Checklist Diário de Validades – Loja {storeId} {storeNome ? `(${storeNome})` : ''}
            </h2>
          </div>
          <div className="text-right text-xs">
            <p><strong>Emissão:</strong> {hojeFormatado}</p>
            <p><strong>Total de Itens:</strong> {records.length}</p>
          </div>
        </div>
      </div>

      {/* Checklist Table */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 px-1 w-8 text-center font-bold">Conf.</th>
            <th className="py-2 px-2 w-16 font-bold">SKU</th>
            <th className="py-2 px-2 font-bold">Produto</th>
            <th className="py-2 px-2 w-28 font-bold">Categoria</th>
            <th className="py-2 px-2 w-12 text-center font-bold">Qtd.</th>
            <th className="py-2 px-2 w-20 text-center font-bold">Validade</th>
            <th className="py-2 px-2 w-24 text-center font-bold">Status/Dias</th>
            <th className="py-2 px-2 w-24 font-bold">Obs/Lote</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-slate-500">
                Nenhum produto em monitoramento nesta loja.
              </td>
            </tr>
          ) : (
            records.map((r, idx) => (
              <tr key={r.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                <td className="py-2.5 px-1 text-center">
                  <div className="w-4 h-4 border-2 border-black rounded mx-auto"></div>
                </td>
                <td className="py-2.5 px-2 font-mono font-bold">{r.sku}</td>
                <td className="py-2.5 px-2 font-medium">{r.product.item}</td>
                <td className="py-2.5 px-2 text-slate-600">{r.product.categoria}</td>
                <td className="py-2.5 px-2 text-center font-bold">{r.quantidade}</td>
                <td className="py-2.5 px-2 text-center font-bold">{formatarDataBr(r.dataValidade)}</td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    r.faixaAlerta === 'VENCIDO' ? 'bg-red-200 text-red-900' :
                    r.faixaAlerta === 'CRITICO' ? 'bg-orange-200 text-orange-900' :
                    r.faixaAlerta === 'ATENCAO' ? 'bg-amber-100 text-amber-900' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {r.diasRestantes < 0 ? `${r.diasRestantes}d (Vencido)` : `${r.diasRestantes}d restantes`}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-[10px] text-slate-600">
                  {r.lote ? `Lote: ${r.lote}` : ''} {r.observacoes || ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Signature Footer */}
      <div className="mt-12 pt-6 border-t border-slate-400 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="border-b border-black w-64 mb-1"></div>
          <p className="font-bold">Responsável pela Verificação (Estagiário)</p>
          <p className="text-slate-500">Nome / Matrícula / Assinatura</p>
        </div>

        <div>
          <div className="border-b border-black w-64 mb-1"></div>
          <p className="font-bold">Visto da Gerência da Loja</p>
          <p className="text-slate-500">Data e Assinatura</p>
        </div>
      </div>
    </div>
  );
}

export default function ImprimirPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ImprimirContent />
    </Suspense>
  );
}
