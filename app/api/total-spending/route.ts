import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveCategories, getTransactionsByDateRange } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Get all active categories (both budget and tracking)
    const allCategories = getAllActiveCategories();
    
    // Get all transactions in the date range
    const transactions = getTransactionsByDateRange(startDate, endDate);
    
    // Calculate spending by category type
    const budgetSpending = new Map<number, { spent: number, cashBack: number, rawSpent: number }>();
    const trackingSpending = new Map<number, { spent: number, cashBack: number, rawSpent: number }>();
    
    // Initialize maps with all categories
    allCategories.forEach(category => {
      const initData = { spent: 0, cashBack: 0, rawSpent: 0 };
      if (category.isBudgetCategory) {
        budgetSpending.set(category.id!, initData);
      } else {
        trackingSpending.set(category.id!, initData);
      }
    });

    // Process transactions
    transactions.forEach((transaction: any) => {
      if (transaction.categoryId) {
        const category = allCategories.find(cat => cat.id === transaction.categoryId);
        if (category) {
          const amount = Math.abs(transaction.amount);
          const cashBack = transaction.cashBack || 0;
          const data = { 
            spent: amount - cashBack, 
            cashBack: cashBack, 
            rawSpent: amount 
          };
          
          if (category.isBudgetCategory) {
            const existing = budgetSpending.get(category.id!) || { spent: 0, cashBack: 0, rawSpent: 0 };
            budgetSpending.set(category.id!, {
              spent: existing.spent + data.spent,
              cashBack: existing.cashBack + data.cashBack,
              rawSpent: existing.rawSpent + data.rawSpent
            });
          } else {
            const existing = trackingSpending.get(category.id!) || { spent: 0, cashBack: 0, rawSpent: 0 };
            trackingSpending.set(category.id!, {
              spent: existing.spent + data.spent,
              cashBack: existing.cashBack + data.cashBack,
              rawSpent: existing.rawSpent + data.rawSpent
            });
          }
        }
      }
    });

    // Build category details for budget categories
    const budgetCategories = allCategories
      .filter(cat => cat.isBudgetCategory)
      .map(category => {
        const spending = budgetSpending.get(category.id!) || { spent: 0, cashBack: 0, rawSpent: 0 };
        return {
          id: category.id,
          name: category.name,
          color: category.color,
          spent: spending.spent,
          cashBack: spending.cashBack,
          rawSpent: spending.rawSpent,
          allocatedAmount: category.allocatedAmount,
          isBudgetCategory: true
        };
      });

    // Build category details for tracking categories
    const trackingCategories = allCategories
      .filter(cat => !cat.isBudgetCategory)
      .map(category => {
        const spending = trackingSpending.get(category.id!) || { spent: 0, cashBack: 0, rawSpent: 0 };
        return {
          id: category.id,
          name: category.name,
          color: category.color,
          spent: spending.spent,
          cashBack: spending.cashBack,
          rawSpent: spending.rawSpent,
          allocatedAmount: 0,
          isBudgetCategory: false
        };
      });

    // Calculate totals
    const totalBudgetSpent = Array.from(budgetSpending.values()).reduce((sum, data) => sum + data.spent, 0);
    const totalBudgetCashBack = Array.from(budgetSpending.values()).reduce((sum, data) => sum + data.cashBack, 0);
    const totalBudgetRawSpent = Array.from(budgetSpending.values()).reduce((sum, data) => sum + data.rawSpent, 0);

    const totalTrackingSpent = Array.from(trackingSpending.values()).reduce((sum, data) => sum + data.spent, 0);
    const totalTrackingCashBack = Array.from(trackingSpending.values()).reduce((sum, data) => sum + data.cashBack, 0);
    const totalTrackingRawSpent = Array.from(trackingSpending.values()).reduce((sum, data) => sum + data.rawSpent, 0);

    const totalOverallSpent = totalBudgetSpent + totalTrackingSpent;
    const totalOverallCashBack = totalBudgetCashBack + totalTrackingCashBack;
    const totalOverallRawSpent = totalBudgetRawSpent + totalTrackingRawSpent;

    return NextResponse.json({
      budgetCategories,
      trackingCategories,
      summary: {
        budget: {
          totalSpent: totalBudgetSpent,
          totalCashBack: totalBudgetCashBack,
          totalRawSpent: totalBudgetRawSpent,
          categoryCount: budgetCategories.length
        },
        tracking: {
          totalSpent: totalTrackingSpent,
          totalCashBack: totalTrackingCashBack,
          totalRawSpent: totalTrackingRawSpent,
          categoryCount: trackingCategories.length
        },
        overall: {
          totalSpent: totalOverallSpent,
          totalCashBack: totalOverallCashBack,
          totalRawSpent: totalOverallRawSpent,
          totalCategories: budgetCategories.length + trackingCategories.length
        },
        startDate,
        endDate
      }
    });
    
  } catch (error) {
    console.error('Error fetching total spending:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total spending', details: String(error) },
      { status: 500 }
    );
  }
} 