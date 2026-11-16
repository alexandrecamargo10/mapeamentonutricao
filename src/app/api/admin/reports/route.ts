import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calcularDiasRestantes, classificarFaixa } from '@/lib/utils';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN' || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId') || '';

  const whereClause: any = {};
  if (storeId && storeId !== 'TODAS') {
    whereClause.storeId = storeId;
  }

  // Fetch all records for the scope
  const records = await prisma.validityRecord.findMany({
    where: whereClause,
    include: {
      product: true,
      store: { select: { id: true, nome: true } },
    },
  });

  let totalMonitorados = 0;
  let totalVencidos = 0;
  let totalCriticos = 0;
  let totalAtencao = 0;
  let totalRegular = 0;
  let totalBaixados = 0;

  const categoriaDist: Record<string, { total: number; criticos: number; vencidos: number }> = {};
  const lojaCriticos: Record<string, { nome: string; criticos: number; vencidos: number; total: number }> = {};
  const motivosBaixa: Record<string, number> = {
    VENDIDO: 0,
    DESCARTADO: 0,
    RETIRADO: 0,
    DOADO: 0,
  };

  const enriched = records.map((r) => {
    const dias = calcularDiasRestantes(r.dataValidade);
    const faixa = classificarFaixa(dias, r.status);

    if (r.status === 'EM_MONITORAMENTO') {
      totalMonitorados++;
      if (faixa === 'VENCIDO') totalVencidos++;
      else if (faixa === 'CRITICO') totalCriticos++;
      else if (faixa === 'ATENCAO') totalAtencao++;
      else if (faixa === 'REGULAR') totalRegular++;

      // Agrupamento por Categoria
      const cat = r.product.categoria || 'Outros';
      if (!categoriaDist[cat]) {
        categoriaDist[cat] = { total: 0, criticos: 0, vencidos: 0 };
      }
      categoriaDist[cat].total++;
      if (faixa === 'CRITICO') categoriaDist[cat].criticos++;
      if (faixa === 'VENCIDO') categoriaDist[cat].vencidos++;

      // Agrupamento por Loja
      const sId = r.storeId;
      if (!lojaCriticos[sId]) {
        lojaCriticos[sId] = { nome: r.store.nome, criticos: 0, vencidos: 0, total: 0 };
      }
      lojaCriticos[sId].total++;
      if (faixa === 'CRITICO') lojaCriticos[sId].criticos++;
      if (faixa === 'VENCIDO') lojaCriticos[sId].vencidos++;
    } else {
      totalBaixados++;
      if (r.status in motivosBaixa) {
        motivosBaixa[r.status]++;
      }
    }

    return {
      ...r,
      diasRestantes: dias,
      faixaAlerta: faixa,
    };
  });

  // Top 10 Lojas com mais alertas (vencidos + críticos)
  const rankingLojas = Object.entries(lojaCriticos)
    .map(([id, data]) => ({
      id,
      nome: data.nome,
      pontosUrgentes: data.vencidos * 2 + data.criticos,
      vencidos: data.vencidos,
      criticos: data.criticos,
      total: data.total,
    }))
    .sort((a, b) => b.pontosUrgentes - a.pontosUrgentes)
    .slice(0, 10);

  // Categorias com mais alertas
  const rankingCategorias = Object.entries(categoriaDist)
    .map(([categoria, data]) => ({
      categoria,
      total: data.total,
      criticos: data.criticos,
      vencidos: data.vencidos,
      urgentes: data.criticos + data.vencidos,
    }))
    .sort((a, b) => b.urgentes - a.urgentes)
    .slice(0, 10);

  return NextResponse.json({
    kpis: {
      totalMonitorados,
      totalVencidos,
      totalCriticos,
      totalAtencao,
      totalRegular,
      totalBaixados,
    },
    motivosBaixa,
    rankingLojas,
    rankingCategorias,
    records: enriched,
  });
}
