import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Fetch full details from database to keep permissions fresh
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      userStores: {
        include: {
          store: true,
        },
      },
    },
  });

  if (!user || user.status !== 'APROVADO') {
    return NextResponse.json({ authenticated: false, status: user?.status }, { status: 403 });
  }

  // If admin, they can access all stores
  let authorizedStores: { id: string; nome: string }[] = [];
  if (user.role === 'ADMIN') {
    authorizedStores = await prisma.store.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
  } else {
    authorizedStores = user.userStores.map((us) => ({
      id: us.store.id,
      nome: us.store.nome,
    }));
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      status: user.status,
      stores: authorizedStores,
    },
  });
}
