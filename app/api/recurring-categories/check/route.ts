import { NextResponse } from 'next/server';
import { 
  getAllRecurringCategories,
  getAllRecurringTransactions
} from '@/lib/db';

// Debug endpoint to check all categories and transactions
export async function GET() {
  try {
    const categories = getAllRecurringCategories();
    const transactions = getAllRecurringTransactions();
    
    // Extract category IDs being used by transactions
    const usedCategoryIds = transactions
      .filter(t => t.categoryId !== null && t.categoryId !== undefined)
      .map(t => t.categoryId);
    
    return NextResponse.json({
      categories,
      usedCategoryIds,
      message: "This endpoint is for debugging foreign key constraints"
    });
  } catch (error) {
    console.error('Error retrieving debug data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve debug data' },
      { status: 500 }
    );
  }
} 