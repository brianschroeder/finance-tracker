import { NextResponse } from 'next/server';
import { 
  getAllRecurringTransactions,
  saveRecurringTransaction,
  RecurringTransaction
} from '@/lib/db';

// Get all recurring transactions
export async function GET() {
  try {
    const transactions = getAllRecurringTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error retrieving recurring transactions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recurring transactions' },
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
    
    // Create transaction object
    const transaction: RecurringTransaction = {
      name: data.name.trim(),
      amount,
      dueDate,
      isEssential: !!data.isEssential
    };
    
    // Save to database
    const id = saveRecurringTransaction(transaction);
    
    return NextResponse.json({ 
      id, 
      success: true,
      transaction: { ...transaction, id }
    });
    
  } catch (error) {
    console.error('Error saving recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to save recurring transaction' },
      { status: 500 }
    );
  }
} 