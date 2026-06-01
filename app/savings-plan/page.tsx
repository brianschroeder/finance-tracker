'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Info, PiggyBank, Receipt, RefreshCcw, Save, Target, WalletCards } from 'lucide-react';
import { PageHeader, PagePanel, PageShell } from '@/components/PageShell';

type ProjectionPoint = {
  age: number;
  year: number;
  phase: 'accumulate' | 'drawdown';
  bridgeAssets: number;
  retirementAssets: number;
  totalAssets: number;
  taxableContribution: number;
  retirementContribution: number;
  withdrawal: number;
};

type NamedAmount = { name: string; value: number };

type SavingsPlanData = {
  settings: {
    currentAge: number;
    targetAge: number;
    annualReturn: number;
    withdrawalRate: number;
    inflationRate: number;
    retirementMonthlyBudget: number;
    retirementAnnualExpenses: number;
    accessAge: number;
    yearsToTarget: number;
  };
  income: {
    annualIncome: number;
    perPaycheck: number;
    payPeriodsPerYear: number;
  };
  netWorth: {
    total: number;
    breakdown: NamedAmount[];
  };
  expenses: {
    monthlyBudget: number;
    monthlyRecurring: number;
    monthlyAdditional: number;
    monthlyExpenses: number;
    annualExpenses: number;
  };
  savings: {
    annualCashWithBonus: number;
    annual401kContribution: number;
    totalAnnualSavings: number;
    savingsRate: number;
  };
  strategy: {
    accessAge: number;
    withdrawalRate: number;
    fiNumber: number;
    bridgeLasts: boolean;
    projection: ProjectionPoint[];
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={text} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-700 focus:text-slate-700">
        <Info className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-60 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal leading-relaxed text-slate-600 shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

const accentStyles = {
  emerald: { bar: 'bg-emerald-400', icon: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
  amber: { bar: 'bg-amber-400', icon: 'border-amber-100 bg-amber-50 text-amber-600' },
  blue: { bar: 'bg-blue-400', icon: 'border-blue-100 bg-blue-50 text-blue-600' },
  indigo: { bar: 'bg-indigo-400', icon: 'border-indigo-100 bg-indigo-50 text-indigo-600' },
} as const;

type SummaryRow = { label: string; value: string; sub?: string; info?: string };

function SummaryCard({ title, total, subtotal, icon, accent, rows, footer }: { title: string; total: string; subtotal?: string; icon: React.ReactNode; accent: keyof typeof accentStyles; rows: SummaryRow[]; footer?: SummaryRow }) {
  const a = accentStyles[accent];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className={`h-1 w-full ${a.bar}`} />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${a.icon}`}>{icon}</div>
        </div>
        <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">{total}</p>
        {subtotal && <p className="mt-0.5 text-xs font-medium text-slate-400">{subtotal}</p>}
        <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                {row.label}
                {row.info && <InfoHint text={row.info} />}
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold text-slate-900">{row.value}</span>
                {row.sub && <span className="block text-xs text-slate-400">{row.sub}</span>}
              </span>
            </div>
          ))}
        </div>
        {footer && (
          <div className="mt-3 flex items-start justify-between gap-3 border-t border-slate-200 pt-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              {footer.label}
              {footer.info && <InfoHint text={footer.info} />}
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold text-slate-900">{footer.value}</span>
              {footer.sub && <span className="block text-xs text-slate-400">{footer.sub}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Lever({ label, prefix, suffix, value, onChange, wide, info }: { label: string; prefix?: string; suffix?: string; value: string; onChange: (value: string) => void; wide?: boolean; info?: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {info && <InfoHint text={info} />}
      </span>
      <span className="flex items-baseline gap-0.5">
        {prefix && <span className="text-sm font-semibold text-slate-400">{prefix}</span>}
        <input
          className={`${wide ? 'w-16' : 'w-12'} border-0 bg-transparent p-0 text-right text-sm font-semibold text-slate-950 outline-none focus:ring-0`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
        />
        {suffix && <span className="text-sm font-semibold text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

export default function SavingsPlanPage() {
  const [data, setData] = useState<SavingsPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [projectionView, setProjectionView] = useState<'chart' | 'table'>('chart');
  const [form, setForm] = useState({ currentAge: '30', targetAge: '45', annualReturn: '7', withdrawalRate: '4', retirementBudget: '', inflation: '3' });
  const [floor, setFloor] = useState('');
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPreview = useRef(true);

  async function loadSavingsPlan() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/savings-plan');
      if (!response.ok) throw new Error('Failed to load savings plan');
      const nextData = await response.json() as SavingsPlanData;
      setData(nextData);
      skipPreview.current = true;
      setForm({
        currentAge: String(nextData.settings.currentAge),
        targetAge: String(nextData.settings.targetAge),
        annualReturn: String(nextData.settings.annualReturn),
        withdrawalRate: String(nextData.settings.withdrawalRate),
        retirementBudget: String(Math.round(nextData.settings.retirementMonthlyBudget)),
        inflation: String(nextData.settings.inflationRate),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load savings plan');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSavingsPlan();
  }, []);

  // Live preview: recompute the chart/table/numbers as assumptions change,
  // without saving. The server does the math so it stays the single source of truth.
  useEffect(() => {
    if (skipPreview.current) {
      skipPreview.current = false;
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      const params = new URLSearchParams();
      if (form.currentAge) params.set('currentAge', form.currentAge);
      if (form.targetAge) params.set('targetAge', form.targetAge);
      if (form.annualReturn) params.set('annualReturn', form.annualReturn);
      if (form.withdrawalRate) params.set('withdrawalRate', form.withdrawalRate);
      if (form.retirementBudget) params.set('retirementMonthlyBudget', form.retirementBudget);
      if (form.inflation) params.set('inflationRate', form.inflation);
      try {
        const response = await fetch(`/api/savings-plan?${params.toString()}`);
        if (!response.ok) return;
        setData(await response.json() as SavingsPlanData);
      } catch {
        // ignore transient preview errors while typing
      }
    }, 350);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [form]);

  async function saveSettings(event?: React.FormEvent) {
    event?.preventDefault();
    try {
      setSaving(true);
      setError('');
      const response = await fetch('/api/savings-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAge: Number(form.currentAge),
          targetAge: Number(form.targetAge),
          annualReturn: Number(form.annualReturn),
          withdrawalRate: Number(form.withdrawalRate),
          retirementMonthlyBudget: form.retirementBudget === '' ? undefined : Number(form.retirementBudget),
          inflationRate: form.inflation === '' ? undefined : Number(form.inflation),
        }),
      });
      const nextData = await response.json();
      if (!response.ok) throw new Error(nextData.error || 'Failed to save settings');
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  }

  const chartDomain = useMemo<[number, number]>(() => {
    if (!data?.strategy.projection.length) return [30, 60];
    const ages = data.strategy.projection.map((point) => point.age);
    return [Math.min(...ages), Math.max(...ages)];
  }, [data]);

  // "How much you can live on" = (accessible assets) × withdrawal rate, shown
  // from the retirement age onward. Before the 401k unlocks at 59.5, only the
  // brokerage bridge is actually spendable; after that the full portfolio is.
  // "budgetLine" = your retirement spending, grown by inflation each year.
  const chartData = useMemo(() => {
    if (!data) return [];
    const rate = data.settings.withdrawalRate / 100;
    const retireAge = data.settings.targetAge;
    const accessAge = data.settings.accessAge;
    const baseBudget = data.settings.retirementAnnualExpenses;
    const inflation = data.settings.inflationRate / 100;
    // Real return = what you can spend forever without eroding principal (in
    // today's purchasing power). Precisely (1+return)/(1+inflation) − 1.
    const realRate = (1 + data.settings.annualReturn / 100) / (1 + inflation) - 1;
    return data.strategy.projection.map((point) => {
      let safeSpending: number | null = null;
      let liveOffReturns: number | null = null;
      let budgetLine: number | null = null;
      if (point.age >= retireAge) {
        const accessibleAssets = point.age < accessAge ? point.bridgeAssets : point.totalAssets;
        safeSpending = Math.round(accessibleAssets * rate);
        liveOffReturns = Math.round(accessibleAssets * Math.max(0, realRate));
        budgetLine = Math.round(baseBudget * Math.pow(1 + inflation, point.age - retireAge));
      }
      return { ...point, safeSpending, liveOffReturns, budgetLine };
    });
  }, [data]);

  const floorValue = floor === '' ? null : Number(floor);
  const realRatePct = data ? (((1 + data.settings.annualReturn / 100) / (1 + data.settings.inflationRate / 100) - 1) * 100) : 0;
  // The age your principal-preserving income first covers your (inflating) budget.
  const neverDepleteAge = useMemo(() => {
    const hit = chartData.find((p) => p.liveOffReturns !== null && p.budgetLine !== null && (p.liveOffReturns as number) >= (p.budgetLine as number));
    return hit ? hit.age : null;
  }, [chartData]);

  if (loading) {
    return (
      <PageShell maxWidth="7xl">
        <PageHeader eyebrow="Accounts" title="Savings Plan" description="Loading your retirement outlook." icon={<Target className="h-5 w-5" />} />
        <PagePanel className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        </PagePanel>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell maxWidth="7xl">
        <PageHeader eyebrow="Accounts" title="Savings Plan" icon={<Target className="h-5 w-5" />} />
        <PagePanel className="p-6">
          <p className="text-sm text-red-600">{error || 'Savings plan data is unavailable.'}</p>
        </PagePanel>
      </PageShell>
    );
  }

  const { settings, strategy, savings, expenses, income, netWorth } = data;
  const byName = (name: string) => netWorth.breakdown.find((item) => item.name === name)?.value ?? 0;
  const perMonth = (yearly: number) => `${formatCurrency(yearly / 12)}/mo`;

  const recurringYearly = expenses.monthlyRecurring * 12;
  const budgetYearly = expenses.monthlyBudget * 12;
  const additionalYearly = expenses.monthlyAdditional * 12;

  const expenseRows: SummaryRow[] = [
    { label: 'Recurring', value: formatCurrency(recurringYearly), sub: perMonth(recurringYearly) },
    { label: 'Budget', value: formatCurrency(budgetYearly), sub: perMonth(budgetYearly) },
  ];
  if (additionalYearly > 0) expenseRows.push({ label: 'Additional', value: formatCurrency(additionalYearly), sub: perMonth(additionalYearly) });

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        eyebrow="Accounts"
        title="Savings Plan"
        description="Your yearly money, net worth, and the path to retirement."
        icon={<Target className="h-5 w-5" />}
        actions={(
          <button type="button" onClick={loadSavingsPlan} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </button>
        )}
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Assumptions */}
      <form onSubmit={saveSettings} className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Assumptions</span>
        <Lever label="Current age" value={form.currentAge} onChange={(v) => setForm((p) => ({ ...p, currentAge: v }))} info="Your age today — the starting point for the projection. Everything is calculated forward from here, and it sets how many years you have to keep investing before retirement." />
        <Lever label="Retire at" value={form.targetAge} onChange={(v) => setForm((p) => ({ ...p, targetAge: v }))} info="The age you stop working and stop adding new money. After this you live off investments, drawing from the brokerage until your 401k unlocks at 59½. Pushing it later means more saving and a shorter bridge to fund." />
        <Lever label="Return" suffix="%" value={form.annualReturn} onChange={(v) => setForm((p) => ({ ...p, annualReturn: v }))} info="The average yearly investment return you assume (nominal, before inflation). 6–8% is a common long-term stock-market assumption. Drop it to 5–6% to stress-test whether the plan still holds in a weaker market." />
        <Lever label="Withdrawal" suffix="%" value={form.withdrawalRate} onChange={(v) => setForm((p) => ({ ...p, withdrawalRate: v }))} info="The share of your portfolio you'd withdraw per year — the 4% rule is the classic 'safe' default that's survived historical crashes. It sets your FI target (budget ÷ rate) and the orange 'can live on' line. Lower = safer." />
        <Lever label="Inflation" suffix="%" value={form.inflation} onChange={(v) => setForm((p) => ({ ...p, inflation: v }))} info="How fast prices — and your retirement budget — rise each year (~3% is typical). It makes your withdrawals grow over time and shrinks your 'real' return, which is why ignoring it makes a plan look rosier than it is." />
        <Lever label="Retire budget" prefix="$" suffix="/mo" wide value={form.retirementBudget} onChange={(v) => setForm((p) => ({ ...p, retirementBudget: v }))} info="What you expect to spend per month in retirement. Defaults to today's spending — raise it to plan for a family or a richer lifestyle. It drives how fast the brokerage is drawn down and sets your FI target." />
        <Lever label="Brokerage floor" prefix="$" wide value={floor} onChange={setFloor} info="A guardrail you set: the minimum brokerage balance you want to keep. It draws a line on the chart so you can confirm you stay above it. Purely a visual planning aid — it isn't saved and doesn't change the projection." />
        <button type="submit" disabled={saving} className="inline-flex items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? 'Saving' : 'Update'}
        </button>
      </form>
      <p className="-mt-2 text-xs text-slate-400">Tweak any assumption to preview live; <span className="font-medium text-slate-500">Update</span> saves it. Retire budget grows with inflation each year. The brokerage floor is a visual guardrail — your blue line should stay above it.</p>

      {/* Summary cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Income (post-tax)"
          total={formatCurrency(income.annualIncome)}
          subtotal={`${perMonth(income.annualIncome)} take-home`}
          icon={<Banknote className="h-4 w-4" />}
          accent="indigo"
          rows={[
            { label: 'Monthly', value: formatCurrency(income.annualIncome / 12), info: 'Take-home pay per month (yearly post-tax income ÷ 12).' },
            { label: 'Per paycheck', value: formatCurrency(income.perPaycheck), info: `Post-tax amount per check across ${income.payPeriodsPerYear} paychecks a year.` },
          ]}
        />
        <SummaryCard
          title="Yearly savings"
          total={formatCurrency(savings.totalAnnualSavings)}
          subtotal={`${perMonth(savings.totalAnnualSavings)} invested`}
          icon={<PiggyBank className="h-4 w-4" />}
          accent="emerald"
          rows={[
            { label: 'Brokerage savings', value: formatCurrency(savings.annualCashWithBonus), sub: perMonth(savings.annualCashWithBonus), info: 'Cash left after expenses plus your net bonus, invested in a taxable brokerage you can access at any age.' },
            { label: '401k', value: formatCurrency(savings.annual401kContribution), sub: perMonth(savings.annual401kContribution), info: 'Service-based 401k contribution from payroll, locked until the access age.' },
            { label: 'Savings rate', value: formatPercent(savings.savingsRate), info: 'Share of take-home pay plus net bonus that becomes investable cash (excludes 401k).' },
          ]}
        />
        <SummaryCard
          title="Total yearly expenses"
          total={formatCurrency(expenses.annualExpenses)}
          subtotal={`${perMonth(expenses.annualExpenses)} spending`}
          icon={<Receipt className="h-4 w-4" />}
          accent="amber"
          rows={expenseRows}
        />
        <SummaryCard
          title="Net worth"
          total={formatCurrency(netWorth.total)}
          icon={<WalletCards className="h-4 w-4" />}
          accent="blue"
          rows={[
            { label: 'Brokerage', value: formatCurrency(byName('Stocks')) },
            { label: 'Cash', value: formatCurrency(byName('Cash')) },
            { label: '401k', value: formatCurrency(byName('401k')) },
          ]}
          footer={{
            label: 'FI target',
            value: formatCurrency(strategy.fiNumber),
            sub: `${Math.round(100 / strategy.withdrawalRate)}× your retire budget (${strategy.withdrawalRate}% rule)`,
            info: `The nest egg that can fund your retirement budget indefinitely at the ${strategy.withdrawalRate}% rule (retire budget ÷ ${strategy.withdrawalRate}%). Once your investments reach it, work becomes optional.`,
          }}
        />
      </div>

      {/* Projection */}
      <PagePanel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Path to age {Math.round(settings.accessAge)}</h2>
            <p className="mt-1 text-sm text-slate-500">Invest until {settings.targetAge}, then the brokerage bridge covers expenses while the 401k compounds to {settings.accessAge}.</p>
          </div>
          <div className="flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['chart', 'table'] as const).map((view) => (
              <button key={view} type="button" onClick={() => setProjectionView(view)} className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${projectionView === view ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}>
                {view}
              </button>
            ))}
          </div>
        </div>

        {projectionView === 'chart' ? (
          <div className="p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> Brokerage <InfoHint text="Your taxable brokerage balance over time. This money is accessible at ANY age, so it's what funds your early-retirement years before the 401k unlocks. It builds from contributions while you work, then gets drawn down by spending." /></span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#059669]" /> 401k <InfoHint text="Your 401k balance, stacked on top of the brokerage so the top edge is your total net worth. It keeps compounding untouched and can't be tapped penalty-free until 59½ — it's your long-term, after-59½ money." /></span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-[#d97706]" /> Can live on / yr ({settings.withdrawalRate}% rule) <InfoHint text="The 'safe' yearly income your accessible investments can support using the 4% rule — designed to survive market crashes across a 30-year retirement. It draws principal down slowly but is the battle-tested benchmark for 'will my money last?' If this stays above your budget, you're funded." /></span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-[#0891b2]" /> Live off returns (~{realRatePct.toFixed(1)}%, never touch principal) <InfoHint text="The yearly income you could take using only your real return (return minus inflation), so your principal never erodes in today's dollars — sustainable forever. It's higher than the 4% rule but assumes steady returns, so treat it as the optimistic ceiling. Where it crosses your budget is your 'never-deplete' age." /></span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-[#dc2626]" /> Retire budget ({formatCurrency(settings.retirementMonthlyBudget)}/mo, +{settings.inflationRate}%/yr) <InfoHint text="What you plan to spend each year in retirement, rising with inflation. It's the target the income lines must clear: when the orange or teal line sits above this red line, your investments can cover your lifestyle." /></span>
              {floorValue !== null && <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dotted border-[#9333ea]" /> Brokerage floor <InfoHint text="A guardrail you set — the minimum brokerage balance you're comfortable keeping. If the blue brokerage line approaches it, that's your signal to trim spending so you don't run the bridge dry before the 401k unlocks at 59½." /></span>}
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ left: 8, right: 12, top: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="age" type="number" domain={chartDomain} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                  <YAxis yAxisId="left" tickFormatter={formatCurrency} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={88} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tickFormatter={formatCurrency} tickLine={false} axisLine={false} tick={{ fill: '#d97706', fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(age) => `Age ${age}`} />
                  <ReferenceLine yAxisId="left" x={settings.targetAge} stroke="#0f172a" strokeDasharray="4 4" label={{ value: `Retire ${settings.targetAge}`, position: 'top', fill: '#0f172a', fontSize: 11 }} />
                  <ReferenceLine yAxisId="left" x={settings.accessAge} stroke="#059669" strokeDasharray="4 4" label={{ value: `401k unlocks ${settings.accessAge}`, position: 'top', fill: '#059669', fontSize: 11 }} />
                  {floorValue !== null && <ReferenceLine yAxisId="left" y={floorValue} stroke="#9333ea" strokeDasharray="2 3" label={{ value: `Floor ${formatCurrency(floorValue)}`, position: 'insideTopLeft', fill: '#9333ea', fontSize: 11 }} />}
                  <Area yAxisId="left" type="monotone" dataKey="bridgeAssets" stackId="1" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} name="Brokerage" />
                  <Area yAxisId="left" type="monotone" dataKey="retirementAssets" stackId="1" stroke="#059669" fill="#dcfce7" strokeWidth={2} name="401k" />
                  <Line yAxisId="right" type="monotone" dataKey="budgetLine" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} name="Retire budget" />
                  <Line yAxisId="right" type="monotone" dataKey="safeSpending" stroke="#d97706" strokeWidth={2.5} dot={false} connectNulls={false} name="Can live on / yr" />
                  <Line yAxisId="right" type="monotone" dataKey="liveOffReturns" stroke="#0891b2" strokeWidth={2.5} dot={false} connectNulls={false} name="Live off returns" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {neverDepleteAge !== null ? (
              <p className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900"><span className="font-semibold">Never-deplete age: {neverDepleteAge}.</span> From here, the teal &ldquo;live off returns&rdquo; line clears your budget — your investments can fund your spending forever without touching principal (in today&apos;s dollars).</p>
            ) : (
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span className="font-semibold">Not yet self-sustaining.</span> The teal &ldquo;live off returns&rdquo; line stays below your budget through {settings.accessAge}, so at this budget you&apos;d still be drawing down principal. Lower the budget or grow the portfolio to close the gap.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Right axis: the <span className="font-medium text-[#d97706]">orange</span> line is the {settings.withdrawalRate}%-rule safe spend (bulletproof through downturns); the <span className="font-medium text-[#0891b2]">teal</span> line is spending only your real return (~{realRatePct.toFixed(1)}%) so principal never erodes — higher, but it assumes steady returns. Both use <span className="font-medium text-slate-600">accessible brokerage</span> before {settings.accessAge}, then the full portfolio. The <span className="font-medium text-[#dc2626]">red</span> line is your budget rising {settings.inflationRate}%/yr.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr className="text-center">
                  <th className="px-4 pt-3 text-left" rowSpan={2}>Age</th>
                  <th className="px-4 pt-3 text-[10px] text-emerald-600" colSpan={2}>Contributed</th>
                  <th className="px-4 pt-3 text-right text-[10px] text-amber-600" rowSpan={2}>Withdrawn</th>
                  <th className="border-l border-slate-200 px-4 pt-3 text-[10px]" colSpan={3}>Balance</th>
                </tr>
                <tr className="text-right">
                  <th className="px-4 pb-3 font-medium">Brokerage</th>
                  <th className="px-4 pb-3 font-medium">401k</th>
                  <th className="border-l border-slate-200 px-4 pb-3 font-medium">Brokerage</th>
                  <th className="px-4 pb-3 font-medium">401k</th>
                  <th className="px-4 pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {strategy.projection.map((row) => (
                  <tr key={row.age} className={row.phase === 'drawdown' ? 'bg-amber-50/40' : undefined}>
                    <td className="px-4 py-3 font-medium text-slate-950">{row.age}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{row.taxableContribution ? `+${formatCurrency(row.taxableContribution)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{row.retirementContribution ? `+${formatCurrency(row.retirementContribution)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{row.withdrawal ? `−${formatCurrency(row.withdrawal)}` : '—'}</td>
                    <td className="border-l border-slate-100 px-4 py-3 text-right text-slate-600">{formatCurrency(row.bridgeAssets)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.retirementAssets)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatCurrency(row.totalAssets)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-slate-500">The 401k contribution rises 1.5% of salary per year of service (capped at 15%). After age {settings.targetAge}, contributions stop and the brokerage is drawn down by your {formatCurrency(settings.retirementMonthlyBudget)}/mo budget — note the withdrawal grows each year with {settings.inflationRate}% inflation.</p>
          </div>
        )}
      </PagePanel>
    </PageShell>
  );
}
