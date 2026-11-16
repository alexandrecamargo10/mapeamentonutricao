import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSession,
  hashPassword,
  verifyPassword,
  invalidateSessionCache,
  isAdminRole,
  isSuperAdminRole,
} from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role) || session.status !== 'APROVADO') {
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
      telefone: true,
      avatarUrl: true,
      role: true,
      status: true,
      mustChangePassword: true,
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
  if (!session || !isAdminRole(session.role) || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso restrito para administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, action, role, storeIds, newPassword, adminCurrentPassword } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId e action são obrigatórios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const targetRole = role || user.role;

    // 1. Proteção contra auto-bloqueio, auto-exclusão ou auto-rebaixamento
    if (
      user.id === session.userId &&
      (action === 'REJEITAR' ||
        action === 'SUSPENDER' ||
        action === 'EXCLUIR' ||
        (role && role !== session.role))
    ) {
      return NextResponse.json(
        {
          error:
            'Operação bloqueada: você não pode excluir, desativar ou alterar o nível de permissão da sua própria conta.',
        },
        { status: 400 }
      );
    }

    // 2. Opção 1: Hierarquia SUPER_ADMIN vs ADMIN
    // Apenas um SuperAdmin pode promover ou despromover alguém a SuperAdmin
    if (
      (targetRole === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') &&
      !isSuperAdminRole(session.role)
    ) {
      return NextResponse.json(
        {
          error:
            'Acesso negado: apenas um Super Admin pode promover, despromover ou gerenciar um Super Admin.',
        },
        { status: 403 }
      );
    }

    // Um ADMIN comum não pode gerenciar (alterar senha, excluir, suspender ou promover) outros Administradores
    if (
      !isSuperAdminRole(session.role) &&
      (isAdminRole(user.role) || isAdminRole(targetRole))
    ) {
      return NextResponse.json(
        {
          error:
            'Acesso negado: Administradores comuns só podem gerenciar contas e senhas de Estagiários. Apenas o Super Admin pode gerenciar Administradores.',
        },
        { status: 403 }
      );
    }

    // 3. Opção 2: Reautenticação obrigatória do Super Admin ao redefinir a senha de outro Administrador
    const isChangingPassword =
      action === 'ALTERAR_SENHA' || Boolean(newPassword && String(newPassword).trim().length > 0);

    if (isChangingPassword && isAdminRole(user.role) && user.id !== session.userId) {
      if (!adminCurrentPassword) {
        return NextResponse.json(
          {
            error:
              'Por segurança, confirme a SUA senha atual de Super Admin para redefinir a senha de outro Administrador.',
          },
          { status: 400 }
        );
      }

      const currentAdminDb = await prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (
        !currentAdminDb ||
        !(await verifyPassword(String(adminCurrentPassword), currentAdminDb.passwordHash))
      ) {
        return NextResponse.json(
          { error: 'A sua senha de Super Admin informada está incorreta.' },
          { status: 401 }
        );
      }
    }

    if (action === 'ALTERAR_SENHA') {
      if (!newPassword || String(newPassword).length < 6) {
        return NextResponse.json(
          { error: 'A senha provisória deve ter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(String(newPassword));
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: true, // Opção 2: Marca senha como provisória (exige troca no próximo login)
        },
      });
      invalidateSessionCache(user.id);

      await prisma.auditLog.create({
        data: {
          acao: 'ALTERACAO_SENHA_PROVISORIA_POR_ADMIN',
          userId: session.userId,
          detalhes: JSON.stringify({
            alvoUserId: user.id,
            email: user.email,
            alvoRole: user.role,
            mustChangePassword: true,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Senha provisória definida para ${user.nome}! No próximo login, o sistema solicitará que o usuário escolha uma senha pessoal definitiva.`,
      });
    }

    if (action === 'EXCLUIR') {
      await prisma.auditLog.create({
        data: {
          acao: 'EXCLUSAO_USUARIO',
          userId: session.userId,
          detalhes: JSON.stringify({
            alvoUserId: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role,
          }),
        },
      });
      await prisma.user.delete({
        where: { id: user.id },
      });
      invalidateSessionCache(user.id);
      return NextResponse.json({
        success: true,
        message: 'Usuário excluído permanentemente com sucesso.',
      });
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
      const validRoles = ['SUPER_ADMIN', 'ADMIN', 'ESTAGIARIO_PADRAO', 'ESTAGIARIO_360'];
      if (!validRoles.includes(targetRole)) {
        return NextResponse.json({ error: 'Perfil de usuário inválido.' }, { status: 400 });
      }

      if (newPassword && String(newPassword).length < 6) {
        return NextResponse.json(
          { error: 'A nova senha provisória deve ter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

      const targetStores: string[] = Array.isArray(storeIds)
        ? Array.from(new Set(storeIds.map((s) => String(s).trim()).filter(Boolean)))
        : [];

      // Enforce business rules for interns
      if (targetRole === 'ESTAGIARIO_PADRAO') {
        if (targetStores.length !== 1) {
          return NextResponse.json(
            {
              error:
                'O Estagiário Padrão deve possuir exatamente 1 loja atribuída. Para múltiplas lojas, utilize o perfil Estagiário 360.',
            },
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

      const extraPasswordData: Record<string, any> = {};
      if (newPassword && String(newPassword).trim().length >= 6) {
        extraPasswordData.passwordHash = await hashPassword(String(newPassword));
        extraPasswordData.mustChangePassword = true;
      }

      const updatedUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: {
            role: targetRole,
            status: 'APROVADO',
            aprovadoPor: session.userId,
            dataAprovacao: new Date(),
            ...extraPasswordData,
          },
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            avatarUrl: true,
            role: true,
            status: true,
            mustChangePassword: true,
            aprovadoPor: true,
            dataAprovacao: true,
          },
        });

        await tx.userStore.deleteMany({ where: { userId: user.id } });
        if (!isAdminRole(targetRole) && targetStores.length > 0) {
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
              roleAnterior: user.role,
              novoRole: targetRole,
              lojas: targetStores,
              senhaRedefinida: Boolean(extraPasswordData.passwordHash),
            }),
          },
        });

        return u;
      });

      invalidateSessionCache(user.id);

      return NextResponse.json({
        success: true,
        message:
          action === 'APROVAR'
            ? 'Usuário aprovado com sucesso!'
            : 'Usuário atualizado com sucesso!',
        user: updatedUser,
      });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao processar usuário.' }, { status: 500 });
  }
}
