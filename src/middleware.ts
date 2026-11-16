import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'cp_validades_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // 1. Proteção contra CSRF (Cross-Site Request Forgery) em rotas de API que alteram estado
  if (pathname.startsWith('/api/') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: 'Requisição bloqueada por política de segurança (CSRF Origin Mismatch).' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Cabeçalho Origin inválido.' },
          { status: 403 }
        );
      }
    }
  }

  // 2. Proteção rápida de rotas privadas no servidor (antes de carregar JS no cliente)
  const isProtectedPage = pathname.startsWith('/admin') || pathname.startsWith('/loja');
  if (isProtectedPage) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/loja/:path*', '/api/:path*'],
};
