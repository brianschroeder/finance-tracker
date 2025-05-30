import { NextRequest, NextResponse } from 'next/server';
import { 
  getCategorySpending, 
  getActiveBudgetCategories, 
  getPaySettings,
  getTransactionsByDateRange, 
  Transaction
} from '@/lib/db';
import { addDays, subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const periodType = searchParams.get('periodType') || 'month'; // 'month', 'biweekly', or 'custom'
    
    // Get pay settings for biweekly calculations
    const paySettings = getPaySettings();
    
    let startDateStr = startDate;
    let endDateStr = endDate;
    
    // If no dates provided or biweekly period requested, calculate appropriate dates
    if (periodType === 'biweekly' && paySettings) {
      // Parse the last pay date from settings
      const [year, month, day] = paySettings.lastPayDate.split('-').map(num => parseInt(num, 10));
      const lastPayDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
      
      // Calculate the current pay period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentPeriodStart = new Date(lastPayDate);
      let currentPeriodEnd;
      
      // Find the current biweekly period
      while (currentPeriodStart > today) {
        currentPeriodStart = subDays(currentPeriodStart, paySettings.frequency === 'weekly' ? 7 : 14);
      }
      
      while (currentPeriodStart <= today) {
        const nextDate = addDays(currentPeriodStart, paySettings.frequency === 'weekly' ? 7 : 14);
        if (today < nextDate) {
          break;
        }
        currentPeriodStart = nextDate;
      }
      
      // Current period end is calculated based on frequency
      currentPeriodEnd = addDays(currentPeriodStart, paySettings.frequency === 'weekly' ? 6 : 13);
      
      // Format dates for API
      startDateStr = format(currentPeriodStart, 'yyyy-MM-dd');
      endDateStr = format(currentPeriodEnd, 'yyyy-MM-dd');
    } else if (!startDateStr || !endDateStr) {
      // Default to current month if dates not provided and not biweekly
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      startDateStr = startDate || firstDayOfMonth.toISOString().split('T')[0];
      endDateStr = endDate || lastDayOfMonth.toISOString().split('T')[0];
    }
    
    // Get category spending data
    const categorySpending = getCategorySpending(startDateStr, endDateStr);
    
    // Get all active categories (in case there are categories with no transactions)
    const allCategories = getActiveBudgetCategories();
    
    // Get all transactions in the date range to calculate pending amounts
    const transactions = getTransactionsByDateRange(startDateStr, endDateStr);
    
    // Calculate pending amounts by category
    const pendingAmountsByCategory = new Map<number, { pendingTipAmount: number, pendingCashbackAmount: number }>();
    
    // Initialize map with all categories
    allCategories.forEach(category => {
      pendingAmountsByCategory.set(category.id, { 
        pendingTipAmount: 0,
        pendingCashbackAmount: 0
      });
    });
    
    // Calculate pending tip amounts and pending cashback for each category
    transactions.forEach((transaction: Transaction) => {
      const categoryId = transaction.categoryId;
      if (categoryId !== null && pendingAmountsByCategory.has(categoryId)) {
        const currentAmounts = pendingAmountsByCategory.get(categoryId);
        
        // Add pending tip amounts for pending transactions
        if (currentAmounts && transaction.pending && transaction.pendingTipAmount) {
          currentAmounts.pendingTipAmount += transaction.pendingTipAmount;
        }
        
        // Add pending cashback for transactions with unposted cashback
        if (currentAmounts && transaction.cashBack && transaction.cashBack > 0 && transaction.cashbackPosted === false) {
          currentAmounts.pendingCashbackAmount += transaction.cashBack;
        }
        
        if (currentAmounts) {
          pendingAmountsByCategory.set(categoryId, currentAmounts);
        }
      }
    });
    
    // Calculate the number of days in the period for pro-rating
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Determine if we need to prorate the allocated amount
    const isProratedPeriod = periodType === 'biweekly' || periodType === 'custom';
    
    // Track total pending amounts
    let totalPendingTipAmount = 0;
    let totalPendingCashbackAmount = 0;
    
    // Merge the data to ensure all active categories are included
    const mergedData = allCategories.map(category => {
      const spendingData = categorySpending.find(item => item.id === category.id);
      const spent = spendingData ? Math.abs(spendingData.spent) : 0;
      const cashBack = spendingData ? spendingData.cashBack || 0 : 0;
      const rawSpent = spendingData ? spendingData.rawSpent || 0 : 0;
      
      // Get pending amounts for this category
      const pendingAmounts = pendingAmountsByCategory.get(category.id) || { 
        pendingTipAmount: 0, 
        pendingCashbackAmount: 0 
      };
      
      // Update totals
      totalPendingTipAmount += pendingAmounts.pendingTipAmount;
      totalPendingCashbackAmount += pendingAmounts.pendingCashbackAmount;
      
      // If biweekly period, prorate the monthly budget to biweekly
      let allocatedAmount = category.allocatedAmount;
      
      if (isProratedPeriod) {
        // For biweekly or custom periods, prorate the monthly allocation based on days
        if (periodType === 'biweekly') {
          // For biweekly periods, use exactly half of the monthly budget
          allocatedAmount = category.allocatedAmount * 0.5;
        } else {
          // For custom periods, continue to prorate based on days
          const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
          allocatedAmount = (category.allocatedAmount / daysInMonth) * dayCount;
        }
      }
      
      // Calculate the adjusted spent amount with pending tips and without pending cashback
      const adjustedSpent = spent + pendingAmounts.pendingTipAmount - pendingAmounts.pendingCashbackAmount;
      
      return {
        id: category.id,
        name: category.name,
        allocatedAmount: allocatedAmount,
        fullMonthAmount: category.allocatedAmount, // Original monthly amount
        color: category.color,
        spent: spent,
        cashBack: cashBack,
        rawSpent: rawSpent,
        pendingTipAmount: pendingAmounts.pendingTipAmount,
        pendingCashbackAmount: pendingAmounts.pendingCashbackAmount,
        adjustedSpent: adjustedSpent, // New field that includes pending tips and without pending cashback
        remaining: allocatedAmount - adjustedSpent, // Adjust remaining to account for pending amounts
        daysInPeriod: dayCount
      };
    });
    
    // Calculate totals
    const totalAllocated = mergedData.reduce((sum, category) => sum + category.allocatedAmount, 0);
    const totalMonthlyAllocated = mergedData.reduce((sum, category) => sum + category.fullMonthAmount, 0);
    const totalSpent = mergedData.reduce((sum, category) => sum + category.spent, 0);
    const totalCashBack = mergedData.reduce((sum, category) => sum + category.cashBack, 0);
    const totalRawSpent = mergedData.reduce((sum, category) => sum + category.rawSpent, 0);
    const totalAdjustedSpent = mergedData.reduce((sum, category) => sum + category.adjustedSpent, 0);
    const totalRemaining = totalAllocated - totalAdjustedSpent;
    
    return NextResponse.json({
      categories: mergedData,
      summary: {
        totalAllocated,
        totalMonthlyAllocated,
        totalSpent,
        totalCashBack,
        totalRawSpent,
        totalAdjustedSpent,
        totalRemaining,
        totalPendingTipAmount,
        totalPendingCashbackAmount,
        startDate: startDateStr,
        endDate: endDateStr,
        daysInPeriod: dayCount,
        periodType
      }
    });
    
  } catch (error) {
    console.error('Error fetching budget analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget analysis' },
      { status: 500 }
    );
  }
} 