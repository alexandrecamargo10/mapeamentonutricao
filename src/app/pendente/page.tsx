'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

export default function PendentePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user.status === 'APROVADO') {
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/loja');
        }
        return;
      }
      setMessage('Seu cadastro ainda está pendente de aprovação. Por favor, aguarde.');
    } catch (err) {
      setMessage('Erro ao verificar status.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Cadastro em Análise</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Seu cadastro foi realizado com sucesso, mas ainda precisa ser{' '}
            <strong className="text-slate-800">aprovado por um administrador</strong> da equipe de Nutrição Corporativa.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-2">
          <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>O que acontece agora?</span>
          </div>
          <p>
            O administrador irá validar seus dados, configurar sua permissão (Estagiário Padrão ou 360) e vincular a loja em que você atuará.
          </p>
        </div>

        {message && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium">
            {message}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando...' : 'Verificar se já fui aprovado'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Sair / Voltar ao Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
