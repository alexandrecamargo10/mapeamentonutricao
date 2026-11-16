import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isAdminRole } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role) || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  const stores = await prisma.store.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: {
        select: {
          validityRecords: {
            where: { status: 'EM_MONITORAMENTO' },
          },
        },
      },
    },
  });

  const formatted = stores.map((s) => ({
    id: s.id,
    nome: s.nome,
    ativo: s.ativo,
    itensMonitorados: s._count.validityRecords,
  }));

  return NextResponse.json({ stores: formatted });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role) || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, nome } = body;

    if (!id || !nome) {
      return NextResponse.json({ error: 'Código (ID) e Nome da loja são obrigatórios.' }, { status: 400 });
    }

    const cleanId = String(id).trim();
    const cleanNome = String(nome).trim().toUpperCase();

    const existing = await prisma.store.findUnique({ where: { id: cleanId } });
    if (existing) {
      return NextResponse.json({ error: `Já existe uma loja cadastrada com o código ${cleanId}.` }, { status: 409 });
    }

    const newStore = await prisma.store.create({
      data: {
        id: cleanId,
        nome: cleanNome,
        ativo: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        acao: 'CADASTRO_LOJA',
        userId: session.userId,
        storeId: newStore.id,
        detalhes: JSON.stringify({ id: newStore.id, nome: newStore.nome }),
      },
    });

    return NextResponse.json({ success: true, store: newStore });
  } catch (error: any) {
    console.error('Erro ao criar loja:', error);
    return NextResponse.json({ error: 'Erro interno ao criar loja.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role) || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, nome, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da loja é obrigatório.' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (nome) dataToUpdate.nome = String(nome).trim().toUpperCase();
    if (typeof ativo === 'boolean') dataToUpdate.ativo = ativo;

    const updated = await prisma.store.update({
      where: { id: String(id) },
      data: dataToUpdate,
    });

    await prisma.auditLog.create({
      data: {
        acao: 'EDICAO_LOJA',
        userId: session.userId,
        storeId: updated.id,
        detalhes: JSON.stringify(dataToUpdate),
      },
    });

    return NextResponse.json({ success: true, store: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar loja:', error);
    return NextResponse.json({ error: 'Erro ao atualizar loja.' }, { status: 500 });
  }
}
