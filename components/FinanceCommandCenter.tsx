'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';

type Severity = 'good' | 'info' | 'warning' | 'danger';

type ValidationData = {
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
    periodType: 'weekly' | 'biweekly' | 'month';
    daysInPeriod: number;
  };
  status: {
    state: 'aligned' | 'surplus' | 'short';
    label: string;
    message: string;
  };
  checking: {
    rawBalance: number;
    adjustedBalance: number;
    unpaidBills: number;
    completedTodayBills: number;
    pendingTips: number;
    pendingCashback: number;
    creditCardPending: number;
  };
  budget: {
    baseRemaining: number;
    additionalBudget: number;
    workingBudget: number;
    variance: number;
    totalAllocated: number;
    totalMonthlyAllocated: number;
    totalSpent: number;
    totalRawSpent: number;
    totalCashBack: number;
    totalAdjustedSpent: number;
    dailySpend: Array<{
      date: string;
      spent: number;
      planned: number;
    }>;
  };
  assets: {
    latest?: {
      interest?: number;
    };
    cash: number;
    interest: number;
    checking: number;
    liquidCash: number;
    savings: number;
    stocks: number;
    retirement401k: number;
    netWorth: number;
  };
  investments: {
    holdings: Array<{ id?: number; symbol: string; name: string; shares: number; currentPrice?: number; avgPrice: number }>;
    totalValue: number;
    totalGainLoss: number;
    dayChange: number;
    dayChangePercent: number;
  };
  funds: {
    accounts: Array<{ id?: number; name: string; amount: number; isInvesting?: boolean; color?: string }>;
    savingsTotal: number;
    investingTotal: number;
  };
  debt: {
    cards: Array<{ id?: number; name: string; balance: number; limit: number; color?: string }>;
    totalBalance: number;
    totalLimit: number;
    utilization: number;
  };
  categories: Array<{
    id: number;
    name: string;
    color: string;
    allocatedAmount: number;
    adjustedSpent: number;
    remaining: number;
    usedPercent: number;
  }>;
  pendingBills: Array<{
    id: number;
    name: string;
    amount: number;
    formattedDate?: string;
    isCompleted?: boolean;
    isManual?: boolean;
  }>;
  recentTransactions: Array<{
    id: number;
    date: string;
    name: string;
    amount: number;
    cashBack?: number;
    cashbackPosted?: boolean;
    pending?: boolean;
    pendingTipAmount?: number;
    category?: { name: string; color: string };
  }>;
  additionalBudgetItems: Array<{ id?: number; amount: number; description: string }>;
  needsAttention: Array<{ title: string; description: string; severity: Severity }>;
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatCurrency(value: number) {
  return currency.format(value || 0);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function statusClasses(state: ValidationData['status']['state']) {
  if (state === 'aligned') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (state === 'short') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

function BudgetLineGraph({
  points,
  budgetUsedPercent,
}: {
  points: ValidationData['budget']['dailySpend'];
  budgetUsedPercent: number;
}) {
  const width = 520;
  const height = 150;
  const padding = 14;
  const chartPoints = points.length > 0 ? points : [{ date: '', spent: 0, planned: 0 }];
  const maxValue = Math.max(1, ...chartPoints.flatMap((point) => [point.spent, point.planned]));

  const toPoint = (value: number, index: number) => {
    const x = chartPoints.length <= 1
      ? padding
      : padding + (index / (chartPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const spentLine = chartPoints.map((point, index) => toPoint(point.spent, index)).join(' ');
  const plannedLine = chartPoints.map((point, index) => toPoint(point.planned, index)).join(' ');
  const latest = chartPoints[chartPoints.length - 1];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Budget Used</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">{budgetUsedPercent}%</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>{formatCurrency(latest?.spent || 0)} spent</p>
          <p>{formatCurrency(latest?.planned || 0)} pace</p>
        </div>
      </div>
      <div className="mt-4 h-40">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Budget used line graph" className="h-full w-full overflow-visible">
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
          <polyline points={plannedLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" />
          <polyline points={spentLine} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full bg-slate-950" />Used</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full border-t border-dashed border-slate-400" />Pace</span>
      </div>
    </div>
  );
}

function BudgetCategoryTable({
  categories,
}: {
  categories: ValidationData['categories'];
}) {
  const visibleCategories = categories
    .filter((category) => category.allocatedAmount > 0 || category.adjustedSpent > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Categories</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Budget Breakdown</h2>
        </div>
        <Link href="/budget" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-950">
          Budget
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-semibold uppercase text-slate-500">
        <span>Category</span>
        <span className="text-right">Spent</span>
        <span className="text-right">Left</span>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleCategories.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No budget categories are active for this period.</p>
        ) : (
          visibleCategories.map((category) => {
            const usedPercent = Math.max(0, Math.min(category.usedPercent, 100));
            const overspent = category.remaining < 0;

            return (
              <div key={category.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color || '#0f172a' }}
                    />
                    <p className="truncate text-sm font-semibold text-slate-950">{category.name}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${overspent ? 'bg-rose-500' : 'bg-slate-950'}`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-right text-sm font-medium text-slate-950">{formatCurrency(category.adjustedSpent)}</p>
                <p className={`text-right text-sm font-semibold ${overspent ? 'text-rose-600' : 'text-slate-950'}`}>
                  {formatCurrency(category.remaining)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function HubMetric({
  label,
  value,
  detail,
  href,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <Link
      href={href}
      className="group rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
          {icon}
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-700" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>
    </Link>
  );
}

export default function FinanceCommandCenter() {
  const [data, setData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetDescription, setNewBudgetDescription] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [liveTodayChange, setLiveTodayChange] = useState<{ amount: number; percent: number } | null>(null);

  const fetchValidation = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/budget-validation', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load budget validation');
      setData(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  useEffect(() => {
    async function fetchLiveTodayChange() {
      if (!data || data.investments.holdings.length === 0) {
        setLiveTodayChange(null);
        return;
      }

      const holdings = data.investments.holdings;
      const totalValue = holdings.reduce(
        (sum, holding) => sum + holding.shares * (holding.currentPrice || holding.avgPrice),
        0
      );

      let totalChange = 0;
      let weightedPercent = 0;

      await Promise.all(
        holdings.map(async (holding) => {
          try {
            const response = await fetch(`/api/stock-price?symbol=${encodeURIComponent(holding.symbol)}`, {
              cache: 'no-store',
            });

            if (!response.ok) return;

            const quote = await response.json();
            if (typeof quote.change !== 'number') return;

            totalChange += quote.change * holding.shares;

            if (typeof quote.changePercent === 'number' && totalValue > 0) {
              const holdingValue = holding.shares * (holding.currentPrice || holding.avgPrice);
              weightedPercent += (holdingValue / totalValue) * quote.changePercent;
            }
          } catch {
            // Keep the fallback if live quote lookup fails.
          }
        })
      );

      setLiveTodayChange({
        amount: totalChange,
        percent: weightedPercent,
      });
    }

    fetchLiveTodayChange();
  }, [data]);

  const budgetUsedPercent = useMemo(() => {
    if (!data || data.budget.totalAllocated <= 0) return 0;
    return Math.min(Math.round((data.budget.totalAdjustedSpent / data.budget.totalAllocated) * 100), 999);
  }, [data]);

  const cashSavings = useMemo(() => {
    if (!data) return 0;
    return data.assets.cash;
  }, [data]);

  const stockTodayDetail = useMemo(() => {
    if (!data) return '';
    const change = liveTodayChange?.amount ?? data.investments.dayChange;
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${formatCurrency(change)} today`;
  }, [data, liveTodayChange]);

  const addAdditionalBudget = async () => {
    const amount = parseFloat(newBudgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setSavingBudget(true);
    try {
      const response = await fetch('/api/additional-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: newBudgetDescription.trim() || 'Additional Budget',
        }),
      });

      if (!response.ok) throw new Error('Failed to add additional budget');
      setNewBudgetAmount('');
      setNewBudgetDescription('');
      await fetchValidation();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to add additional budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const removeAdditionalBudget = async (id?: number) => {
    if (!id) return;

    setSavingBudget(true);
    try {
      const response = await fetch(`/api/additional-budget?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove additional budget');
      await fetchValidation();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to remove additional budget');
    } finally {
      setSavingBudget(false);
    }
  };

  if (loading) {
    return (
      <PageShell maxWidth="7xl">
        <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading dashboard
          </div>
        </div>
      </PageShell>
    );
  }

  if (error && !data) {
    return (
      <PageShell maxWidth="7xl">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <p className="font-semibold">Dashboard could not load</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={fetchValidation}
            className="mt-4 inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  if (!data) return null;

  const aligned = data.status.state === 'aligned';

  return (
    <PageShell maxWidth="7xl" className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(data.status.state)}`}>
              {aligned ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />}
              {data.status.label}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {formatDate(data.period.startDate)} to {formatDate(data.period.endDate)}
            </span>
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950 sm:text-3xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Spendable cash, budget pace, and category pressure in one view.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={fetchValidation}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            title="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/cashflow"
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Cashflow
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
          <p className="text-sm font-medium text-slate-300">Available to spend</p>
          <p className="mt-4 text-5xl font-semibold tracking-normal">{formatCurrency(data.checking.adjustedBalance)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-sm">
            <div>
              <p className="text-slate-400">Budget left</p>
              <p className="mt-1 font-semibold text-white">{formatCurrency(data.budget.workingBudget)}</p>
            </div>
            <div>
              <p className="text-slate-400">Spent</p>
              <p className="mt-1 font-semibold text-white">{formatCurrency(data.budget.totalAdjustedSpent)}</p>
            </div>
          </div>
        </div>

        <BudgetLineGraph points={data.budget.dailySpend} budgetUsedPercent={budgetUsedPercent} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <BudgetCategoryTable categories={data.categories} />

        <details className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-950 marker:hidden">
            <span>Additional Budget</span>
            <span className="text-sm font-medium text-slate-500">{formatCurrency(data.budget.additionalBudget)}</span>
          </summary>
          <div className="border-t border-slate-200 p-4">
            <div className="grid gap-2 sm:grid-cols-[0.75fr_1fr_auto]">
              <input
                value={newBudgetAmount}
                onChange={(event) => setNewBudgetAmount(event.target.value)}
                inputMode="decimal"
                placeholder="Amount"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition-colors focus:border-slate-400"
              />
              <input
                value={newBudgetDescription}
                onChange={(event) => setNewBudgetDescription(event.target.value)}
                placeholder="Description"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition-colors focus:border-slate-400"
              />
              <button
                onClick={addAdditionalBudget}
                disabled={savingBudget}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                title="Add budget"
              >
                {savingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {data.additionalBudgetItems.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No active additional budget items.
                </p>
              ) : (
                data.additionalBudgetItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-950">{item.description}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(item.amount)}</p>
                    </div>
                    <button
                      onClick={() => removeAdditionalBudget(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      title="Remove additional budget"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
      </section>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HubMetric
          label="Net Worth"
          value={formatCurrency(data.assets.netWorth)}
          detail={`Includes ${formatCurrency(data.assets.retirement401k)} in retirement`}
          href="/accounts"
          icon={<WalletCards className="h-5 w-5" />}
          tone="slate"
        />
        <HubMetric
          label="Stocks"
          value={formatCurrency(data.investments.totalValue || data.assets.stocks)}
          detail={`${data.investments.holdings.length} holdings, ${stockTodayDetail}`}
          href="/accounts"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
        />
        <HubMetric
          label="Cash Savings"
          value={formatCurrency(cashSavings)}
          detail={`${data.funds.accounts.length} fund buckets tracked`}
          href="/accounts"
          icon={<Landmark className="h-5 w-5" />}
          tone="sky"
        />
        <HubMetric
          label="Card Debt"
          value={formatCurrency(data.debt.totalBalance)}
          detail={`${data.debt.utilization.toFixed(1)}% utilization`}
          href="/accounts"
          icon={<CreditCard className="h-5 w-5" />}
          tone={data.debt.utilization > 70 ? 'rose' : data.debt.utilization > 30 ? 'amber' : 'emerald'}
        />
      </section>
    </PageShell>
  );
}
