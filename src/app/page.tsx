import { redirect } from 'next/navigation';
import { getSession, isAdminRole } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.status === 'PENDENTE') {
    redirect('/pendente');
  }

  if (isAdminRole(session.role)) {
    redirect('/admin');
  }

  redirect('/loja');
}
