import { NextResponse } from 'next/server';
import { 
  getAllRecurringTransactions,
  saveRecurringTransaction,
  RecurringTransaction,
  getDb,
  getRecurringCategoryById,
  validateRecurringCategoryId
} from '@/lib/db';

// Get all recurring transactions
export async function GET() {
  try {
    const transactions = getAllRecurringTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error retrieving recurring transactions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recurring transactions', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Create a new recurring transaction
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the request data
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json(
        { error: 'Transaction name is required' },
        { status: 400 }
      );
    }
    
    const amount = parseFloat(data.amount);
    if (isNaN(amount)) {
      return NextResponse.json(
        { error: 'Amount must be a valid number' },
        { status: 400 }
      );
    }
    
    const dueDate = parseInt(data.dueDate, 10);
    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      return NextResponse.json(
        { error: 'Due date must be a valid day of the month (1-31)' },
        { status: 400 }
      );
    }
    
    // Sanitize category ID - make sure it's a number or null
    let categoryId = null;
    if (data.categoryId !== undefined && data.categoryId !== null) {
      // If it's a string, try to convert to number
      if (typeof data.categoryId === 'string') {
        const parsedId = parseInt(data.categoryId, 10);
        if (!isNaN(parsedId)) {
          categoryId = parsedId;
        }
      } 
      // If it's already a number, use it directly
      else if (typeof data.categoryId === 'number') {
        categoryId = data.categoryId;
      }
    }
    
    // Validate that the category exists
    categoryId = validateRecurringCategoryId(categoryId);
    
    // Create transaction object
    const transaction: RecurringTransaction = {
      name: data.name.trim(),
      amount,
      dueDate,
      isEssential: !!data.isEssential,
      categoryId
    };
    
    console.log('Creating transaction with:', {
      ...transaction,
      categoryIdType: categoryId !== null ? typeof categoryId : 'null'
    });
    
    // Temporarily disable foreign keys for the create if needed
    const db = getDb();
    const foreignKeysWereOn = db.pragma('foreign_keys', { simple: true }) === 1;
    
    try {
      if (foreignKeysWereOn) {
        console.log('Temporarily disabling foreign key constraints');
        db.pragma('foreign_keys = OFF');
      }
      
      // Save to database
      const id = saveRecurringTransaction(transaction);
      
      return NextResponse.json({ 
        id, 
        success: true,
        transaction: { ...transaction, id }
      });
    } finally {
      // Restore foreign key constraints if they were on
      if (foreignKeysWereOn) {
        console.log('Re-enabling foreign key constraints');
        db.pragma('foreign_keys = ON');
      }
    }
    
  } catch (error) {
    console.error('Error saving recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to save recurring transaction', details: (error as Error).message },
      { status: 500 }
    );
  }
} 