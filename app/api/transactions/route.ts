import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction, 
  deleteTransaction,
  getTransactionsByDateRange,
  reorderTransactions,
  Transaction
} from '@/lib/db';

// GET /api/transactions - Get all transactions
// GET /api/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - Get transactions in date range
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/transactions - Request received');
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const id = searchParams.get('id');
    const categoryId = searchParams.get('categoryId');
    const limit = searchParams.get('limit');
    
    // Get single transaction by ID
    if (id) {
      console.log(`Fetching transaction by id: ${id}`);
      const transaction = getTransactionById(Number(id));
      
      if (!transaction) {
        console.log('Transaction not found');
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      
      console.log('Transaction found:', transaction);
      return NextResponse.json(transaction);
    }
    
    // Get transactions by date range
    if (startDate && endDate) {
      console.log(`Fetching transactions by date range: ${startDate} to ${endDate}`);
      const transactions = getTransactionsByDateRange(startDate, endDate);
      console.log(`Found ${transactions.length} transactions`);
      return NextResponse.json({ transactions });
    }
    
    // Get all transactions
    console.log('Fetching all transactions');
    let transactions = getAllTransactions();
    console.log(`Found ${transactions.length} transactions`);
    
    // Filter by categoryId if provided
    if (categoryId) {
      transactions = transactions.filter(t => t.categoryId === Number(categoryId));
      console.log(`Filtered to ${transactions.length} transactions for category ${categoryId}`);
    }
    
    // Apply limit if provided
    if (limit) {
      transactions = transactions.slice(0, Number(limit));
      console.log(`Limited to ${transactions.length} transactions`);
    }
    
    // Debug: Print a sample of transactions if any exist
    if (transactions.length > 0) {
      console.log('Sample transaction:', JSON.stringify(transactions[0]));
    } else {
      console.log('No transactions found in database');
    }
    
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
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
    
    // Validate amount is a number and greater than 0
    if (isNaN(data.amount) || data.amount < 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Validate cashBack is a number and non-negative if provided
    if (data.cashBack !== undefined && (isNaN(data.cashBack) || data.cashBack < 0)) {
      return NextResponse.json(
        { error: 'Cash back must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Validate pendingTipAmount is a number and non-negative if provided
    if (data.pendingTipAmount !== undefined && (isNaN(data.pendingTipAmount) || data.pendingTipAmount < 0)) {
      return NextResponse.json(
        { error: 'Pending tip amount must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Create the transaction
    const transaction: Transaction = {
      date: data.date,
      categoryId: data.categoryId || null,
      name: data.name,
      amount: data.amount,
      cashBack: data.cashBack || 0,
      cashbackPosted: data.cashbackPosted !== undefined ? data.cashbackPosted : true,
      notes: data.notes || null,
      pending: data.pending || false,
      pendingTipAmount: data.pendingTipAmount || 0,
      creditCardPending: data.creditCardPending || false
    };
    
    const id = createTransaction(transaction);
    
    return NextResponse.json({ 
      id,
      success: true,
      message: 'Transaction created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

// PUT /api/transactions - Update an existing transaction
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
    
    // Validate cashBack is a number and non-negative if provided
    if (data.cashBack !== undefined && (isNaN(data.cashBack) || data.cashBack < 0)) {
      return NextResponse.json(
        { error: 'Cash back must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Validate pendingTipAmount is a number and non-negative if provided
    if (data.pendingTipAmount !== undefined && (isNaN(data.pendingTipAmount) || data.pendingTipAmount < 0)) {
      return NextResponse.json(
        { error: 'Pending tip amount must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Check if transaction exists
    const existingTransaction = getTransactionById(data.id);
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Ensure boolean values are properly formatted
    const cashbackPosted = typeof data.cashbackPosted === 'boolean' 
      ? data.cashbackPosted 
      : data.cashbackPosted === 'true' || data.cashbackPosted === true || data.cashbackPosted === 1;
    
    const pending = typeof data.pending === 'boolean'
      ? data.pending
      : data.pending === 'true' || data.pending === true || data.pending === 1;
    
    const creditCardPending = typeof data.creditCardPending === 'boolean'
      ? data.creditCardPending
      : data.creditCardPending === 'true' || data.creditCardPending === true || data.creditCardPending === 1;
    
    // Update the transaction
    const transaction: Transaction = {
      id: data.id,
      date: data.date,
      categoryId: data.categoryId || null,
      name: data.name,
      amount: data.amount,
      cashBack: data.cashBack !== undefined ? Number(data.cashBack) : 0,
      cashbackPosted: cashbackPosted,
      notes: data.notes || null,
      pending: pending,
      pendingTipAmount: data.pendingTipAmount !== undefined ? Number(data.pendingTipAmount) : 0,
      creditCardPending: creditCardPending
    };
    
    console.log('Updating transaction with data:', JSON.stringify(transaction));
    
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

// DELETE /api/transactions?id=123 - Delete a transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    // Check if transaction exists
    const transaction = getTransactionById(Number(id));
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Delete the transaction
    const changes = deleteTransaction(Number(id));
    
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

// PATCH /api/transactions - Reorder transactions
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate that transactionIds is provided and is an array
    if (!data.transactionIds || !Array.isArray(data.transactionIds)) {
      return NextResponse.json(
        { error: 'transactionIds array is required' },
        { status: 400 }
      );
    }
    
    // Validate that all items are numbers
    if (!data.transactionIds.every((id: any) => typeof id === 'number' && !isNaN(id))) {
      return NextResponse.json(
        { error: 'All transaction IDs must be valid numbers' },
        { status: 400 }
      );
    }
    
    // Reorder transactions
    const changes = reorderTransactions(data.transactionIds);
    
    return NextResponse.json({ 
      success: true,
      changes,
      message: 'Transactions reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering transactions:', error);
    return NextResponse.json(
      { error: 'Failed to reorder transactions' },
      { status: 500 }
    );
  }
} 