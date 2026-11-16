import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.status === 'PENDENTE') {
    redirect('/pendente');
  }

  if (session.role === 'ADMIN') {
    redirect('/admin');
  }

  redirect('/loja');
}
