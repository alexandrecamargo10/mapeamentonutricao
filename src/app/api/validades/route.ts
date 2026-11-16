import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, canAccessStore, buildStoreRLSFilter } from '@/lib/auth';
import { calcularDiasRestantes, classificarFaixa } from '@/lib/utils';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeIdParam = searchParams.get('storeId');
  const statusParam = searchParams.get('status') || 'EM_MONITORAMENTO';
  const faixaParam = searchParams.get('faixa') || 'TODOS';
  const search = searchParams.get('search')?.trim().toLowerCase() || '';

  // Determina a loja alvo respeitando o escopo do usuário
  let targetStoreId = storeIdParam;
  if (!targetStoreId && session.role !== 'ADMIN') {
    targetStoreId = session.stores[0] || null;
  }

  // Aplicação estrita de Row-Level Security (RLS)
  let rlsFilter: Record<string, any>;
  try {
    rlsFilter = buildStoreRLSFilter(session, targetStoreId);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Acesso negado: você não possui permissão para visualizar os dados desta loja.' },
      { status: 403 }
    );
  }

  const whereClause: any = {
    ...rlsFilter,
  };

  if (statusParam === 'EM_MONITORAMENTO') {
    whereClause.status = 'EM_MONITORAMENTO';
  } else if (statusParam === 'BAIXADO') {
    whereClause.status = { not: 'EM_MONITORAMENTO' };
  }

  const records = await prisma.validityRecord.findMany({
    where: whereClause,
    include: {
      product: true,
      store: { select: { id: true, nome: true } },
      registradoPor: { select: { id: true, nome: true } },
      baixadoPor: { select: { id: true, nome: true } },
    },
    orderBy: {
      dataValidade: 'asc',
    },
  });

  // Calculate dynamic expiration days and alert categories
  let enriched = records.map((rec) => {
    const diasRestantes = calcularDiasRestantes(rec.dataValidade);
    const faixaAlerta = classificarFaixa(diasRestantes, rec.status);
    return {
      ...rec,
      diasRestantes,
      faixaAlerta,
    };
  });

  // Filter by faixa if requested
  if (faixaParam !== 'TODOS') {
    enriched = enriched.filter((r) => r.faixaAlerta === faixaParam);
  }

  // Filter by search query if requested
  if (search) {
    enriched = enriched.filter(
      (r) =>
        r.sku.toLowerCase().includes(search) ||
        r.product.item.toLowerCase().includes(search) ||
        r.product.categoria.toLowerCase().includes(search) ||
        (r.lote && r.lote.toLowerCase().includes(search))
    );
  }

  // Sort: VENCIDO first, then CRITICO, then ATENCAO, then REGULAR
  enriched.sort((a, b) => {
    if (a.status === 'EM_MONITORAMENTO' && b.status !== 'EM_MONITORAMENTO') return -1;
    if (a.status !== 'EM_MONITORAMENTO' && b.status === 'EM_MONITORAMENTO') return 1;
    return a.diasRestantes - b.diasRestantes;
  });

  // Summary counts
  const counts = {
    total: enriched.length,
    vencidos: enriched.filter((r) => r.faixaAlerta === 'VENCIDO').length,
    criticos: enriched.filter((r) => r.faixaAlerta === 'CRITICO').length,
    atencao: enriched.filter((r) => r.faixaAlerta === 'ATENCAO').length,
    regular: enriched.filter((r) => r.faixaAlerta === 'REGULAR').length,
    baixados: enriched.filter((r) => r.faixaAlerta === 'BAIXADO').length,
  };

  return NextResponse.json({
    storeId: targetStoreId,
    counts,
    records: enriched,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storeId, sku, quantidade, dataValidade, lote, observacoes } = body;

    if (!storeId || !sku || quantidade === undefined || !dataValidade) {
      return NextResponse.json(
        { error: 'Loja, SKU, Quantidade e Data de Validade são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanStoreId = String(storeId).trim();

    // RLS check para escrita
    if (!canAccessStore(session, cleanStoreId)) {
      return NextResponse.json(
        { error: 'Acesso negado para cadastrar itens nesta loja.' },
        { status: 403 }
      );
    }

    const parsedQty = parseFloat(String(quantidade));
    if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty > 100000) {
      return NextResponse.json(
        { error: 'Quantidade inválida. Informe um valor positivo.' },
        { status: 400 }
      );
    }

    // Check product existence
    const product = await prisma.product.findUnique({
      where: { sku: String(sku).trim() },
    });
    if (!product || !product.ativo) {
      return NextResponse.json(
        { error: `Produto com SKU ${sku} não encontrado ou inativo no catálogo.` },
        { status: 404 }
      );
    }

    const parsedDate = new Date(dataValidade);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Data de validade inválida.' },
        { status: 400 }
      );
    }

    const record = await prisma.validityRecord.create({
      data: {
        storeId: cleanStoreId,
        sku: product.sku,
        quantidade: parsedQty,
        dataValidade: parsedDate,
        lote: lote ? String(lote).trim().slice(0, 80) : null,
        observacoes: observacoes ? String(observacoes).trim().slice(0, 255) : null,
        status: 'EM_MONITORAMENTO',
        registradoPorId: session.userId,
      },
      include: {
        product: true,
        store: { select: { id: true, nome: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        acao: 'CRIACAO_REGISTRO',
        userId: session.userId,
        storeId: cleanStoreId,
        detalhes: JSON.stringify({
          recordId: record.id,
          sku: record.sku,
          item: record.product.item,
          quantidade: record.quantidade,
          dataValidade: record.dataValidade,
        }),
      },
    });

    const dias = calcularDiasRestantes(record.dataValidade);
    const faixa = classificarFaixa(dias, record.status);

    return NextResponse.json({
      success: true,
      record: {
        ...record,
        diasRestantes: dias,
        faixaAlerta: faixa,
      },
    });
  } catch (error: any) {
    console.error('Erro ao cadastrar validade:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar registro.' },
      { status: 500 }
    );
  }
}
