'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Calculator, Info, LineChart, PiggyBank, Receipt, RefreshCcw, Save, SlidersHorizontal, Target, WalletCards } from 'lucide-react';
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
    retirementMonthlyBudgetAtTarget: number;
    retirementAnnualExpensesAtTarget: number;
    brokerageYearlySavings: number;
    retirementYearlyContribution: number;
    defaultBrokerageYearlySavings: number;
    defaultRetirementYearlyContribution: number;
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
    monthlyPlanningFunds: number;
    monthlyExpenses: number;
    annualExpenses: number;
    annualPlanningFunds: number;
    planningFunds: {
      id?: number;
      name: string;
      annualTarget: number;
      monthlyTarget: number;
      linkedFundName?: string | null;
      linkedFundAmount?: number | null;
      includeInSavingsPlan: boolean;
    }[];
  };
  savings: {
    annualCashSavings: number;
    netBonus: number;
    annualCashWithBonus: number;
    annual401kContribution: number;
    defaultAnnual401kContribution: number;
    totalAnnualSavings: number;
    savingsRate: number;
  };
  strategy: {
    accessAge: number;
    withdrawalRate: number;
    fiNumber: number;
    bridgeLasts: boolean;
    taxableAnnualContribution: number;
    retirementAnnualContribution: number;
    currentBridgeAssets: number;
    currentRetirementAssets: number;
    bridgeAtTarget: number;
    retirementAtTarget: number;
    totalAtTarget: number;
    bridgeAtAccess: number;
    totalAtAccess: number;
    fiSurplus: number;
    bridgeYears: number;
    bridgeRunwayYears: number;
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
      <span className="pointer-events-none absolute left-1/2 top-6 z-50 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal leading-relaxed text-slate-600 shadow-lg group-hover:block group-focus-within:block">
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
type TabKey = 'overview' | 'bridge' | 'projection' | 'assumptions';
type ChartLineKey = 'brokerage' | 'retirement' | 'safeSpending' | 'liveOffReturns' | 'budgetLine';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <WalletCards className="h-4 w-4" /> },
  { key: 'bridge', label: 'Bridge', icon: <Calculator className="h-4 w-4" /> },
  { key: 'projection', label: 'Projection', icon: <LineChart className="h-4 w-4" /> },
  { key: 'assumptions', label: 'Assumptions', icon: <SlidersHorizontal className="h-4 w-4" /> },
];

function SummaryCard({ title, total, subtotal, icon, accent, rows, footer }: { title: string; total: string; subtotal?: string; icon: React.ReactNode; accent: keyof typeof accentStyles; rows: SummaryRow[]; footer?: SummaryRow }) {
  const a = accentStyles[accent];
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className={`h-1 w-full rounded-t-xl ${a.bar}`} />
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
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [projectionView, setProjectionView] = useState<'chart' | 'table'>('chart');
  const [visibleLines, setVisibleLines] = useState<Record<ChartLineKey, boolean>>({
    brokerage: true,
    retirement: true,
    safeSpending: true,
    liveOffReturns: true,
    budgetLine: true,
  });
  const [form, setForm] = useState({ currentAge: '30', targetAge: '45', annualReturn: '7', withdrawalRate: '4', retirementBudget: '', inflation: '3', brokerageSavings: '', retirementContribution: '' });
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
        brokerageSavings: String(Math.round(nextData.settings.brokerageYearlySavings)),
        retirementContribution: String(Math.round(nextData.settings.retirementYearlyContribution)),
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
      if (form.brokerageSavings) params.set('brokerageYearlySavings', form.brokerageSavings);
      if (form.retirementContribution) params.set('retirementYearlyContribution', form.retirementContribution);
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
      const brokerageSavings = form.brokerageSavings === '' ? undefined : Number(form.brokerageSavings);
      const retirementContribution = form.retirementContribution === '' ? undefined : Number(form.retirementContribution);
      const brokerageSavingsPayload = data && brokerageSavings !== undefined && Math.round(brokerageSavings) === Math.round(data.settings.defaultBrokerageYearlySavings)
        ? undefined
        : brokerageSavings;
      const retirementContributionPayload = data && retirementContribution !== undefined && Math.round(retirementContribution) === Math.round(data.settings.defaultRetirementYearlyContribution)
        ? undefined
        : retirementContribution;
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
          brokerageYearlySavings: brokerageSavingsPayload,
          retirementYearlyContribution: retirementContributionPayload,
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

  function resetSavingsAssumptions() {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      brokerageSavings: String(Math.round(data.settings.defaultBrokerageYearlySavings)),
      retirementContribution: String(Math.round(data.settings.defaultRetirementYearlyContribution)),
    }));
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
    const baseBudget = data.settings.retirementAnnualExpensesAtTarget;
    const inflation = data.settings.inflationRate / 100;
    const nominalReturn = data.settings.annualReturn / 100;
    // Real return = what you can spend forever without eroding principal (in
    // today's purchasing power). Precisely (1+return)/(1+inflation) − 1.
    const realRate = (1 + data.settings.annualReturn / 100) / (1 + inflation) - 1;
    return data.strategy.projection.map((point) => {
      let safeSpending: number | null = null;
      let liveOffReturns: number | null = null;
      let budgetLine: number | null = null;
      const chartBridgeAssets = Math.max(0, point.bridgeAssets);
      const chartRetirementAssets = point.retirementAssets;
      if (point.age >= retireAge) {
        const yearsSinceRetire = Math.max(0, point.age - retireAge);
        const capacityBridgeAssets = data.strategy.bridgeAtTarget * Math.pow(1 + nominalReturn, yearsSinceRetire);
        const capacityRetirementAssets = data.strategy.retirementAtTarget * Math.pow(1 + nominalReturn, yearsSinceRetire);
        const accessibleAssets = point.age < accessAge
          ? capacityBridgeAssets
          : capacityBridgeAssets + capacityRetirementAssets;
        safeSpending = Math.round(accessibleAssets * rate);
        liveOffReturns = Math.round(accessibleAssets * Math.max(0, realRate));
        budgetLine = Math.round(baseBudget * Math.pow(1 + inflation, point.age - retireAge));
      }
      return { ...point, chartBridgeAssets, chartRetirementAssets, safeSpending, liveOffReturns, budgetLine };
    });
  }, [data]);

  const realRatePct = data ? (((1 + data.settings.annualReturn / 100) / (1 + data.settings.inflationRate / 100) - 1) * 100) : 0;
  // The age your principal-preserving income first covers your (inflating) budget.
  const neverDepleteAge = useMemo(() => {
    const hit = chartData.find((p) => p.liveOffReturns !== null && p.budgetLine !== null && (p.liveOffReturns as number) >= (p.budgetLine as number));
    return hit ? hit.age : null;
  }, [chartData]);

  const bridgePlan = useMemo(() => {
    if (!data) return null;
    const monthlyReturn = data.settings.annualReturn / 100 / 12;
    const monthsToTarget = Math.max(0, Math.round(data.settings.yearsToTarget * 12));
    const bridgeMonths = Math.max(0, Math.round((data.settings.accessAge - data.settings.targetAge) * 12));
    const currentBridgeAssets = data.strategy.currentBridgeAssets;
    const projectedBridgeWithoutMoreSavings = currentBridgeAssets * Math.pow(1 + monthlyReturn, monthsToTarget);

    let requiredBridge = 0;
    let undiscountedBridgeSpending = 0;
    for (let month = 0; month < bridgeMonths; month += 1) {
      const retirementYear = Math.floor(month / 12);
      const monthlyWithdrawal = data.settings.retirementMonthlyBudgetAtTarget * Math.pow(1 + data.settings.inflationRate / 100, retirementYear);
      undiscountedBridgeSpending += monthlyWithdrawal;
      requiredBridge += monthlyReturn === 0
        ? monthlyWithdrawal
        : monthlyWithdrawal / Math.pow(1 + monthlyReturn, month + 1);
    }

    const targetGap = Math.max(0, requiredBridge - projectedBridgeWithoutMoreSavings);
    const monthlySavingsNeeded = monthsToTarget === 0
      ? targetGap
      : monthlyReturn === 0
        ? targetGap / monthsToTarget
        : targetGap * monthlyReturn / (Math.pow(1 + monthlyReturn, monthsToTarget) - 1);
    const currentMonthlyBrokerageSavings = data.strategy.taxableAnnualContribution / 12;

    return {
      bridgeMonths,
      requiredBridge: Math.round(requiredBridge),
      undiscountedBridgeSpending: Math.round(undiscountedBridgeSpending),
      investmentOffset: Math.round(Math.max(0, undiscountedBridgeSpending - requiredBridge)),
      projectedBridgeWithoutMoreSavings: Math.round(projectedBridgeWithoutMoreSavings),
      targetGap: Math.round(targetGap),
      monthlySavingsNeeded: Math.round(monthlySavingsNeeded),
      yearlySavingsNeeded: Math.round(monthlySavingsNeeded * 12),
      currentMonthlyBrokerageSavings: Math.round(currentMonthlyBrokerageSavings),
      currentYearlyBrokerageSavings: Math.round(data.strategy.taxableAnnualContribution),
      projectedBridgeWithCurrentSavings: Math.round(data.strategy.bridgeAtTarget),
      surplusWithCurrentSavings: Math.round(data.strategy.bridgeAtTarget - requiredBridge),
    };
  }, [data]);

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
  const planningFundsYearly = expenses.annualPlanningFunds;

  const expenseRows: SummaryRow[] = [
    { label: 'Recurring', value: formatCurrency(recurringYearly), sub: perMonth(recurringYearly) },
    { label: 'Budget', value: formatCurrency(budgetYearly), sub: perMonth(budgetYearly) },
  ];
  if (planningFundsYearly > 0) {
    expenseRows.push({
      label: 'Planning funds',
      value: formatCurrency(planningFundsYearly),
      sub: perMonth(planningFundsYearly),
      info: 'Active sinking-fund plans such as vacation or clothes. These reduce savings projections but do not count as current budget spend.',
    });
  }

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

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
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
      )}

      {activeTab === 'bridge' && bridgePlan && (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Retire budget"
              total={`${formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo`}
              subtotal={`${formatCurrency(settings.retirementMonthlyBudget)}/mo today, inflated to age ${settings.targetAge}`}
              icon={<Receipt className="h-4 w-4" />}
              accent="amber"
              rows={[
                { label: 'Today dollars', value: formatCurrency(settings.retirementAnnualExpenses), sub: `${formatCurrency(settings.retirementMonthlyBudget)}/mo` },
                { label: `Age ${settings.targetAge} dollars`, value: formatCurrency(settings.retirementAnnualExpensesAtTarget), sub: `${formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo`, info: `This is the budget the bridge math starts with: your entered monthly budget inflated ${settings.yearsToTarget.toFixed(1)} years at ${settings.inflationRate}% before retirement starts.` },
              ]}
            />
            <SummaryCard
              title="Bridge needed"
              total={formatCurrency(bridgePlan.requiredBridge)}
              subtotal={`Starts at ${formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo, then +${settings.inflationRate}%/yr`}
              icon={<Calculator className="h-4 w-4" />}
              accent="blue"
              rows={[
                { label: 'Raw withdrawals', value: formatCurrency(bridgePlan.undiscountedBridgeSpending), sub: `${bridgePlan.bridgeMonths} inflated monthly payments`, info: `This is the simple total of every monthly withdrawal from age ${settings.targetAge} to ${settings.accessAge}, starting at ${formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo and increasing ${settings.inflationRate}% each year.` },
                { label: 'Growth credit', value: formatCurrency(-bridgePlan.investmentOffset), sub: `${settings.annualReturn}% return while withdrawing`, info: `The bridge target is lower than raw withdrawals because the remaining bridge balance is assumed to stay invested and earn ${settings.annualReturn}% per year during the bridge years.` },
                { label: 'Bridge length', value: `${strategy.bridgeYears.toFixed(1)} years`, sub: `${bridgePlan.bridgeMonths} months` },
                { label: 'Current brokerage', value: formatCurrency(strategy.currentBridgeAssets) },
                { label: 'Current only grows to', value: formatCurrency(bridgePlan.projectedBridgeWithoutMoreSavings) },
              ]}
            />
            <SummaryCard
              title="Need to save"
              total={formatCurrency(bridgePlan.yearlySavingsNeeded)}
              subtotal={`${formatCurrency(bridgePlan.monthlySavingsNeeded)}/mo to bridge age ${settings.targetAge}-${settings.accessAge}`}
              icon={<PiggyBank className="h-4 w-4" />}
              accent={bridgePlan.surplusWithCurrentSavings >= 0 ? 'emerald' : 'amber'}
              rows={[
                { label: 'Brokerage savings', value: formatCurrency(bridgePlan.currentYearlyBrokerageSavings), sub: `${formatCurrency(bridgePlan.currentMonthlyBrokerageSavings)}/mo` },
                { label: 'Default from cashflow', value: formatCurrency(settings.defaultBrokerageYearlySavings), sub: `${formatCurrency(savings.netBonus)} net bonus included` },
                { label: 'Current plan result', value: formatCurrency(bridgePlan.projectedBridgeWithCurrentSavings), sub: bridgePlan.surplusWithCurrentSavings >= 0 ? `${formatCurrency(bridgePlan.surplusWithCurrentSavings)} cushion` : `${formatCurrency(Math.abs(bridgePlan.surplusWithCurrentSavings))} short` },
              ]}
            />
            <SummaryCard
              title="401k reserve"
              total={formatCurrency(strategy.retirementAtTarget)}
              subtotal={`${formatCurrency(strategy.currentRetirementAssets)} now`}
              icon={<WalletCards className="h-4 w-4" />}
              accent="indigo"
              rows={[
                { label: 'At 59.5 access', value: formatCurrency(strategy.totalAtAccess) },
                { label: 'FI number at retire', value: formatCurrency(strategy.fiNumber), info: `${settings.retirementAnnualExpensesAtTarget.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/yr divided by ${settings.withdrawalRate}%.` },
              ]}
            />
          </div>
          <PagePanel className={`border px-5 py-4 ${strategy.bridgeLasts ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className={`text-sm font-semibold ${strategy.bridgeLasts ? 'text-emerald-900' : 'text-amber-900'}`}>
              {strategy.bridgeLasts
                ? `The brokerage bridge survives to age ${settings.accessAge}.`
                : `The brokerage bridge runs for about ${strategy.bridgeRunwayYears.toFixed(1)} of ${strategy.bridgeYears.toFixed(1)} years.`}
            </p>
            <p className={`mt-1 text-sm ${strategy.bridgeLasts ? 'text-emerald-800' : 'text-amber-800'}`}>
              At the current brokerage savings pace, projection reaches {formatCurrency(strategy.bridgeAtTarget)} at age {settings.targetAge}. The standalone bridge target is about {formatCurrency(bridgePlan.requiredBridge)}, using a starting retirement withdrawal of {formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo in age-{settings.targetAge} dollars before relying on the 401k.
            </p>
          </PagePanel>
        </div>
      )}

      {activeTab === 'assumptions' && (
        <PagePanel className="overflow-visible p-5 sm:p-6">
          <form onSubmit={saveSettings} className="flex flex-wrap items-center gap-2">
            <Lever label="Current age" value={form.currentAge} onChange={(v) => setForm((p) => ({ ...p, currentAge: v }))} info="Your age today — the starting point for the projection. Everything is calculated forward from here, and it sets how many years you have to keep investing before retirement." />
            <Lever label="Retire at" value={form.targetAge} onChange={(v) => setForm((p) => ({ ...p, targetAge: v }))} info="The age you stop working and stop adding new money. After this you live off investments, drawing from the brokerage until your 401k unlocks at 59½. Pushing it later means more saving and a shorter bridge to fund." />
            <Lever label="Return" suffix="%" value={form.annualReturn} onChange={(v) => setForm((p) => ({ ...p, annualReturn: v }))} info="The average yearly investment return you assume (nominal, before inflation). 6–8% is a common long-term stock-market assumption. Drop it to 5–6% to stress-test whether the plan still holds in a weaker market." />
            <Lever label="Withdrawal" suffix="%" value={form.withdrawalRate} onChange={(v) => setForm((p) => ({ ...p, withdrawalRate: v }))} info="The share of your portfolio you'd withdraw per year. It sets your FI target (budget divided by rate) and the orange can-live-on line. Lower is more conservative." />
            <Lever label="Inflation" suffix="%" value={form.inflation} onChange={(v) => setForm((p) => ({ ...p, inflation: v }))} info="How fast prices and your retirement budget rise each year. This now inflates the budget from today to retirement age and throughout retirement." />
            <Lever label="Retire budget" prefix="$" suffix="/mo" wide value={form.retirementBudget} onChange={(v) => setForm((p) => ({ ...p, retirementBudget: v }))} info={`Monthly family budget in today's dollars. The bridge starts from this amount inflated to age ${settings.targetAge}, then grows it every retirement year by the inflation assumption.`} />
            <Lever label="Brokerage/yr" prefix="$" wide value={form.brokerageSavings} onChange={(v) => setForm((p) => ({ ...p, brokerageSavings: v }))} info="Yearly taxable brokerage savings. Defaults to cash left after expenses plus expected net bonus, and controls the early-retirement bridge before 401k access." />
            <Lever label="401k/yr" prefix="$" wide value={form.retirementContribution} onChange={(v) => setForm((p) => ({ ...p, retirementContribution: v }))} info="Yearly 401k contribution used in the projection. Defaults to the employer service-based 401k contribution, and controls the post-59.5 retirement phase." />
            <button type="button" onClick={resetSavingsAssumptions} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Reset savings
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving' : 'Update'}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-500">Tweak any assumption to preview live; <span className="font-medium text-slate-700">Update</span> saves it. Savings defaults are {formatCurrency(settings.defaultBrokerageYearlySavings)}/yr brokerage and {formatCurrency(settings.defaultRetirementYearlyContribution)}/yr 401k.</p>
        </PagePanel>
      )}

      {activeTab === 'projection' && (
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
            <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-600">
              {([
                ['brokerage', 'Brokerage', '#2563eb', 'Your taxable brokerage balance over time. This money is accessible at any age and funds the early-retirement bridge.'],
                ['retirement', '401k', '#059669', 'Your 401k balance. It compounds untouched until normal access age.'],
                ['safeSpending', `Capacity / yr (${settings.withdrawalRate}% rule)`, '#d97706', 'A separate capacity overlay: what accessible assets could support using your withdrawal-rate assumption, without letting the retirement-budget drawdown reduce this line.'],
                ['liveOffReturns', `Returns-only capacity (~${realRatePct.toFixed(1)}%)`, '#0891b2', "A separate capacity overlay: yearly income from real return only, so principal is preserved in today's dollars."],
                ['budgetLine', `Retire budget (${formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo at ${settings.targetAge})`, '#dc2626', 'Your retirement budget at retirement age, then rising with inflation.'],
              ] as [ChartLineKey, string, string, string][]).map(([key, label, color, hint]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ${visibleLines[key] ? 'border-slate-200 bg-white text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                  title={hint}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity: visibleLines[key] ? 1 : 0.35 }} />
                  {label}
                </button>
              ))}
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
                  {visibleLines.brokerage && <Area yAxisId="left" type="monotone" dataKey="chartBridgeAssets" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} name="Brokerage" />}
                  {visibleLines.retirement && <Line yAxisId="left" type="monotone" dataKey="chartRetirementAssets" stroke="#059669" strokeWidth={2.5} dot={false} name="401k" />}
                  {visibleLines.budgetLine && <Line yAxisId="right" type="monotone" dataKey="budgetLine" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} name="Retire budget" />}
                  {visibleLines.safeSpending && <Line yAxisId="right" type="monotone" dataKey="safeSpending" stroke="#d97706" strokeWidth={2.5} dot={false} connectNulls={false} name="Capacity / yr" />}
                  {visibleLines.liveOffReturns && <Line yAxisId="right" type="monotone" dataKey="liveOffReturns" stroke="#0891b2" strokeWidth={2.5} dot={false} connectNulls={false} name="Returns-only capacity" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {neverDepleteAge !== null ? (
              <p className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900"><span className="font-semibold">Never-deplete age: {neverDepleteAge}.</span> From here, the teal capacity line clears your budget in the separate returns-only strategy — your investments can fund spending without touching principal (in today&apos;s dollars).</p>
            ) : (
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span className="font-semibold">Not yet self-sustaining.</span> The teal returns-only capacity line stays below your budget through {settings.accessAge}, so this separate strategy would still require principal drawdown. Lower the budget or grow the portfolio to close the gap.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Left axis: <span className="font-medium text-[#2563eb]">blue</span> is the brokerage bridge after the retirement budget withdrawals. Right axis: <span className="font-medium text-[#dc2626]">red</span> is that budget rising {settings.inflationRate}%/yr. The <span className="font-medium text-[#d97706]">orange</span> and <span className="font-medium text-[#0891b2]">teal</span> lines are separate capacity overlays: they show what accessible assets could support under a withdrawal-rate plan or a returns-only plan, without driving the blue bridge line.</p>
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
            <p className="px-4 py-3 text-xs text-slate-500">The 401k contribution rises 1.5% of salary per year of service (capped at 15%). After age {settings.targetAge}, contributions stop and the brokerage is drawn down by your {formatCurrency(settings.retirementMonthlyBudgetAtTarget)}/mo age-{settings.targetAge} budget — note the withdrawal grows each year with {settings.inflationRate}% inflation.</p>
          </div>
        )}
      </PagePanel>
      )}
    </PageShell>
  );
}
