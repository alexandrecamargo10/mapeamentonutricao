// Utilitário seguro de estado de UI em memória para transições instantâneas entre páginas.
// Nota de Segurança: Toda validação de permissão e isolamento (RLS) continua sendo
// executada obrigatoriamente no servidor via Cookie HttpOnly em cada rota de API.

let cachedClientUser: any = null;
let cachedAt = 0;
const CLIENT_CACHE_TTL_MS = 15000; // Revalida em segundo plano a cada 15s

export function getCachedClientUser() {
  return cachedClientUser;
}

export function setCachedClientUser(user: any) {
  cachedClientUser = user;
  cachedAt = Date.now();
}

export function clearCachedClientUser() {
  cachedClientUser = null;
  cachedAt = 0;
}

export async function fetchClientUser(forceRefresh = false): Promise<any | null> {
  if (!forceRefresh && cachedClientUser && Date.now() - cachedAt < CLIENT_CACHE_TTL_MS) {
    return cachedClientUser;
  }

  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      clearCachedClientUser();
      return null;
    }
    const data = await res.json();
    if (!data.authenticated || !data.user) {
      clearCachedClientUser();
      return null;
    }
    setCachedClientUser(data.user);
    return data.user;
  } catch {
    return cachedClientUser;
  }
}
