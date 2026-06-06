'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Save, WalletCards } from 'lucide-react';

type CompensationInputs = {
  payAmount: string;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  salary: string;
  bonusPercentage: string;
  yearsOfService: string;
  service401kRate: string;
};

const defaultInputs: CompensationInputs = {
  payAmount: '0',
  payFrequency: 'biweekly',
  salary: '0',
  bonusPercentage: '0',
  yearsOfService: '0',
  service401kRate: '1.5',
};

function numberValue(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CompensationForm() {
  const [inputs, setInputs] = useState<CompensationInputs>(defaultInputs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadIncome() {
      try {
        setLoading(true);
        const response = await fetch('/api/income', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load compensation');
        const data = await response.json();
        setInputs({
          payAmount: String(data.payAmount || 0),
          payFrequency: data.payFrequency || 'biweekly',
          salary: String(data.salary || 0),
          bonusPercentage: String(data.bonusPercentage || 0),
          yearsOfService: String(data.yearsOfService || 0),
          service401kRate: String(data.service401kRate ?? 1.5),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load compensation');
      } finally {
        setLoading(false);
      }
    }

    loadIncome();
  }, []);

  const breakdown = useMemo(() => {
    const salary = numberValue(inputs.salary);
    const bonus = salary * (numberValue(inputs.bonusPercentage) / 100);
    const service401k = salary * numberValue(inputs.yearsOfService) * (numberValue(inputs.service401kRate) / 100);
    const postTaxAnnual = numberValue(inputs.payAmount) * 26;

    return {
      salary,
      bonus,
      service401k,
      postTaxAnnual,
      totalCompensation: salary + bonus + service401k,
    };
  }, [inputs]);

  const setField = (field: keyof CompensationInputs, value: string) => {
    setSaved(false);
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSaved(false);

      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payAmount: numberValue(inputs.payAmount),
          payFrequency: inputs.payFrequency,
          salary: numberValue(inputs.salary),
          workHoursPerWeek: 40,
          workDaysPerWeek: 5,
          bonusPercentage: numberValue(inputs.bonusPercentage),
          yearsOfService: numberValue(inputs.yearsOfService),
          service401kRate: numberValue(inputs.service401kRate),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save compensation');
      setSaved(true);
      window.dispatchEvent(new CustomEvent('incomeChanged', { detail: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save compensation');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5 sm:p-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Compensation saved.
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-slate-950">Compensation</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage post-tax pay for cashflow and annual compensation assumptions for projections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Post-tax annual pay</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{currency(breakdown.postTaxAnnual)}</p>
          <p className="mt-1 text-xs text-slate-500">{currency(numberValue(inputs.payAmount))} x 26 paychecks</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Annual bonus</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{currency(breakdown.bonus)}</p>
          <p className="mt-1 text-xs text-slate-500">{numberValue(inputs.bonusPercentage).toFixed(1)}% of salary</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">401k service contribution</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{currency(breakdown.service401k)}</p>
          <p className="mt-1 text-xs text-slate-500">{numberValue(inputs.service401kRate).toFixed(1)}% x years of service</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Post-tax pay amount</span>
            <input
              value={inputs.payAmount}
              onChange={event => setField('payAmount', event.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Pay frequency</span>
            <select
              value={inputs.payFrequency}
              onChange={event => setField('payFrequency', event.target.value as CompensationInputs['payFrequency'])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">Semimonthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Salary</span>
            <input
              value={inputs.salary}
              onChange={event => setField('salary', event.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Bonus percent of salary</span>
            <input
              value={inputs.bonusPercentage}
              onChange={event => setField('bonusPercentage', event.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Years of service</span>
            <input
              value={inputs.yearsOfService}
              onChange={event => setField('yearsOfService', event.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">401k rate per year of service</span>
            <input
              value={inputs.service401kRate}
              onChange={event => setField('service401kRate', event.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-950">Total annual compensation</p>
              <p className="text-sm text-slate-500">Salary + bonus + service-based 401k contribution</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xl font-semibold text-slate-950">{currency(breakdown.totalCompensation)}</p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <WalletCards className="mr-1.5 h-4 w-4 animate-pulse" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
