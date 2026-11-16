import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, invalidateSessionCache } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN' || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'TODOS';

  const whereClause: any = {};
  if (statusFilter !== 'TODOS') {
    whereClause.status = statusFilter;
  }

  // Oculta estritamente o campo passwordHash da resposta JSON
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      status: true,
      aprovadoPor: true,
      dataAprovacao: true,
      createdAt: true,
      updatedAt: true,
      userStores: {
        include: {
          store: { select: { id: true, nome: true } },
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // PENDENTE will show first
      { createdAt: 'desc' },
    ],
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN' || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, action, role, storeIds } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId e action são obrigatórios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Proteção contra auto-bloqueio ou auto-rebaixamento de administrador
    if (user.id === session.userId && (action === 'REJEITAR' || action === 'SUSPENDER' || (role && role !== 'ADMIN'))) {
      return NextResponse.json(
        { error: 'Operação bloqueada: você não pode desativar ou remover o perfil de administrador da sua própria conta.' },
        { status: 400 }
      );
    }

    if (action === 'REJEITAR') {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'REJEITADO' },
      });
      invalidateSessionCache(user.id);
      await prisma.auditLog.create({
        data: {
          acao: 'REJEICAO_USUARIO',
          userId: session.userId,
          detalhes: JSON.stringify({ alvoUserId: user.id, email: user.email }),
        },
      });
      return NextResponse.json({ success: true, message: 'Usuário rejeitado.' });
    }

    if (action === 'SUSPENDER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'INATIVO' },
      });
      invalidateSessionCache(user.id);
      await prisma.auditLog.create({
        data: {
          acao: 'SUSPENSAO_USUARIO',
          userId: session.userId,
          detalhes: JSON.stringify({ alvoUserId: user.id, email: user.email }),
        },
      });
      return NextResponse.json({ success: true, message: 'Usuário inativado.' });
    }

    if (action === 'APROVAR' || action === 'ATUALIZAR') {
      const validRoles = ['ADMIN', 'ESTAGIARIO_PADRAO', 'ESTAGIARIO_360'];
      const targetRole = role || user.role;
      if (!validRoles.includes(targetRole)) {
        return NextResponse.json({ error: 'Perfil de usuário inválido.' }, { status: 400 });
      }

      const targetStores: string[] = Array.isArray(storeIds)
        ? Array.from(new Set(storeIds.map((s) => String(s).trim()).filter(Boolean)))
        : [];

      // Enforce business rules
      if (targetRole === 'ESTAGIARIO_PADRAO') {
        if (targetStores.length !== 1) {
          return NextResponse.json(
            { error: 'O Estagiário Padrão deve possuir exatamente 1 loja atribuída. Para múltiplas lojas, utilize o perfil Estagiário 360.' },
            { status: 400 }
          );
        }
      } else if (targetRole === 'ESTAGIARIO_360') {
        if (targetStores.length < 1) {
          return NextResponse.json(
            { error: 'Selecione ao menos 1 loja para o Estagiário 360.' },
            { status: 400 }
          );
        }
      }

      // Update user details & store links atomically inside a transaction
      const updatedUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: {
            role: targetRole,
            status: 'APROVADO',
            aprovadoPor: session.userId,
            dataAprovacao: new Date(),
          },
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
            status: true,
            aprovadoPor: true,
            dataAprovacao: true,
          },
        });

        await tx.userStore.deleteMany({ where: { userId: user.id } });
        if (targetRole !== 'ADMIN' && targetStores.length > 0) {
          await tx.userStore.createMany({
            data: targetStores.map((sId) => ({
              userId: user.id,
              storeId: sId,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            acao: action === 'APROVAR' ? 'APROVACAO_USUARIO' : 'ATUALIZACAO_USUARIO',
            userId: session.userId,
            detalhes: JSON.stringify({
              alvoUserId: user.id,
              email: user.email,
              novoRole: targetRole,
              lojas: targetStores,
            }),
          },
        });

        return u;
      });

      invalidateSessionCache(user.id);

      return NextResponse.json({
        success: true,
        message: action === 'APROVAR' ? 'Usuário aprovado com sucesso!' : 'Usuário atualizado com sucesso!',
        user: updatedUser,
      });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao processar usuário.' }, { status: 500 });
  }
}
