import { NextResponse } from 'next/server';
import { 
  getPendingTransactions, 
  updateRecurringTransaction, 
  getAllRecurringTransactions,
  updatePendingTransactionAmount
} from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const pendingTransactions = getPendingTransactions();
    
    // Calculate total amount
    const totalAmount = pendingTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    return NextResponse.json({ 
      transactions: pendingTransactions,
      totalAmount,
      count: pendingTransactions.length
    });
  } catch (error) {
    console.error('Error retrieving pending transactions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve pending transactions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate transaction ID
    if (!data.id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    // Validate amount
    if (data.amount === undefined) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }
    
    // Validate pay period data
    if (!data.payPeriodStart || !data.payPeriodEnd) {
      return NextResponse.json(
        { error: 'Pay period information is required' },
        { status: 400 }
      );
    }
    
    // Use the new function to update only the pending transaction amount for this period
    updatePendingTransactionAmount(
      data.id,
      parseFloat(data.amount),
      data.payPeriodStart,
      data.payPeriodEnd
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Transaction amount updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction amount:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction amount' },
      { status: 500 }
    );
  }
} 