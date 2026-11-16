import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Controle de Validades – Casas Pedro',
  description: 'Sistema de monitoramento e controle de validades em rede de lojas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
