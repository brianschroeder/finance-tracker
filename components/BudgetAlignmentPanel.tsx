'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';

type BudgetValidationSummary = {
  status: {
    state: 'aligned' | 'surplus' | 'short';
    label: string;
    message: string;
  };
  checking: {
    rawBalance: number;
    adjustedBalance: number;
    unpaidBills: number;
    pendingTips: number;
    pendingCashback: number;
  };
  budget: {
    baseRemaining: number;
    additionalBudget: number;
    workingBudget: number;
    variance: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function money(value: number) {
  return currency.format(value || 0);
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function BudgetAlignmentPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<BudgetValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const response = await fetch('/api/budget-validation', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load validation');
      setData(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load validation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading alignment
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <div className="flex items-center justify-between gap-3">
          <span>{error || 'Validation unavailable'}</span>
          <button onClick={load} className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-white">
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const aligned = data.status.state === 'aligned';
  const statusClass = aligned
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : data.status.state === 'short'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
              {aligned ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />}
              {data.status.label}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {dateLabel(data.period.startDate)} to {dateLabel(data.period.endDate)}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">Checking Alignment</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {data.status.message}
          </p>
        </div>
        <Link
          href="/cashflow"
          className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Reconcile
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Checking', data.checking.rawBalance],
          ['Adjusted', data.checking.adjustedBalance],
          ['Working Budget', data.budget.workingBudget],
          ['Variance', data.budget.variance],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{label as string}</p>
            <p className={`mt-1 text-xl font-semibold ${label === 'Variance' && (value as number) < -0.01 ? 'text-rose-600' : 'text-slate-950'}`}>
              {money(value as number)}
            </p>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
          <div>Unpaid bills: <span className="font-semibold text-slate-950">{money(data.checking.unpaidBills)}</span></div>
          <div>Tip adjustments: <span className="font-semibold text-slate-950">{money(data.checking.pendingTips)}</span></div>
          <div>Pending cashback: <span className="font-semibold text-slate-950">{money(data.checking.pendingCashback)}</span></div>
          <div>Additional budget: <span className="font-semibold text-slate-950">{money(data.budget.additionalBudget)}</span></div>
        </div>
      )}
    </section>
  );
}
