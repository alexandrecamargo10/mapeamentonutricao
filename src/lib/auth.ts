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
  telefone?: string | null;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'ESTAGIARIO_PADRAO' | 'ESTAGIARIO_360';
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'INATIVO';
  stores: string[]; // Lista de IDs de lojas autorizadas em tempo real
  storeObjects?: { id: string; nome: string }[];
}

// Micro-cache em memória no servidor (TTL de 3 segundos) para evitar consultas repetidas
// em requisições paralelas (Promise.all), com invalidação imediata em qualquer alteração de permissão.
const sessionCache = new Map<string, { data: SessionPayload; expiresAt: number }>();
const SESSION_CACHE_TTL_MS = 3000;

export function invalidateSessionCache(userId?: string) {
  if (userId) {
    sessionCache.delete(userId);
  } else {
    sessionCache.clear();
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      nome: payload.nome,
      role: payload.role,
      status: payload.status,
      stores: payload.stores,
    },
    JWT_SECRET,
    {
      expiresIn: '12h',
      algorithm: 'HS256',
    }
  );
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Obtém a sessão atual validando o token JWT E revalidando no banco de dados.
 * Garante revogação imediata caso o usuário seja bloqueado ou tenha suas lojas alteradas.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = verifySessionToken(token);
  if (!decoded?.userId) return null;

  const cached = sessionCache.get(decoded.userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Revalidação em tempo real no banco de dados (Zero-Trust / Live RLS) em 1 única query
  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      nome: true,
      telefone: true,
      avatarUrl: true,
      role: true,
      status: true,
      userStores: {
        where: { store: { ativo: true } },
        select: {
          storeId: true,
          store: { select: { id: true, nome: true } },
        },
      },
    },
  });

  if (!dbUser) {
    sessionCache.delete(decoded.userId);
    return null;
  }

  const payload: SessionPayload = {
    userId: dbUser.id,
    email: dbUser.email,
    nome: dbUser.nome,
    telefone: dbUser.telefone,
    avatarUrl: dbUser.avatarUrl,
    role: dbUser.role as SessionPayload['role'],
    status: dbUser.status as SessionPayload['status'],
    stores: dbUser.userStores.map((us) => us.storeId),
    storeObjects: dbUser.userStores.map((us) => ({
      id: us.store.id,
      nome: us.store.nome,
    })),
  };

  sessionCache.set(decoded.userId, {
    data: payload,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });

  return payload;
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
