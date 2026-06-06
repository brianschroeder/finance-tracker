'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Loader2 } from 'lucide-react';
import { MetricCard } from '@/components/FinanceUI';

interface CategoryMerchant {
  name: string;
  amount: number;
  count: number;
}

interface CategoryTransaction {
  id?: number;
  date: string;
  name: string;
  amount: number;
  cashBack: number;
  pending: boolean;
  pendingTipAmount: number;
  creditCardPending: boolean;
}

interface BudgetCategory {
  id: number;
  name: string;
  allocatedAmount: number;
  color: string;
  spent: number;
  adjustedSpent?: number;
  remaining: number;
  topMerchants?: CategoryMerchant[];
  recentTransactions?: CategoryTransaction[];
}

interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalAdjustedSpent?: number;
  totalRemaining: number;
  startDate: string;
  endDate: string;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function money(value: number) {
  return currency.format(value || 0);
}

function dateLabel(dateString: string) {
  const [year, month, day] = dateString.split('-').map((value) => parseInt(value, 10));
  return format(new Date(year, month - 1, day), 'MMM d');
}

function percent(spent: number, allocated: number) {
  if (allocated <= 0) return 0;
  return Math.min(Math.round((spent / allocated) * 100), 999);
}

export default function BudgetAnalysis() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBudgetAnalysis() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/budget-analysis?periodType=biweekly', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch budget analysis');
        const data = await response.json();
        setCategories(data.categories || []);
        setSummary(data.summary || null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    }

    loadBudgetAnalysis();
  }, []);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.remaining - b.remaining);
  }, [categories]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading budget
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!summary || categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">No budget categories yet</p>
        <p className="mt-1 text-sm text-slate-500">Use the Categories tab to create the budget plan.</p>
      </div>
    );
  }

  const spent = summary.totalAdjustedSpent ?? summary.totalSpent;
  const used = percent(spent, summary.totalAllocated);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Current Period"
          value={money(summary.totalAllocated)}
          detail={`${dateLabel(summary.startDate)} to ${dateLabel(summary.endDate)}`}
          tone="slate"
        />
        <MetricCard
          label="Spent"
          value={money(spent)}
          detail={`${used}% of planned budget`}
          tone={used > 90 ? 'rose' : used > 70 ? 'amber' : 'emerald'}
        />
        <MetricCard
          label="Remaining"
          value={money(summary.totalRemaining)}
          detail={summary.totalRemaining >= 0 ? 'Available this period' : 'Over planned budget'}
          tone={summary.totalRemaining >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
          <span>Category</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Left</span>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedCategories.map((category) => {
            const categorySpent = category.adjustedSpent ?? category.spent;
            const categoryPercent = percent(categorySpent, category.allocatedAmount);
            const isSelected = selectedCategoryId === category.id;
            const topMerchants = category.topMerchants || [];
            const recentTransactions = category.recentTransactions || [];
            return (
              <div key={category.id} className="px-4 py-3">
                <button
                  type="button"
                  className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 text-left"
                  aria-expanded={isSelected}
                  onClick={() => setSelectedCategoryId(isSelected ? null : category.id)}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="truncate text-sm font-medium text-slate-950">{category.name}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={category.remaining < 0 ? 'h-full rounded-full bg-rose-500' : 'h-full rounded-full bg-slate-900'}
                        style={{ width: `${Math.min(categoryPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right text-sm font-medium text-slate-700">{money(categorySpent)}</span>
                  <span className={`text-right text-sm font-semibold ${category.remaining < 0 ? 'text-rose-600' : 'text-slate-950'}`}>
                    {money(category.remaining)}
                  </span>
                </button>
                {isSelected && (
                  <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase text-slate-500">Top merchants</p>
                        <p className="text-xs text-slate-400">{money(categorySpent)} total</p>
                      </div>
                      {topMerchants.length > 0 ? (
                        <div className="space-y-2">
                          {topMerchants.map((merchant) => {
                            const merchantPercent = categorySpent > 0 ? Math.min((merchant.amount / categorySpent) * 100, 100) : 0;
                            return (
                              <div key={merchant.name} className="rounded-md bg-slate-50 px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">{merchant.name}</p>
                                    <p className="text-xs text-slate-500">{merchant.count} {merchant.count === 1 ? 'transaction' : 'transactions'}</p>
                                  </div>
                                  <p className="shrink-0 text-sm font-semibold text-slate-950">{money(merchant.amount)}</p>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                                  <div className="h-full rounded-full bg-slate-300" style={{ width: `${merchantPercent}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">No spending in this category for the period.</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Recent spending</p>
                      {recentTransactions.length > 0 ? (
                        <div className="overflow-hidden rounded-md border border-slate-100">
                          {recentTransactions.map((transaction) => {
                            const netAmount = transaction.amount - transaction.cashBack;
                            const transactionKey = transaction.id ?? `${transaction.date}-${transaction.name}-${transaction.amount}`;
                            return (
                              <div key={transactionKey} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
                                <span className="whitespace-nowrap text-xs font-medium text-slate-500">{dateLabel(transaction.date)}</span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">{transaction.name}</p>
                                  {(transaction.pending || transaction.creditCardPending || transaction.cashBack > 0) && (
                                    <p className="text-xs text-slate-500">
                                      {[
                                        transaction.pending ? 'tip pending' : '',
                                        transaction.creditCardPending ? 'card pending' : '',
                                        transaction.cashBack > 0 ? `${money(transaction.cashBack)} cashback` : '',
                                      ].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-slate-950">{money(netAmount)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">No transactions to show.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
