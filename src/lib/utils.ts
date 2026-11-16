import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type FaixaAlerta = 'VENCIDO' | 'CRITICO' | 'ATENCAO' | 'REGULAR' | 'BAIXADO';

export function calcularDiasRestantes(dataValidade: Date | string): number {
  const dVal = new Date(dataValidade);
  const hoje = new Date();

  // Reset hours to midnight for exact day comparison
  const dValZero = new Date(dVal.getFullYear(), dVal.getMonth(), dVal.getDate()).getTime();
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();

  const diffMs = dValZero - hojeZero;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function classificarFaixa(diasRestantes: number, status: string): FaixaAlerta {
  if (status !== 'EM_MONITORAMENTO') {
    return 'BAIXADO';
  }
  if (diasRestantes < 0) {
    return 'VENCIDO';
  }
  if (diasRestantes <= 7) {
    return 'CRITICO';
  }
  if (diasRestantes <= 30) {
    return 'ATENCAO';
  }
  return 'REGULAR';
}

export function formatarDataBr(data: Date | string | null | undefined): string {
  if (!data) return '-';
  const d = new Date(data);
  if (isNaN(d.getTime())) return '-';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function getFaixaBadgeInfo(faixa: FaixaAlerta): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
} {
  switch (faixa) {
    case 'VENCIDO':
      return {
        label: 'Vencido',
        bgClass: 'bg-red-100',
        textClass: 'text-red-800',
        borderClass: 'border-red-300',
        dotColor: 'bg-red-600',
      };
    case 'CRITICO':
      return {
        label: 'Crítico (≤ 7 dias)',
        bgClass: 'bg-orange-100',
        textClass: 'text-orange-800',
        borderClass: 'border-orange-300',
        dotColor: 'bg-orange-500',
      };
    case 'ATENCAO':
      return {
        label: 'Atenção (≤ 30 dias)',
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-300',
        dotColor: 'bg-amber-500',
      };
    case 'REGULAR':
      return {
        label: 'Em dia (> 30 dias)',
        bgClass: 'bg-emerald-100',
        textClass: 'text-emerald-800',
        borderClass: 'border-emerald-300',
        dotColor: 'bg-emerald-600',
      };
    case 'BAIXADO':
      return {
        label: 'Baixado',
        bgClass: 'bg-slate-100',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-300',
        dotColor: 'bg-slate-400',
      };
  }
}
