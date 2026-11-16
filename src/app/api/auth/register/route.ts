import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, password } = body;

    if (!nome || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanNome = String(nome).trim().slice(0, 120);
    const cleanEmail = String(email).trim().toLowerCase().slice(0, 150);

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Formato de e-mail inválido.' },
        { status: 400 }
      );
    }

    if (String(password).length < 6 || String(password).length > 128) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado no sistema.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(String(password));

    // Garante que todo auto-cadastro nasce estritamente como ESTAGIARIO_PADRAO e PENDENTE (sem lojas)
    const newUser = await prisma.user.create({
      data: {
        nome: cleanNome,
        email: cleanEmail,
        passwordHash,
        role: 'ESTAGIARIO_PADRAO',
        status: 'PENDENTE',
      },
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        acao: 'CADASTRO_USUARIO',
        userId: newUser.id,
        detalhes: JSON.stringify({ email: newUser.email, status: 'PENDENTE' }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
      user: newUser,
    });
  } catch (error: any) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar cadastro.' },
      { status: 500 }
    );
  }
}
