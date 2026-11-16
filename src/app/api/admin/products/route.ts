import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN' || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const categoria = searchParams.get('categoria')?.trim() || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const whereClause: any = {};
  if (categoria && categoria !== 'TODAS') {
    whereClause.categoria = categoria;
  }
  if (q) {
    whereClause.OR = [
      { sku: { contains: q } },
      { item: { contains: q } },
    ];
  }

  const [total, products, categoriesRaw] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { item: 'asc' },
    }),
    prisma.product.findMany({
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    }),
  ]);

  const categories = categoriesRaw.map((c) => c.categoria).filter(Boolean);

  return NextResponse.json({
    total,
    page,
    limit,
    categories,
    products,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN' || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Check if batch upload
    if (Array.isArray(body.items)) {
      let created = 0;
      for (const item of body.items) {
        if (item.sku && item.item) {
          await prisma.product.upsert({
            where: { sku: String(item.sku).trim() },
            update: {
              item: String(item.item).trim(),
              categoria: String(item.categoria || 'Geral').trim(),
              ativo: true,
            },
            create: {
              sku: String(item.sku).trim(),
              item: String(item.item).trim(),
              categoria: String(item.categoria || 'Geral').trim(),
              ativo: true,
            },
          });
          created++;
        }
      }
      await prisma.auditLog.create({
        data: {
          acao: 'IMPORTACAO_LOTE_PRODUTOS',
          userId: session.userId,
          detalhes: JSON.stringify({ totalImportados: created }),
        },
      });
      return NextResponse.json({
        success: true,
        message: `${created} produtos importados/atualizados no catálogo com sucesso!`,
      });
    }

    const { sku, item, categoria } = body;
    if (!sku || !item) {
      return NextResponse.json({ error: 'SKU e Nome do produto são obrigatórios.' }, { status: 400 });
    }

    const cleanSku = String(sku).trim();
    const existing = await prisma.product.findUnique({ where: { sku: cleanSku } });
    if (existing) {
      return NextResponse.json({ error: `Já existe um produto com o SKU ${cleanSku}.` }, { status: 409 });
    }

    const newProd = await prisma.product.create({
      data: {
        sku: cleanSku,
        item: String(item).trim(),
        categoria: String(categoria || 'Geral').trim(),
        ativo: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        acao: 'CADASTRO_PRODUTO',
        userId: session.userId,
        detalhes: JSON.stringify({ sku: newProd.sku, item: newProd.item, categoria: newProd.categoria }),
      },
    });

    return NextResponse.json({ success: true, product: newProd });
  } catch (error: any) {
    console.error('Erro ao salvar produto:', error);
    return NextResponse.json({ error: 'Erro ao salvar produto no catálogo.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN' || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sku, item, categoria, ativo } = body;

    if (!sku) {
      return NextResponse.json({ error: 'SKU é obrigatório.' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (item) dataToUpdate.item = String(item).trim();
    if (categoria) dataToUpdate.categoria = String(categoria).trim();
    if (typeof ativo === 'boolean') dataToUpdate.ativo = ativo;

    const updated = await prisma.product.update({
      where: { sku: String(sku) },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto.' }, { status: 500 });
  }
}
