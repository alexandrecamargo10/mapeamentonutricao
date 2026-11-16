import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q) {
    // Return sample top 20 active products
    const sample = await prisma.product.findMany({
      where: { ativo: true },
      take: 20,
      orderBy: { item: 'asc' },
    });
    return NextResponse.json({ products: sample });
  }

  // SQLite search by SKU prefix or item contains
  const products = await prisma.product.findMany({
    where: {
      ativo: true,
      OR: [
        { sku: { contains: q } },
        { item: { contains: q } },
        { categoria: { contains: q } },
      ],
    },
    take: 30,
    orderBy: { item: 'asc' },
  });

  return NextResponse.json({ products });
}
