'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Users,
  Store,
  Package,
  AlertOctagon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated || meData.user.role !== 'ADMIN') {
          router.push('/login');
          return;
        }
        setUser(meData.user);

        // Fetch reports
        const repRes = await fetch('/api/admin/reports');
        const repData = await repRes.json();
        setData(repData);

        // Fetch pending users count
        const uRes = await fetch('/api/admin/users?status=PENDENTE');
        const uData = await uRes.json();
        if (uData.users) {
          setPendingCount(uData.users.length);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalMonitorados: 0,
    totalVencidos: 0,
    totalCriticos: 0,
    totalAtencao: 0,
    totalRegular: 0,
    totalBaixados: 0,
  };

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];

  const motivosBaixaData = [
    { name: 'Vendido (Promoção)', value: data?.motivosBaixa?.VENDIDO || 0, color: '#10b981' },
    { name: 'Descarte (Perda)', value: data?.motivosBaixa?.DESCARTADO || 0, color: '#ef4444' },
    { name: 'Retirado (CD)', value: data?.motivosBaixa?.RETIRADO || 0, color: '#3b82f6' },
    { name: 'Doado', value: data?.motivosBaixa?.DOADO || 0, color: '#a855f7' },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} pendingUsersCount={pendingCount} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Pending approvals alert banner */}
        {pendingCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {pendingCount} novo(s) estagiário(s) aguardando aprovação
                </h4>
                <p className="text-xs text-slate-600">
                  Defina o perfil (Padrão ou 360) e vincule as lojas para liberar o acesso.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/admin/usuarios')}
              className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
            >
              <span>Gerenciar Usuários</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Corporativo de Validades
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Rede Casas Pedro • 75 Lojas Monitoradas • Nutrição & Qualidade
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/admin/relatorios')}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-sm transition-colors"
            >
              Relatórios Detalhados & Exportação
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Monitorados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Itens em Monitoramento
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{kpis.totalMonitorados}</span>
              <span className="text-xs font-semibold text-slate-500">Na rede</span>
            </div>
          </div>

          {/* Vencidos */}
          <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm space-y-1 bg-red-50/10">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center space-x-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Vencidos no Salão</span>
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-red-600">{kpis.totalVencidos}</span>
              <span className="text-xs font-semibold text-red-600">Ação imediata</span>
            </div>
          </div>

          {/* Críticos (≤ 7 dias) */}
          <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm space-y-1 bg-orange-50/10">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Críticos (≤ 7 dias)</span>
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-orange-600">{kpis.totalCriticos}</span>
              <span className="text-xs font-semibold text-orange-600">Liquidação/Saída</span>
            </div>
          </div>

          {/* Baixados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Baixas Realizadas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-600">{kpis.totalBaixados}</span>
              <span className="text-xs font-semibold text-slate-500">Histórico</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Ranking Lojas Críticas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ranking de Lojas com Alertas Críticos/Vencidos
                </h3>
                <p className="text-xs text-slate-500">
                  Prioridade para fiscalização da equipe de Nutrição
                </p>
              </div>
              <BarChart2 className="w-5 h-5 text-slate-400" />
            </div>

            {data?.rankingLojas?.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Nenhum alerta crítico registrado no momento.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.rankingLojas || []} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="nome"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [val, name === 'criticos' ? 'Críticos' : 'Vencidos']}
                    />
                    <Bar dataKey="criticos" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} name="Críticos" />
                    <Bar dataKey="vencidos" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Vencidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Categorias com mais alertas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Alertas de Validade por Categoria
                </h3>
                <p className="text-xs text-slate-500">
                  Concentração de produtos críticos e vencidos
                </p>
              </div>
              <PieIcon className="w-5 h-5 text-slate-400" />
            </div>

            {data?.rankingCategorias?.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Nenhum dado por categoria disponível.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={data?.rankingCategorias?.slice(0, 7) || []}
                    margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="categoria"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={90}
                    />
                    <Tooltip />
                    <Bar dataKey="urgentes" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Total Críticos/Vencidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/usuarios')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition-all text-left flex items-start space-x-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-amber-700">
                Gestão de Usuários & Estagiários
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Aprovar novos cadastros, definir perfis Padrão/360 e vincular lojas.
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/lojas')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition-all text-left flex items-start space-x-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-amber-700">
                Gestão de Lojas (75 unidades)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastrar novas lojas, editar nomes e acompanhar inventário de cada filial.
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/produtos')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition-all text-left flex items-start space-x-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-amber-700">
                Catálogo de Produtos (1.115 SKUs)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastrar novos produtos, editar categorias e importar planilhas em lote.
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
