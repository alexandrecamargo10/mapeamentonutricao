import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'casas-pedro-secret-key-default-2026';
export const AUTH_COOKIE_NAME = 'cp_validades_session';

export interface SessionPayload {
  userId: string;
  email: string;
  nome: string;
  role: 'ADMIN' | 'ESTAGIARIO_PADRAO' | 'ESTAGIARIO_360';
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'INATIVO';
  stores: string[]; // Lista de IDs de lojas autorizadas em tempo real
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Obtém a sessão atual validando o token JWT E revalidando em tempo real no banco de dados.
 * Isso garante revogação imediata caso o usuário seja bloqueado ou tenha suas lojas alteradas.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = verifySessionToken(token);
  if (!decoded?.userId) return null;

  // Revalidação em tempo real no banco de dados (Zero-Trust / Live RLS)
  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      nome: true,
      role: true,
      status: true,
      userStores: {
        where: { store: { ativo: true } },
        select: { storeId: true },
      },
    },
  });

  if (!dbUser) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    nome: dbUser.nome,
    role: dbUser.role as SessionPayload['role'],
    status: dbUser.status as SessionPayload['status'],
    stores: dbUser.userStores.map((us) => us.storeId),
  };
}

export function canAccessStore(session: SessionPayload, storeId: string): boolean {
  if (session.status !== 'APROVADO') return false;
  if (session.role === 'ADMIN') return true;
  return session.stores.includes(storeId);
}

/**
 * Constrói o filtro Row-Level Security (RLS) obrigatório para consultas na tabela ValidityRecord.
 * Garante em nível de banco de dados que usuários comuns nunca leiam registros fora de suas lojas.
 */
export function buildStoreRLSFilter(session: SessionPayload, requestedStoreId?: string | null) {
  if (session.status !== 'APROVADO') {
    throw new Error('FORBIDDEN_UNAPPROVED');
  }

  if (session.role === 'ADMIN') {
    if (requestedStoreId && requestedStoreId !== 'TODAS') {
      return { storeId: requestedStoreId };
    }
    return {};
  }

  // Usuário não-Admin (Estagiário Padrão ou 360)
  if (!session.stores || session.stores.length === 0) {
    throw new Error('FORBIDDEN_NO_STORES');
  }

  if (requestedStoreId) {
    if (!session.stores.includes(requestedStoreId)) {
      throw new Error('FORBIDDEN_STORE_ACCESS');
    }
    return { storeId: requestedStoreId };
  }

  // Se for Estagiário Padrão, força sempre a única loja dele; se 360 sem filtro explícito, restringe às lojas dele
  return {
    storeId: session.role === 'ESTAGIARIO_PADRAO' ? session.stores[0] : { in: session.stores },
  };
}
