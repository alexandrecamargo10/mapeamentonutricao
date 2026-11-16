import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, verifyPassword, invalidateSessionCache } from '@/lib/auth';

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, telefone, avatarUrl, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const dataToUpdate: Record<string, any> = {};

    if (typeof nome === 'string') {
      const cleanNome = nome.trim().slice(0, 120);
      if (cleanNome.length < 2) {
        return NextResponse.json(
          { error: 'O nome de exibição deve ter pelo menos 2 caracteres.' },
          { status: 400 }
        );
      }
      dataToUpdate.nome = cleanNome;
    }

    if (telefone !== undefined) {
      dataToUpdate.telefone = telefone ? String(telefone).trim().slice(0, 30) : null;
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        dataToUpdate.avatarUrl = null;
      } else {
        const avatarStr = String(avatarUrl);
        // Aceita Data URL de imagem compacta (até ~300KB) ou URL https
        if (avatarStr.length > 350000) {
          return NextResponse.json(
            { error: 'A imagem selecionada é muito grande. Tente uma imagem menor.' },
            { status: 400 }
          );
        }
        if (
          !avatarStr.startsWith('data:image/') &&
          !avatarStr.startsWith('https://') &&
          !avatarStr.startsWith('http://')
        ) {
          return NextResponse.json(
            { error: 'Formato de imagem inválido.' },
            { status: 400 }
          );
        }
        dataToUpdate.avatarUrl = avatarStr;
      }
    }

    // Alteração de senha pelo próprio usuário
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Informe sua senha atual para poder definir uma nova senha.' },
          { status: 400 }
        );
      }

      const validCurrent = await verifyPassword(String(currentPassword), user.passwordHash);
      if (!validCurrent) {
        return NextResponse.json(
          { error: 'A senha atual informada está incorreta.' },
          { status: 401 }
        );
      }

      if (String(newPassword).length < 6 || String(newPassword).length > 128) {
        return NextResponse.json(
          { error: 'A nova senha deve ter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

      dataToUpdate.passwordHash = await hashPassword(String(newPassword));
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        avatarUrl: true,
        role: true,
        status: true,
      },
    });

    invalidateSessionCache(user.id);

    await prisma.auditLog.create({
      data: {
        acao: 'ATUALIZACAO_PERFIL_PROPRIO',
        userId: user.id,
        detalhes: JSON.stringify({
          nome: updated.nome,
          telefone: updated.telefone,
          alterouFoto: avatarUrl !== undefined,
          alterouSenha: Boolean(newPassword),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      user: updated,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar perfil.' },
      { status: 500 }
    );
  }
}
