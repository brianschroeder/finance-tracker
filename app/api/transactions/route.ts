import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction, 
  deleteTransaction,
  getTransactionsByDateRange,
  Transaction
} from '@/lib/db';

// GET /api/transactions - Get all transactions
// GET /api/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - Get transactions in date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const id = searchParams.get('id');
    
    // Get single transaction by ID
    if (id) {
      const transaction = getTransactionById(Number(id));
      
      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      
      return NextResponse.json(transaction);
    }
    
    // Get transactions by date range
    if (startDate && endDate) {
      const transactions = getTransactionsByDateRange(startDate, endDate);
      return NextResponse.json({ transactions });
    }
    
    // Get all transactions
    const transactions = getAllTransactions();
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
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
    
    // Create the transaction
    const transaction: Transaction = {
      date: data.date,
      categoryId: data.categoryId || null,
      name: data.name,
      amount: data.amount,
      cashBack: data.cashBack || 0,
      notes: data.notes || null
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
    
    // Check if transaction exists
    const existingTransaction = getTransactionById(data.id);
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Update the transaction
    const transaction: Transaction = {
      id: data.id,
      date: data.date,
      categoryId: data.categoryId || null,
      name: data.name,
      amount: data.amount,
      cashBack: data.cashBack || 0,
      notes: data.notes || null
    };
    
    const changes = updateTransaction(transaction);
    
    return NextResponse.json({ 
      success: true,
      changes,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
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