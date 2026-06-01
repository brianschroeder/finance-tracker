import {
  calculateDayChanges,
  calculateNetWorth,
  getActiveBudgetCategories,
  getAllAdditionalBudgetItems,
  getAllCreditCards,
  getAllFundAccounts,
  getAllInvestments,
  getAllTransactions,
  getBigPurchaseSpending,
  getCategorySpending,
  getLatestAssets,
  getPaySettings,
  getPendingTransactions,
  getTotalAdditionalBudgetAmount,
  getTransactionsByDateRange,
  type AdditionalBudgetItem,
  type AssetRecord,
  type CreditCard,
  type FundAccount,
  type Investment,
  type Transaction,
} from '@/lib/db';
import { addDays, format, subDays } from 'date-fns';

type PendingBill = {
  id: number;
  name: string;
  amount: number;
  dueDate: number | string;
  formattedDate?: string;
  daysUntilDue?: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  isCompleted?: boolean;
  isManual?: boolean;
  completedDate?: string;
};

type BudgetCategorySummary = {
  id: number;
  name: string;
  color: string;
  allocatedAmount: number;
  fullMonthAmount: number;
  spent: number;
  rawSpent: number;
  cashBack: number;
  pendingTipAmount: number;
  pendingCashbackAmount: number;
  creditCardPendingAmount: number;
  adjustedSpent: number;
  remaining: number;
  usedPercent: number;
};

export type BudgetValidationResult = {
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
    latest?: AssetRecord;
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
    holdings: Investment[];
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    dayChange: number;
    dayChangePercent: number;
  };
  funds: {
    accounts: FundAccount[];
    savingsTotal: number;
    investingTotal: number;
  };
  debt: {
    cards: CreditCard[];
    totalBalance: number;
    totalLimit: number;
    utilization: number;
  };
  categories: BudgetCategorySummary[];
  pendingBills: PendingBill[];
  recentTransactions: Transaction[];
  additionalBudgetItems: AdditionalBudgetItem[];
  needsAttention: Array<{
    title: string;
    description: string;
    severity: 'good' | 'info' | 'warning' | 'danger';
  }>;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const localDateKey = (date = new Date()) => format(date, 'yyyy-MM-dd');

function resolveBudgetPeriod() {
  const paySettings = getPaySettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!paySettings) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      periodType: 'month' as const,
      daysInPeriod: end.getDate(),
    };
  }

  const [year, month, day] = paySettings.lastPayDate.split('-').map((part) => parseInt(part, 10));
  const periodLength = paySettings.frequency === 'weekly' ? 7 : 14;
  let currentPeriodStart = new Date(year, month - 1, day);
  currentPeriodStart.setHours(0, 0, 0, 0);

  while (currentPeriodStart > today) {
    currentPeriodStart = subDays(currentPeriodStart, periodLength);
  }

  while (currentPeriodStart <= today) {
    const nextDate = addDays(currentPeriodStart, periodLength);
    if (today < nextDate) break;
    currentPeriodStart = nextDate;
  }

  const currentPeriodEnd = addDays(currentPeriodStart, periodLength - 1);

  return {
    startDate: format(currentPeriodStart, 'yyyy-MM-dd'),
    endDate: format(currentPeriodEnd, 'yyyy-MM-dd'),
    periodType: paySettings.frequency,
    daysInPeriod: periodLength,
  };
}

function calculateBudgetCategories(startDate: string, endDate: string, periodType: 'weekly' | 'biweekly' | 'month') {
  const allCategories = getActiveBudgetCategories();
  const categorySpending = getCategorySpending(startDate, endDate);
  const transactions = getTransactionsByDateRange(startDate, endDate);
  const pendingAmountsByCategory = new Map<number, {
    pendingTipAmount: number;
    pendingCashbackAmount: number;
    creditCardPendingAmount: number;
  }>();

  allCategories.forEach((category) => {
    if (category.id === undefined) return;
    pendingAmountsByCategory.set(category.id, {
      pendingTipAmount: 0,
      pendingCashbackAmount: 0,
      creditCardPendingAmount: 0,
    });
  });

  transactions.forEach((transaction) => {
    if (transaction.categoryId === null || !pendingAmountsByCategory.has(transaction.categoryId)) return;

    const amounts = pendingAmountsByCategory.get(transaction.categoryId);
    if (!amounts) return;

    if (transaction.pending && transaction.pendingTipAmount) {
      amounts.pendingTipAmount += transaction.pendingTipAmount;
    }

    if (transaction.cashBack && transaction.cashBack > 0 && transaction.cashbackPosted === false) {
      amounts.pendingCashbackAmount += transaction.cashBack;
    }

    if (transaction.creditCardPending) {
      amounts.creditCardPendingAmount += transaction.amount;
    }
  });

  return allCategories.map((category) => {
    const categoryId = category.id || 0;
    const spendingData = categorySpending.find((item) => item.id === categoryId);
    const spent = spendingData ? Math.abs(spendingData.spent) : 0;
    const cashBack = spendingData?.cashBack || 0;
    const rawSpent = spendingData?.rawSpent || 0;
    const amounts = pendingAmountsByCategory.get(categoryId) || {
      pendingTipAmount: 0,
      pendingCashbackAmount: 0,
      creditCardPendingAmount: 0,
    };

    let allocatedAmount = category.allocatedAmount;
    if (periodType === 'biweekly') {
      allocatedAmount = category.allocatedAmount * 0.5;
    } else if (periodType === 'weekly') {
      allocatedAmount = category.allocatedAmount * 0.25;
    }

    const adjustedSpent = spent + amounts.pendingTipAmount - amounts.pendingCashbackAmount + amounts.creditCardPendingAmount;
    const remaining = allocatedAmount - adjustedSpent;

    return {
      id: categoryId,
      name: category.name,
      color: category.color,
      allocatedAmount: money(allocatedAmount),
      fullMonthAmount: category.allocatedAmount,
      spent: money(spent),
      rawSpent: money(rawSpent),
      cashBack: money(cashBack),
      pendingTipAmount: money(amounts.pendingTipAmount),
      pendingCashbackAmount: money(amounts.pendingCashbackAmount),
      creditCardPendingAmount: money(amounts.creditCardPendingAmount),
      adjustedSpent: money(adjustedSpent),
      remaining: money(remaining),
      usedPercent: allocatedAmount > 0 ? Math.round((adjustedSpent / allocatedAmount) * 100) : 0,
    };
  });
}

export function getBudgetValidation(): BudgetValidationResult {
  const generatedAt = new Date().toISOString();
  const todayKey = localDateKey();
  const period = resolveBudgetPeriod();
  const latestAssets = getLatestAssets();
  const categories = calculateBudgetCategories(period.startDate, period.endDate, period.periodType);
  const bigPurchaseSpending = getBigPurchaseSpending(period.startDate, period.endDate);
  const pendingBills = getPendingTransactions() as PendingBill[];
  const additionalBudgetItems = getAllAdditionalBudgetItems();
  const additionalBudget = getTotalAdditionalBudgetAmount();
  const recentTransactions = getAllTransactions().slice(0, 8);
  const allPeriodTransactions = getTransactionsByDateRange(period.startDate, period.endDate);
  const funds = getAllFundAccounts();
  const investments = getAllInvestments();
  const investmentSummary = calculateDayChanges();
  const cards = getAllCreditCards();

  const unpaidBills = pendingBills
    .filter((bill) => !bill.isCompleted)
    .reduce((sum, bill) => sum + bill.amount, 0);
  const completedTodayBills = pendingBills
    .filter((bill) => bill.isCompleted && !bill.isManual && bill.completedDate === todayKey)
    .reduce((sum, bill) => sum + bill.amount, 0);
  // Robinhood checking is a live balance; same-day completed card/subscription
  // charges are already reflected there. Keep reporting completedTodayBills for
  // visibility, but do not reserve them a second time in adjusted checking.
  const completedTodayCheckingAdjustment = 0;
  const pendingTips = allPeriodTransactions
    .filter((transaction) => transaction.pending && transaction.pendingTipAmount)
    .reduce((sum, transaction) => sum + (transaction.pendingTipAmount || 0), 0);
  const pendingCashback = allPeriodTransactions
    .filter((transaction) => transaction.cashBack && transaction.cashBack > 0 && transaction.cashbackPosted === false)
    .reduce((sum, transaction) => sum + (transaction.cashBack || 0), 0);
  const creditCardPending = allPeriodTransactions
    .filter((transaction) => transaction.creditCardPending)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalAllocated = categories.reduce((sum, category) => sum + category.allocatedAmount, 0);
  const totalMonthlyAllocated = categories.reduce((sum, category) => sum + category.fullMonthAmount, 0);
  const totalSpent = categories.reduce((sum, category) => sum + category.spent, 0) + bigPurchaseSpending.totalSpent;
  const totalRawSpent = categories.reduce((sum, category) => sum + category.rawSpent, 0) + bigPurchaseSpending.totalRawSpent;
  const totalCashBack = categories.reduce((sum, category) => sum + category.cashBack, 0) + bigPurchaseSpending.totalCashBack;
  const totalAdjustedSpent = categories.reduce((sum, category) => sum + category.adjustedSpent, 0) + bigPurchaseSpending.totalSpent;
  const baseRemaining = totalAllocated - totalSpent - pendingTips;
  const workingBudget = baseRemaining + additionalBudget;
  const rawChecking = latestAssets?.checking || 0;
  const adjustedChecking = rawChecking - unpaidBills - completedTodayCheckingAdjustment - pendingTips + pendingCashback;
  const variance = adjustedChecking - workingBudget;

  const savingsTotal = funds
    .filter((fund) => !fund.isInvesting)
    .reduce((sum, fund) => sum + fund.amount, 0);
  const investingFundTotal = funds
    .filter((fund) => fund.isInvesting)
    .reduce((sum, fund) => sum + fund.amount, 0);
  const cardBalance = cards.reduce((sum, card) => sum + card.balance, 0);
  const cardLimit = cards.reduce((sum, card) => sum + card.limit, 0);
  // Net worth uses the shared canonical definition so the dashboard and the
  // savings plan always report the same number.
  const { netWorth, liquidCash, trackedInvestmentValue } = calculateNetWorth();
  const dailySpend = Array.from({ length: period.daysInPeriod }, (_, index) => {
    const date = format(addDays(new Date(`${period.startDate}T00:00:00`), index), 'yyyy-MM-dd');
    const spentThroughDate = allPeriodTransactions
      .filter((transaction) => transaction.date <= date)
      .reduce((sum, transaction) => sum + transaction.amount - (transaction.cashBack || 0), 0);

    return {
      date,
      spent: money(spentThroughDate),
      planned: money(totalAllocated * ((index + 1) / period.daysInPeriod)),
    };
  });

  const needsAttention: BudgetValidationResult['needsAttention'] = [];

  if (Math.abs(variance) <= 0.01) {
    needsAttention.push({
      title: 'Checking and budget are aligned',
      description: 'Adjusted checking matches the working budget after bills, tips, cashback, and additional budget.',
      severity: 'good',
    });
  } else {
    needsAttention.push({
      title: variance > 0 ? 'Checking has unassigned cash' : 'Budget is ahead of checking',
      description: `${money(Math.abs(variance)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} needs review against new transfers, declined items, bill completions, or additional budget entries.`,
      severity: variance > 0 ? 'info' : 'danger',
    });
  }

  if (unpaidBills > 0) {
    needsAttention.push({
      title: 'Bills still need room in checking',
      description: `${money(unpaidBills).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} is reserved for unpaid recurring or manual items in this pay period.`,
      severity: 'warning',
    });
  }

  if (pendingCashback > 0) {
    needsAttention.push({
      title: 'Cashback is not posted yet',
      description: `${money(pendingCashback).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} is included in the alignment check as expected incoming cash.`,
      severity: 'info',
    });
  }

  categories
    .filter((category) => category.remaining < 0)
    .slice(0, 3)
    .forEach((category) => {
      needsAttention.push({
        title: `${category.name} is over budget`,
        description: `${money(Math.abs(category.remaining)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} over for this pay period.`,
        severity: 'warning',
      });
    });

  return {
    generatedAt,
    period,
    status: {
      state: Math.abs(variance) <= 0.01 ? 'aligned' : variance > 0 ? 'surplus' : 'short',
      label: Math.abs(variance) <= 0.01 ? 'Aligned' : variance > 0 ? 'Extra cash' : 'Short',
      message: Math.abs(variance) <= 0.01
        ? 'Checking, bills, cashback, and budget line up.'
        : 'Review recent transactions, pending bills, additional budget, and declined items.',
    },
    checking: {
      rawBalance: money(rawChecking),
      adjustedBalance: money(adjustedChecking),
      unpaidBills: money(unpaidBills),
      completedTodayBills: money(completedTodayBills),
      pendingTips: money(pendingTips),
      pendingCashback: money(pendingCashback),
      creditCardPending: money(creditCardPending),
    },
    budget: {
      baseRemaining: money(baseRemaining),
      additionalBudget: money(additionalBudget),
      workingBudget: money(workingBudget),
      variance: money(variance),
      totalAllocated: money(totalAllocated),
      totalMonthlyAllocated: money(totalMonthlyAllocated),
      totalSpent: money(totalSpent),
      totalRawSpent: money(totalRawSpent),
      totalCashBack: money(totalCashBack),
      totalAdjustedSpent: money(totalAdjustedSpent),
      dailySpend,
    },
    assets: {
      latest: latestAssets,
      cash: money(latestAssets?.cash || 0),
      interest: money(latestAssets?.interest || 0),
      checking: money(rawChecking),
      liquidCash: money(liquidCash),
      savings: money(savingsTotal),
      stocks: money(trackedInvestmentValue),
      retirement401k: money(latestAssets?.retirement401k || 0),
      netWorth: money(netWorth),
    },
    investments: {
      holdings: investments,
      totalValue: money(investmentSummary.totalValue),
      totalCost: money(investmentSummary.totalCost),
      totalGainLoss: money(investmentSummary.totalGainLoss),
      dayChange: money(investmentSummary.dayChange),
      dayChangePercent: money(investmentSummary.dayChangePercent),
    },
    funds: {
      accounts: funds,
      savingsTotal: money(savingsTotal),
      investingTotal: money(investingFundTotal),
    },
    debt: {
      cards,
      totalBalance: money(cardBalance),
      totalLimit: money(cardLimit),
      utilization: cardLimit > 0 ? Math.round((cardBalance / cardLimit) * 100) : 0,
    },
    categories: categories.sort((a, b) => a.remaining - b.remaining),
    pendingBills,
    recentTransactions,
    additionalBudgetItems,
    needsAttention,
  };
}
