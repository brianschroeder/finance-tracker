import { NextRequest, NextResponse } from 'next/server';
import { 
  getTransactionById,
  updateTransaction, 
  deleteTransaction,
  Transaction
} from '@/lib/db';

// GET /api/transactions/[id] - Get transaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }
    
    const transaction = getTransactionById(id);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }
    
    // Check if transaction exists
    const existingTransaction = getTransactionById(id);
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Parse the request body
    let data;
    try {
      data = await request.json();
    } catch (jsonError) {
      console.error('Error parsing request JSON:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!data.date || !data.name || data.amount === undefined) {
      return NextResponse.json(
        { error: 'Date, name, and amount are required fields' },
        { status: 400 }
      );
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    
    // Validate amount is a number
    if (isNaN(Number(data.amount))) {
      return NextResponse.json(
        { error: 'Amount must be a number' },
        { status: 400 }
      );
    }
    
    // Validate cashBack is a number and non-negative if provided
    if (data.cashBack !== undefined && (isNaN(Number(data.cashBack)) || Number(data.cashBack) < 0)) {
      return NextResponse.json(
        { error: 'Cash back must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Ensure boolean values are properly formatted
    const cashbackPosted = typeof data.cashbackPosted === 'boolean' 
      ? data.cashbackPosted 
      : data.cashbackPosted === 'true' || data.cashbackPosted === true || data.cashbackPosted === 1;
    
    const pending = typeof data.pending === 'boolean'
      ? data.pending
      : data.pending === 'true' || data.pending === true || data.pending === 1;
    
    // Create the transaction object for update
    const transaction: Transaction = {
      id: id,
      date: data.date,
      categoryId: data.categoryId !== undefined ? (data.categoryId === null ? null : Number(data.categoryId)) : existingTransaction.categoryId,
      name: data.name,
      amount: Number(data.amount),
      cashBack: data.cashBack !== undefined ? Number(data.cashBack) : (existingTransaction.cashBack || 0),
      cashbackPosted: data.cashbackPosted !== undefined ? cashbackPosted : (existingTransaction.cashbackPosted || false),
      notes: data.notes !== undefined ? data.notes : existingTransaction.notes,
      pending: data.pending !== undefined ? pending : (existingTransaction.pending || false),
      pendingTipAmount: data.pendingTipAmount !== undefined ? Number(data.pendingTipAmount) : (existingTransaction.pendingTipAmount || 0),
      creditCardPending: data.creditCardPending !== undefined ? (data.creditCardPending === 'true' || data.creditCardPending === true || data.creditCardPending === 1) : (existingTransaction.creditCardPending || false)
    };
    
    console.log('Updating transaction:', JSON.stringify(transaction));
    
    // Update the transaction
    try {
      const changes = updateTransaction(transaction);
      
      return NextResponse.json({ 
        success: true,
        changes,
        message: 'Transaction updated successfully'
      });
    } catch (dbError) {
      console.error('Database error updating transaction:', dbError);
      return NextResponse.json(
        { error: 'Database error updating transaction', details: String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }
    
    // Check if transaction exists
    const transaction = getTransactionById(id);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Delete the transaction
    const changes = deleteTransaction(id);
    
    return NextResponse.json({ 
      success: true,
      changes,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 