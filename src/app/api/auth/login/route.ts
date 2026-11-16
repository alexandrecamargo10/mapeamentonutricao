import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

// Proteção contra ataques de Força Bruta (Rate Limiting por IP/Email)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'local';
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const attemptKey = `${ip}:${cleanEmail}`;

    // Verifica se o IP/Email está temporariamente bloqueado por excesso de tentativas
    const record = loginAttempts.get(attemptKey);
    if (record && record.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((record.lockUntil - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Muitas tentativas falhas. Tente novamente em ${minutesLeft} minuto(s).` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        userStores: {
          where: { store: { ativo: true } },
          select: {
            storeId: true,
            store: { select: { id: true, nome: true } },
          },
        },
      },
    });

    if (!user) {
      registerFailedAttempt(attemptKey);
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(String(password), user.passwordHash);
    if (!passwordMatch) {
      registerFailedAttempt(attemptKey);
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    // Limpa contador de falhas após autenticação bem-sucedida
    loginAttempts.delete(attemptKey);

    // Check account status
    if (user.status === 'PENDENTE') {
      return NextResponse.json(
        {
          error: 'PENDENTE',
          message: 'Seu cadastro ainda está pendente de aprovação pela administração.',
        },
        { status: 403 }
      );
    }

    if (user.status === 'REJEITADO' || user.status === 'INATIVO') {
      return NextResponse.json(
        {
          error: 'BLOQUEADO',
          message: 'Seu acesso foi desativado ou recusado pela administração.',
        },
        { status: 403 }
      );
    }

    const storeIds = user.userStores.map((us) => us.storeId);
    let storeObjects = user.userStores.map((us) => ({
      id: us.store.id,
      nome: us.store.nome,
    }));

    if (user.role === 'ADMIN') {
      storeObjects = await prisma.store.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      });
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role as any,
      status: user.status as any,
      stores: storeIds,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || null,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        status: user.status,
        stores: storeObjects,
      },
    });

    // Set HttpOnly cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 horas (turno de trabalho)
    });

    return response;
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar login.' },
      { status: 500 }
    );
  }
}

function registerFailedAttempt(key: string) {
  const current = loginAttempts.get(key) || { count: 0, lockUntil: 0 };
  const nextCount = current.count + 1;
  loginAttempts.set(key, {
    count: nextCount,
    lockUntil: nextCount >= MAX_ATTEMPTS ? Date.now() + LOCK_TIME_MS : 0,
  });
}
