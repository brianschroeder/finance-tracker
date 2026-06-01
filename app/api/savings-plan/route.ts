import { NextResponse } from 'next/server';
import {
  calculateNetWorth,
  getActiveBudgetCategories,
  getAllAdditionalBudgetItems,
  getAllInvestments,
  getAllRecurringTransactions,
  getIncomeData,
  getInvestedThisYear,
  getPayPeriodsPerYear,
  getSavingsPlanData,
  saveSavingsPlanData,
} from '@/lib/db';

const DEFAULT_CURRENT_AGE = 30;
const DEFAULT_TARGET_AGE = 45;
const DEFAULT_ANNUAL_RETURN = 7;
const DEFAULT_WITHDRAWAL_RATE = 4;
const DEFAULT_INFLATION_RATE = 3;
const PENALTY_FREE_RETIREMENT_AGE = 59.5;
const MAX_SERVICE_401K_RATE = 15;
const SOCIAL_SECURITY_WAGE_BASE_2026 = 184500;
const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
const FEDERAL_SUPPLEMENTAL_BONUS_WITHHOLDING_RATE = 22;
const NEW_JERSEY_BONUS_TAX_ESTIMATE_RATE = 6.37;
const SOCIAL_SECURITY_RATE = 6.2;
const MEDICARE_RATE = 1.45;
const ADDITIONAL_MEDICARE_RATE = 0.9;

function money(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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
  annualGrowth: number;
};

/**
 * Single retirement projection and the source of truth for the dashboard.
 *
 * Phase 1 — accumulate (age < retireAge): add taxable brokerage savings and
 * 401k contributions every month, compound everything at the annual return.
 *
 * Phase 2 — drawdown (retireAge <= age < accessAge): no new contributions (no
 * income in early retirement); the taxable "bridge" is drawn down by living
 * expenses while the 401k keeps compounding untouched until it unlocks at the
 * penalty-free access age.
 */
function buildRetirementProjection(params: {
  currentTaxable: number;
  currentRetirement: number;
  taxableAnnualContribution: number;
  getRetirementAnnualContribution: (year: number) => number;
  annualExpenses: number;
  currentAge: number;
  retireAge: number;
  accessAge: number;
  endAge: number;
  annualReturn: number;
  inflationRate: number;
}): ProjectionPoint[] {
  const {
    currentTaxable,
    currentRetirement,
    taxableAnnualContribution,
    getRetirementAnnualContribution,
    annualExpenses,
    currentAge,
    retireAge,
    accessAge,
    endAge,
    annualReturn,
    inflationRate,
  } = params;

  const years = Math.max(0, Math.ceil(endAge - currentAge));
  const monthlyReturn = annualReturn / 100 / 12;

  const projection: ProjectionPoint[] = [{
    age: currentAge,
    year: 0,
    phase: 'accumulate',
    bridgeAssets: Math.round(currentTaxable),
    retirementAssets: Math.round(currentRetirement),
    totalAssets: Math.round(currentTaxable + currentRetirement),
    taxableContribution: 0,
    retirementContribution: 0,
    withdrawal: 0,
    annualGrowth: 0,
  }];

  let taxable = currentTaxable;
  let retirement = currentRetirement;

  for (let year = 1; year <= years; year += 1) {
    const startAge = currentAge + year - 1;
    const startTotal = taxable + retirement;
    const working = startAge < retireAge;
    const drawingDown = startAge >= retireAge && startAge < accessAge;

    // Retirement spending grows with inflation each year you're retired, so the
    // budget keeps its real purchasing power.
    const yearsRetired = Math.max(0, startAge - retireAge);
    const inflationFactor = Math.pow(1 + inflationRate / 100, yearsRetired);

    const taxableAnnual = working ? taxableAnnualContribution : 0;
    const retirementAnnual = working ? getRetirementAnnualContribution(year) : 0;
    const withdrawalAnnual = drawingDown ? annualExpenses * inflationFactor : 0;

    const taxableMonthlyContribution = taxableAnnual / 12;
    const retirementMonthlyContribution = retirementAnnual / 12;
    const withdrawalMonthly = withdrawalAnnual / 12;

    for (let month = 0; month < 12; month += 1) {
      taxable = taxable * (1 + monthlyReturn) + taxableMonthlyContribution - withdrawalMonthly;
      retirement = retirement * (1 + monthlyReturn) + retirementMonthlyContribution;
    }

    const netFlow = taxableAnnual + retirementAnnual - withdrawalAnnual;

    projection.push({
      age: currentAge + year,
      year,
      phase: working ? 'accumulate' : 'drawdown',
      bridgeAssets: Math.round(taxable),
      retirementAssets: Math.round(retirement),
      totalAssets: Math.round(taxable + retirement),
      taxableContribution: Math.round(taxableAnnual),
      retirementContribution: Math.round(retirementAnnual),
      withdrawal: Math.round(withdrawalAnnual),
      annualGrowth: Math.round(taxable + retirement - startTotal - netFlow),
    });
  }

  return projection;
}

function getService401kRate(yearsOfService: number, serviceRate: number) {
  return Math.min(MAX_SERVICE_401K_RATE, Math.max(0, yearsOfService) * Math.max(0, serviceRate));
}

function estimateNetBonus(salary: number, grossBonus: number) {
  const socialSecurityTaxableBonus = Math.min(Math.max(0, SOCIAL_SECURITY_WAGE_BASE_2026 - salary), grossBonus);
  const additionalMedicareTaxableBonus = Math.max(0, salary + grossBonus - ADDITIONAL_MEDICARE_THRESHOLD) - Math.max(0, salary - ADDITIONAL_MEDICARE_THRESHOLD);
  const federalWithholding = grossBonus * (FEDERAL_SUPPLEMENTAL_BONUS_WITHHOLDING_RATE / 100);
  const socialSecurity = socialSecurityTaxableBonus * (SOCIAL_SECURITY_RATE / 100);
  const medicare = grossBonus * (MEDICARE_RATE / 100);
  const additionalMedicare = Math.max(0, additionalMedicareTaxableBonus) * (ADDITIONAL_MEDICARE_RATE / 100);
  const newJersey = grossBonus * (NEW_JERSEY_BONUS_TAX_ESTIMATE_RATE / 100);
  const taxes = federalWithholding + socialSecurity + medicare + additionalMedicare + newJersey;

  return {
    grossBonus,
    federalWithholding,
    socialSecurity,
    medicare,
    additionalMedicare,
    newJersey,
    taxes,
    netBonus: Math.max(0, grossBonus - taxes),
    effectiveTaxRate: grossBonus > 0 ? (taxes / grossBonus) * 100 : 0,
  };
}

type SnapshotOverrides = Partial<{
  currentAge: number;
  targetAge: number;
  annualReturn: number;
  withdrawalRate: number;
  retirementMonthlyBudget: number;
  inflationRate: number;
}>;

function getSavingsPlanSnapshot(overrides: SnapshotOverrides = {}) {
  const investments = getAllInvestments();
  const income = getIncomeData();
  const budgetCategories = getActiveBudgetCategories();
  const recurringTransactions = getAllRecurringTransactions();
  const additionalBudgetItems = getAllAdditionalBudgetItems();
  const savedPlan = getSavingsPlanData();

  // ----- Net worth (canonical, shared with the dashboard) -----
  const worth = calculateNetWorth();
  const netWorth = worth.netWorth;

  // ----- Income -----
  const payFrequency = income?.payFrequency || 'biweekly';
  const payPeriodsPerYear = getPayPeriodsPerYear(payFrequency);
  const perPaycheck = money(income?.payAmount);
  const annualIncome = perPaycheck * payPeriodsPerYear;
  const salary = money(income?.salary);
  const bonusPercentage = money(income?.bonusPercentage);
  const annualBonus = salary * (bonusPercentage / 100);
  const bonusTaxEstimate = estimateNetBonus(salary, annualBonus);
  const yearsOfService = money(income?.yearsOfService);
  const service401kRate = money(income?.service401kRate ?? 1.5);
  const currentService401kRate = getService401kRate(yearsOfService, service401kRate);
  const annual401kContribution = salary * (currentService401kRate / 100);

  // ----- Expenses -----
  const monthlyBudget = budgetCategories.reduce((sum, category) => sum + money(category.allocatedAmount), 0);
  const monthlyRecurring = recurringTransactions.reduce((sum, transaction) => sum + money(transaction.amount), 0);
  const monthlyAdditional = additionalBudgetItems.reduce((sum, item) => sum + money(item.amount), 0);
  const monthlyExpenses = monthlyBudget + monthlyRecurring + monthlyAdditional;
  const annualExpenses = monthlyExpenses * 12;

  // ----- Savings -----
  const annualCashSavings = annualIncome - annualExpenses;
  const netBonus = bonusTaxEstimate.netBonus;
  const annualCashWithBonus = annualCashSavings + netBonus;
  const totalAnnualSavings = annualCashWithBonus + annual401kContribution;
  const monthlyPace = annualCashWithBonus / 12;
  const perPaycheckSurplus = annualCashSavings / payPeriodsPerYear;
  const cashIncomeWithBonus = annualIncome + netBonus;
  const savingsRate = cashIncomeWithBonus > 0 ? (annualCashWithBonus / cashIncomeWithBonus) * 100 : 0;

  // ----- Real progress this year (brokerage buys you actually made) -----
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const fractionElapsed = Math.min(1, Math.max(0, (now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())));
  const brokerageTarget = annualCashWithBonus;
  const brokerageInvested = getInvestedThisYear(now.getFullYear());
  const brokeragePace = brokerageTarget * fractionElapsed;

  // ----- Plan settings (dynamic / editable, with live-preview overrides) -----
  const currentAge = overrides.currentAge ?? savedPlan?.currentAge ?? DEFAULT_CURRENT_AGE;
  const targetAge = overrides.targetAge ?? savedPlan?.retirementAge ?? DEFAULT_TARGET_AGE;
  const annualReturn = overrides.annualReturn ?? savedPlan?.annualReturn ?? DEFAULT_ANNUAL_RETURN;
  const withdrawalRate = overrides.withdrawalRate ?? savedPlan?.withdrawalRate ?? DEFAULT_WITHDRAWAL_RATE;
  const inflationRate = overrides.inflationRate ?? savedPlan?.inflationRate ?? DEFAULT_INFLATION_RATE;
  const accessAge = PENALTY_FREE_RETIREMENT_AGE;
  const yearsToTarget = Math.max(0, targetAge - currentAge);

  // Retirement budget: what you expect to spend per month once retired. Defaults
  // to current spending, but can be raised (e.g. supporting a family later).
  const savedRetirementBudget = savedPlan?.retirementMonthlyBudget && savedPlan.retirementMonthlyBudget > 0
    ? savedPlan.retirementMonthlyBudget
    : null;
  const retirementMonthlyBudget = overrides.retirementMonthlyBudget ?? savedRetirementBudget ?? monthlyExpenses;
  const retirementAnnualExpenses = retirementMonthlyBudget * 12;

  // ----- Retirement projection (single source of truth) -----
  // Bridge = taxable brokerage (tracked investments). Funds/cash are allocations
  // of cash, not added separately. Retirement = 401k.
  const currentBridgeAssets = worth.stocks;
  const currentRetirementAssets = worth.retirement401k;
  const taxableAnnualContribution = annualCashWithBonus;
  const getRetirementAnnualContribution = (year: number) => {
    const projectedYearsOfService = yearsOfService + Math.max(0, year - 1);
    const projectedRate = getService401kRate(projectedYearsOfService, service401kRate);
    return salary * (projectedRate / 100);
  };
  const endAge = Math.max(targetAge, Math.ceil(accessAge));
  const projection = buildRetirementProjection({
    currentTaxable: currentBridgeAssets,
    currentRetirement: currentRetirementAssets,
    taxableAnnualContribution,
    getRetirementAnnualContribution,
    annualExpenses: retirementAnnualExpenses,
    currentAge,
    retireAge: targetAge,
    accessAge,
    endAge,
    annualReturn,
    inflationRate,
  });

  const targetPoint = projection.find(point => point.age === targetAge) || projection[projection.length - 1];
  const accessPoint = projection.find(point => point.age >= Math.ceil(accessAge)) || projection[projection.length - 1];

  const bridgeAtTarget = targetPoint.bridgeAssets;
  const retirementAtTarget = targetPoint.retirementAssets;
  const totalAtTarget = bridgeAtTarget + retirementAtTarget;
  const bridgeAtAccess = accessPoint.bridgeAssets;
  const totalAtAccess = accessPoint.bridgeAssets + accessPoint.retirementAssets;

  // 4% rule (or whatever withdrawal rate is set): the nest egg needed to fund
  // retirement expenses indefinitely.
  const fiNumber = withdrawalRate > 0 ? retirementAnnualExpenses / (withdrawalRate / 100) : 0;
  const fiSurplus = totalAtTarget - fiNumber;

  // Does the taxable bridge survive the gap between retiring and 401k access?
  const bridgeYears = Math.max(0, accessAge - targetAge);
  const depletionPoint = projection.find(point => point.phase === 'drawdown' && point.bridgeAssets <= 0);
  const bridgeLasts = !depletionPoint;
  const bridgeRunwayYears = depletionPoint ? Math.max(0, depletionPoint.age - targetAge) : bridgeYears;

  // ----- Verdict -----
  const fiOnTrack = totalAtTarget >= fiNumber;
  const onTrack = fiOnTrack && bridgeLasts;
  const gap = Math.round(Math.min(fiSurplus, bridgeLasts ? Infinity : bridgeAtAccess));
  let verdictDetail: string;
  if (onTrack) {
    verdictDetail = `Projected ${Math.round(totalAtTarget).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} at age ${targetAge}, above your ${Math.round(fiNumber).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} target, and the bridge funds all ${bridgeYears.toFixed(1)} years to age ${accessAge}.`;
  } else if (!bridgeLasts) {
    verdictDetail = `The taxable bridge runs out after about ${bridgeRunwayYears.toFixed(1)} of the ${bridgeYears.toFixed(1)} years before 401k access at ${accessAge}. Add taxable savings, trim expenses, or push the target age.`;
  } else {
    verdictDetail = `Projected total falls ${Math.abs(Math.round(fiSurplus)).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} short of the ${Math.round(fiNumber).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} target at the ${withdrawalRate}% rule.`;
  }

  return {
    settings: {
      currentAge,
      targetAge,
      annualReturn,
      withdrawalRate,
      inflationRate,
      retirementMonthlyBudget: round2(retirementMonthlyBudget),
      retirementAnnualExpenses: round2(retirementAnnualExpenses),
      accessAge,
      payFrequency,
      payPeriodsPerYear,
      yearsToTarget,
    },
    verdict: {
      state: onTrack ? 'on-track' : 'short',
      headline: onTrack ? `On track to retire at ${targetAge}` : `Short of retiring at ${targetAge}`,
      detail: verdictDetail,
      projectedTotalAtTarget: Math.round(totalAtTarget),
      fiNumber: Math.round(fiNumber),
      gap,
    },
    netWorth: {
      total: round2(netWorth),
      breakdown: [
        { name: 'Cash', value: round2(worth.liquidCash) },
        { name: 'Stocks', value: round2(worth.stocks) },
        { name: '401k', value: round2(worth.retirement401k) },
      ].filter(item => item.value !== 0),
      creditCardDebt: round2(worth.creditCardDebt),
      excluded: {
        checking: round2(worth.checking),
        note: 'Checking is a live spending balance; sinking funds are allocations of cash and are not counted separately.',
      },
    },
    income: {
      perPaycheck,
      payFrequency,
      payPeriodsPerYear,
      annualIncome,
      salary,
      annualBonus,
      bonusPercentage,
      netAnnualBonus: round2(netBonus),
      bonusTaxEstimate: {
        federalWithholding: round2(bonusTaxEstimate.federalWithholding),
        socialSecurity: round2(bonusTaxEstimate.socialSecurity),
        medicare: round2(bonusTaxEstimate.medicare),
        additionalMedicare: round2(bonusTaxEstimate.additionalMedicare),
        newJersey: round2(bonusTaxEstimate.newJersey),
        taxes: round2(bonusTaxEstimate.taxes),
        effectiveTaxRate: round2(bonusTaxEstimate.effectiveTaxRate),
      },
      annual401kContribution: round2(annual401kContribution),
      currentService401kRate: round2(currentService401kRate),
      totalCompensation: round2(salary + annualBonus + annual401kContribution),
    },
    expenses: {
      monthlyBudget: round2(monthlyBudget),
      monthlyRecurring: round2(monthlyRecurring),
      monthlyAdditional: round2(monthlyAdditional),
      monthlyExpenses: round2(monthlyExpenses),
      annualExpenses: round2(annualExpenses),
      breakdown: [
        { name: 'Budget', value: round2(monthlyBudget) },
        { name: 'Recurring', value: round2(monthlyRecurring) },
        { name: 'Additional', value: round2(monthlyAdditional) },
      ],
    },
    savings: {
      annualCashSavings: round2(annualCashSavings),
      netBonus: round2(netBonus),
      annualCashWithBonus: round2(annualCashWithBonus),
      annual401kContribution: round2(annual401kContribution),
      totalAnnualSavings: round2(totalAnnualSavings),
      monthlyPace: round2(monthlyPace),
      perPaycheckSurplus: round2(perPaycheckSurplus),
      savingsRate: round2(savingsRate),
    },
    progress: {
      year: now.getFullYear(),
      fractionElapsed: round2(fractionElapsed),
      brokerageTarget: round2(brokerageTarget),
      brokerageInvested: round2(brokerageInvested),
      brokeragePace: round2(brokeragePace),
      onPace: brokerageInvested >= brokeragePace,
      auto401k: round2(annual401kContribution),
    },
    strategy: {
      accessAge,
      withdrawalRate,
      yearsToTarget,
      taxableAnnualContribution: round2(taxableAnnualContribution),
      retirementAnnualContribution: round2(annual401kContribution),
      currentBridgeAssets: round2(currentBridgeAssets),
      currentRetirementAssets: round2(currentRetirementAssets),
      bridgeAtTarget: Math.round(bridgeAtTarget),
      retirementAtTarget: Math.round(retirementAtTarget),
      totalAtTarget: Math.round(totalAtTarget),
      bridgeAtAccess: Math.round(bridgeAtAccess),
      totalAtAccess: Math.round(totalAtAccess),
      fiNumber: Math.round(fiNumber),
      fiSurplus: Math.round(fiSurplus),
      bridgeYears: Math.round(bridgeYears * 10) / 10,
      bridgeLasts,
      bridgeRunwayYears: Math.round(bridgeRunwayYears * 10) / 10,
      projection,
    },
    investments: investments.map(investment => ({
      id: investment.id,
      symbol: investment.symbol,
      name: investment.name,
      shares: investment.shares,
      currentPrice: money(investment.currentPrice || investment.avgPrice),
      value: money(investment.shares) * money(investment.currentPrice || investment.avgPrice),
    })),
  };
}

export async function GET(request: Request) {
  try {
    // Optional query params let the UI preview different assumptions live
    // (without saving). Anything omitted falls back to the saved plan.
    const { searchParams } = new URL(request.url);
    const num = (key: string) => {
      const raw = searchParams.get(key);
      if (raw === null || raw === '') return undefined;
      const value = Number(raw);
      return Number.isFinite(value) ? value : undefined;
    };

    const overrides = {
      currentAge: num('currentAge'),
      targetAge: num('targetAge'),
      annualReturn: num('annualReturn'),
      withdrawalRate: num('withdrawalRate'),
      retirementMonthlyBudget: num('retirementMonthlyBudget'),
      inflationRate: num('inflationRate'),
    };

    return NextResponse.json(getSavingsPlanSnapshot(overrides));
  } catch (error) {
    console.error('Error fetching savings plan data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings plan data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentSnapshot = getSavingsPlanSnapshot();
    const data = await request.json();
    const currentAge = Number(data.currentAge);
    const targetAge = Number(data.targetAge);
    const annualReturn = Number(data.annualReturn);
    const withdrawalRate = data.withdrawalRate === undefined
      ? currentSnapshot.settings.withdrawalRate
      : Number(data.withdrawalRate);
    const retirementMonthlyBudget = data.retirementMonthlyBudget === undefined || data.retirementMonthlyBudget === null || data.retirementMonthlyBudget === ''
      ? currentSnapshot.settings.retirementMonthlyBudget
      : Number(data.retirementMonthlyBudget);
    const inflationRate = data.inflationRate === undefined || data.inflationRate === null || data.inflationRate === ''
      ? currentSnapshot.settings.inflationRate
      : Number(data.inflationRate);

    if (!Number.isFinite(currentAge) || currentAge < 18 || currentAge > 100) {
      return NextResponse.json({ error: 'Current age must be between 18 and 100' }, { status: 400 });
    }

    if (!Number.isFinite(targetAge) || targetAge <= currentAge || targetAge > 100) {
      return NextResponse.json({ error: 'Target age must be greater than current age and less than 100' }, { status: 400 });
    }

    if (!Number.isFinite(annualReturn) || annualReturn < -20 || annualReturn > 30) {
      return NextResponse.json({ error: 'Annual return must be between -20% and 30%' }, { status: 400 });
    }

    if (!Number.isFinite(withdrawalRate) || withdrawalRate < 1 || withdrawalRate > 10) {
      return NextResponse.json({ error: 'Withdrawal rate must be between 1% and 10%' }, { status: 400 });
    }

    if (!Number.isFinite(retirementMonthlyBudget) || retirementMonthlyBudget < 0 || retirementMonthlyBudget > 1000000) {
      return NextResponse.json({ error: 'Retirement budget must be a positive monthly amount' }, { status: 400 });
    }

    if (!Number.isFinite(inflationRate) || inflationRate < 0 || inflationRate > 15) {
      return NextResponse.json({ error: 'Inflation rate must be between 0% and 15%' }, { status: 400 });
    }

    saveSavingsPlanData({
      currentAge,
      retirementAge: targetAge,
      currentSavings: currentSnapshot.netWorth.total,
      yearlyContribution: currentSnapshot.savings.totalAnnualSavings,
      yearlyBonus: 0,
      yearlyBonusPercentage: 0,
      annualReturn,
      withdrawalRate,
      retirementMonthlyBudget,
      inflationRate,
    });

    return NextResponse.json(getSavingsPlanSnapshot());
  } catch (error) {
    console.error('Error saving savings plan data:', error);
    return NextResponse.json(
      { error: 'Failed to save savings plan data' },
      { status: 500 }
    );
  }
}
