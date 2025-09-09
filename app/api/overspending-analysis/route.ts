import { NextRequest, NextResponse } from 'next/server';
import { 
  getPaySettings,
  getTransactionsByDateRange, 
  getActiveBudgetCategories,
  Transaction,
  BudgetCategory
} from '@/lib/db';
import { addDays, subDays, format, differenceInDays } from 'date-fns';

interface OverspendingPeriod {
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalSpent: number;
  overspent: number;
  categories: CategoryOverspending[];
  biggestTransactions: Transaction[];
}

interface CategoryOverspending {
  id: number;
  name: string;
  color: string;
  budgetAmount: number;
  spent: number;
  overspent: number;
  overspentPercentage: number;
  transactions: Transaction[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodsParam = searchParams.get('periods');
    const periods = periodsParam ? parseInt(periodsParam, 10) : 6; // Default to last 6 pay periods
    
    // Get pay settings to calculate bi-weekly periods
    const paySettings = getPaySettings();
    if (!paySettings) {
      return NextResponse.json(
        { error: 'Pay settings not configured. Please set up your pay schedule first.' },
        { status: 400 }
      );
    }

    // Get all active budget categories
    const budgetCategories = getActiveBudgetCategories();
    
    // Calculate pay periods
    const payPeriods = calculatePayPeriods(paySettings, periods);
    
    // Analyze each pay period for overspending
    const overspendingData: OverspendingPeriod[] = [];
    
    for (const period of payPeriods) {
      const periodData = await analyzePeriodOverspending(
        period.startDate,
        period.endDate,
        budgetCategories
      );
      overspendingData.push(periodData);
    }
    
    // Calculate summary statistics
    const summary = calculateOverspendingSummary(overspendingData);
    
    return NextResponse.json({
      periods: overspendingData,
      summary,
      payFrequency: paySettings.frequency
    });
  } catch (error) {
    console.error('Error analyzing overspending:', error);
    return NextResponse.json(
      { error: 'Failed to analyze overspending data' },
      { status: 500 }
    );
  }
}

function calculatePayPeriods(paySettings: any, numPeriods: number) {
  const periods = [];
  
  // Parse the last pay date
  const [year, month, day] = paySettings.lastPayDate.split('-').map((num: string) => parseInt(num, 10));
  const lastPayDate = new Date(year, month - 1, day);
  lastPayDate.setHours(0, 0, 0, 0);
  
  // Calculate period length
  const periodLength = paySettings.frequency === 'weekly' ? 7 : 14;
  
  // Start from the most recent period and work backwards
  let currentPeriodEnd = new Date(lastPayDate);
  
  // Find the most recent completed period
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  while (currentPeriodEnd > today) {
    currentPeriodEnd = subDays(currentPeriodEnd, periodLength);
  }
  
  // Generate the requested number of periods
  for (let i = 0; i < numPeriods; i++) {
    const periodStart = subDays(currentPeriodEnd, periodLength - 1);
    
    periods.unshift({
      startDate: format(periodStart, 'yyyy-MM-dd'),
      endDate: format(currentPeriodEnd, 'yyyy-MM-dd')
    });
    
    currentPeriodEnd = subDays(currentPeriodEnd, periodLength);
  }
  
  return periods;
}

async function analyzePeriodOverspending(
  startDate: string,
  endDate: string,
  budgetCategories: BudgetCategory[]
): Promise<OverspendingPeriod> {
  // Get all transactions for this period
  const transactions = getTransactionsByDateRange(startDate, endDate);
  
  // Calculate days in period for budget allocation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysInPeriod = differenceInDays(end, start) + 1;
  
  // Analyze each category
  const categoryOverspending: CategoryOverspending[] = [];
  let totalBudget = 0;
  let totalSpent = 0;
  
  for (const category of budgetCategories) {
    // Calculate pro-rated budget for this period (assuming monthly budgets)
    const monthlyBudget = category.allocatedAmount || 0;
    const periodBudget = (monthlyBudget / 30) * daysInPeriod; // Pro-rate based on days
    totalBudget += periodBudget;
    
    // Get transactions for this category
    const categoryTransactions = transactions.filter(
      (t: Transaction) => t.categoryId === category.id
    );
    
    // Calculate total spent (use absolute values since expenses are negative)
    const categorySpent = categoryTransactions.reduce(
      (sum: number, t: Transaction) => sum + Math.abs(t.amount), 
      0
    );
    totalSpent += categorySpent;
    
    // Calculate overspending
    const overspent = Math.max(0, categorySpent - periodBudget);
    const overspentPercentage = periodBudget > 0 ? (overspent / periodBudget) * 100 : 0;
    
    if (overspent > 0) {
      categoryOverspending.push({
        id: category.id!,
        name: category.name,
        color: category.color,
        budgetAmount: periodBudget,
        spent: categorySpent,
        overspent,
        overspentPercentage,
        transactions: categoryTransactions
      });
    }
  }
  
  // Sort categories by overspent amount (highest first)
  categoryOverspending.sort((a, b) => b.overspent - a.overspent);
  
  // Get biggest transactions for the period (top 10)
  const allTransactions = transactions.map((t: Transaction) => ({
    ...t,
    amount: Math.abs(t.amount) // Use absolute values for sorting
  }));
  allTransactions.sort((a: Transaction, b: Transaction) => b.amount - a.amount);
  const biggestTransactions = allTransactions.slice(0, 10);
  
  const totalOverspent = Math.max(0, totalSpent - totalBudget);
  
  return {
    startDate,
    endDate,
    totalBudget,
    totalSpent,
    overspent: totalOverspent,
    categories: categoryOverspending,
    biggestTransactions
  };
}

function calculateOverspendingSummary(periods: OverspendingPeriod[]) {
  const totalOverspent = periods.reduce((sum, period) => sum + period.overspent, 0);
  const averageOverspent = totalOverspent / periods.length;
  
  // Find most problematic categories across all periods
  const categoryTotals: { [key: string]: { name: string; color: string; totalOverspent: number; occurrences: number } } = {};
  
  periods.forEach(period => {
    period.categories.forEach(cat => {
      const key = cat.id.toString();
      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          name: cat.name,
          color: cat.color,
          totalOverspent: 0,
          occurrences: 0
        };
      }
      categoryTotals[key].totalOverspent += cat.overspent;
      categoryTotals[key].occurrences += 1;
    });
  });
  
  // Convert to array and sort by total overspent
  const problematicCategories = Object.entries(categoryTotals)
    .map(([id, data]) => ({
      id: parseInt(id),
      ...data,
      averageOverspent: data.totalOverspent / data.occurrences
    }))
    .sort((a, b) => b.totalOverspent - a.totalOverspent);
  
  return {
    totalOverspent,
    averageOverspent,
    periodsAnalyzed: periods.length,
    problematicCategories: problematicCategories.slice(0, 5) // Top 5 most problematic
  };
}
