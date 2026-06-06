'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Landmark, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

interface FundAccount {
  id?: number;
  name: string;
  amount: number;
}

interface PlanningFund {
  id?: number;
  name: string;
  annualTarget: number;
  targetDate?: string | null;
  linkedFundAccountId?: number | null;
  linkedFundName?: string | null;
  linkedFundAmount?: number | null;
  includeInSavingsPlan?: boolean | number;
}

const emptyForm = {
  name: '',
  annualTarget: '',
  targetDate: '',
  linkedFundAccountId: '',
  includeInSavingsPlan: true,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function isIncluded(value: PlanningFund['includeInSavingsPlan']) {
  return value === true || value === 1 || value === undefined;
}

export default function PlanningFundsManagement() {
  const [planningFunds, setPlanningFunds] = useState<PlanningFund[]>([]);
  const [fundAccounts, setFundAccounts] = useState<FundAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  async function fetchData() {
    try {
      setLoading(true);
      const response = await fetch('/api/planning-funds');
      if (!response.ok) throw new Error('Failed to fetch planning funds');
      const data = await response.json();
      setPlanningFunds(data.planningFunds || []);
      setFundAccounts(data.fundAccounts || []);
    } catch (error) {
      console.error('Error fetching planning funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to load planning funds',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const summary = useMemo(() => {
    const included = planningFunds.filter(fund => isIncluded(fund.includeInSavingsPlan));
    const annualTarget = included.reduce((sum, fund) => sum + Number(fund.annualTarget || 0), 0);
    const linkedCash = planningFunds.reduce((sum, fund) => sum + Number(fund.linkedFundAmount || 0), 0);

    return {
      annualTarget,
      monthlyContribution: annualTarget / 12,
      linkedCash,
      gap: Math.max(0, annualTarget - linkedCash),
    };
  }, [planningFunds]);

  function resetForm() {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(fund: PlanningFund) {
    setFormData({
      name: fund.name,
      annualTarget: String(fund.annualTarget),
      targetDate: fund.targetDate || '',
      linkedFundAccountId: fund.linkedFundAccountId ? String(fund.linkedFundAccountId) : '',
      includeInSavingsPlan: isIncluded(fund.includeInSavingsPlan),
    });
    setEditingId(fund.id || null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Planning fund name is required' });
      return;
    }

    const annualTarget = Number(formData.annualTarget);
    if (!Number.isFinite(annualTarget) || annualTarget < 0) {
      toast({ title: 'Error', description: 'Annual target must be a positive number' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        annualTarget,
        targetDate: formData.targetDate || null,
        linkedFundAccountId: formData.linkedFundAccountId || null,
        includeInSavingsPlan: formData.includeInSavingsPlan,
      };
      const response = await fetch('/api/planning-funds', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save planning fund');
      }

      toast({
        title: 'Success',
        description: editingId ? 'Planning fund updated' : 'Planning fund created',
      });
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving planning fund:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save planning fund',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this planning fund?')) return;

    try {
      const response = await fetch(`/api/planning-funds?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete planning fund');
      }

      toast({ title: 'Success', description: 'Planning fund deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting planning fund:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete planning fund',
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Planning Funds</h2>
            <p className="text-sm text-slate-500">Sinking-fund targets for projections and future planned spend.</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <PiggyBank className="h-4 w-4" />
              Annual plan
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.annualTarget)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              Monthly pace
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.monthlyContribution)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Landmark className="h-4 w-4" />
              Linked cash
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(summary.linkedCash)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Annual gap</div>
            <p className={`mt-2 text-2xl font-semibold ${summary.gap > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatCurrency(summary.gap)}</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-950">{editingId ? 'Edit Planning Fund' : 'Add Planning Fund'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <Input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="Vacation" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Annual target</label>
                <Input type="number" min="0" step="0.01" value={formData.annualTarget} onChange={(event) => setFormData({ ...formData, annualTarget: event.target.value })} placeholder="10000" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Target date</label>
                <Input type="date" value={formData.targetDate} onChange={(event) => setFormData({ ...formData, targetDate: event.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Linked cash fund</label>
                <select
                  value={formData.linkedFundAccountId}
                  onChange={(event) => setFormData({ ...formData, linkedFundAccountId: event.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">No cash fund</option>
                  {fundAccounts.map((fund) => (
                    <option key={fund.id} value={fund.id}>{fund.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={formData.includeInSavingsPlan}
                onChange={(event) => setFormData({ ...formData, includeInSavingsPlan: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
              />
              Include in savings projection
            </label>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editingId ? 'Update Plan' : 'Add Plan'}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {planningFunds.length === 0 ? (
          <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
            <PiggyBank className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">No planning funds yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {planningFunds.map((fund) => {
              const annualTarget = Number(fund.annualTarget || 0);
              const linkedAmount = Number(fund.linkedFundAmount || 0);
              const gap = Math.max(0, annualTarget - linkedAmount);

              return (
                <div key={fund.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-950">{fund.name}</h4>
                      {isIncluded(fund.includeInSavingsPlan) ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Projection</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">Tracking only</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatCurrency(annualTarget)}/yr, {formatCurrency(annualTarget / 12)}/mo
                      {fund.targetDate ? `, target ${fund.targetDate}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {fund.linkedFundName ? `${fund.linkedFundName}: ${formatCurrency(linkedAmount)} saved` : 'No linked cash fund'}
                      {gap > 0 ? `, ${formatCurrency(gap)} annual gap` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(fund)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fund.id && handleDelete(fund.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
