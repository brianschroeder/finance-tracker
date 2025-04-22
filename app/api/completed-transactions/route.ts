import { NextResponse } from 'next/server';
import { saveCompletedTransaction, deleteCompletedTransaction, getCompletedTransactionsForPayPeriod } from '@/lib/db';

// POST - Mark a transaction as completed
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the input data
    if (!data.recurringTransactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    if (!data.payPeriodStart || !data.payPeriodEnd) {
      return NextResponse.json(
        { error: 'Pay period information is required' },
        { status: 400 }
      );
    }
    
    // Get current date in YYYY-MM-DD format for completedDate
    const today = new Date();
    const completedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Save to database
    const id = saveCompletedTransaction({
      recurringTransactionId: data.recurringTransactionId,
      completedDate: completedDate,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd
    });
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error marking transaction as completed:', error);
    return NextResponse.json(
      { error: 'Failed to mark transaction as completed' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a transaction from completed list
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    const result = deleteCompletedTransaction(parseInt(id));
    
    if (result === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing completed transaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove completed transaction' },
      { status: 500 }
    );
  }
}

// GET - Get completed transactions for a pay period
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payPeriodStart = searchParams.get('payPeriodStart');
    const payPeriodEnd = searchParams.get('payPeriodEnd');
    
    if (!payPeriodStart || !payPeriodEnd) {
      return NextResponse.json(
        { error: 'Pay period dates are required' },
        { status: 400 }
      );
    }
    
    const completedTransactions = getCompletedTransactionsForPayPeriod(payPeriodStart, payPeriodEnd);
    
    return NextResponse.json({ transactions: completedTransactions });
  } catch (error) {
    console.error('Error retrieving completed transactions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve completed transactions' },
      { status: 500 }
    );
  }
} 