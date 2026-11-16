import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

let cachedAllActiveStores: { data: { id: string; nome: string }[]; expiresAt: number } | null = null;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (session.status !== 'APROVADO') {
    return NextResponse.json({ authenticated: false, status: session.status }, { status: 403 });
  }

  let authorizedStores: { id: string; nome: string }[] = [];
  if (session.role === 'ADMIN') {
    if (cachedAllActiveStores && cachedAllActiveStores.expiresAt > Date.now()) {
      authorizedStores = cachedAllActiveStores.data;
    } else {
      authorizedStores = await prisma.store.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      });
      cachedAllActiveStores = {
        data: authorizedStores,
        expiresAt: Date.now() + 15000, // 15s cache para lista estática de lojas
      };
    }
  } else {
    authorizedStores = session.storeObjects || [];
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      nome: session.nome,
      email: session.email,
      role: session.role,
      status: session.status,
      stores: authorizedStores,
    },
  });
}
