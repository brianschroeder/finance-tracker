import { NextResponse } from 'next/server';
import { 
  getAllManualPendingTransactions,
  getManualPendingTransactionsByPayPeriod,
  createManualPendingTransaction,
  updateManualPendingTransaction,
  deleteManualPendingTransaction,
  markManualPendingTransactionCompleted,
  type ManualPendingTransaction
} from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payPeriodStart = searchParams.get('payPeriodStart');
    const payPeriodEnd = searchParams.get('payPeriodEnd');
    
    let transactions: ManualPendingTransaction[];
    
    if (payPeriodStart && payPeriodEnd) {
      // Get transactions for specific pay period
      transactions = getManualPendingTransactionsByPayPeriod(payPeriodStart, payPeriodEnd);
    } else {
      // Get all manual pending transactions
      transactions = getAllManualPendingTransactions();
    }
    
    // Calculate total amount
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    return NextResponse.json({ 
      transactions,
      totalAmount,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error retrieving manual pending transactions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve manual pending transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || data.amount === undefined || !data.dueDate || !data.payPeriodStart || !data.payPeriodEnd) {
      return NextResponse.json(
        { error: 'Name, amount, due date, and pay period information are required' },
        { status: 400 }
      );
    }
    
    // Validate amount
    if (isNaN(parseFloat(data.amount))) {
      return NextResponse.json(
        { error: 'Amount must be a valid number' },
        { status: 400 }
      );
    }
    
    // Create the transaction
    const transactionData: ManualPendingTransaction = {
      name: data.name,
      amount: parseFloat(data.amount),
      dueDate: data.dueDate,
      categoryId: data.categoryId || null,
      notes: data.notes || null,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      isCompleted: data.isCompleted || false
    };
    
    const id = createManualPendingTransaction(transactionData);
    
    return NextResponse.json({ 
      success: true,
      id,
      message: 'Manual pending transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating manual pending transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create manual pending transaction' },
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
    
    // Check if this is just a completion status update
    if (data.isCompleted !== undefined && Object.keys(data).length === 2) { // Only id and isCompleted
      const changes = markManualPendingTransactionCompleted(data.id, data.isCompleted);
      
      if (changes === 0) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Transaction completion status updated successfully'
      });
    }
    
    // Full update - validate required fields
    if (!data.name || data.amount === undefined || !data.dueDate || !data.payPeriodStart || !data.payPeriodEnd) {
      return NextResponse.json(
        { error: 'Name, amount, due date, and pay period information are required' },
        { status: 400 }
      );
    }
    
    // Validate amount
    if (isNaN(parseFloat(data.amount))) {
      return NextResponse.json(
        { error: 'Amount must be a valid number' },
        { status: 400 }
      );
    }
    
    // Update the transaction
    const transactionData: ManualPendingTransaction = {
      id: data.id,
      name: data.name,
      amount: parseFloat(data.amount),
      dueDate: data.dueDate,
      categoryId: data.categoryId || null,
      notes: data.notes || null,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      isCompleted: data.isCompleted || false
    };
    
    const changes = updateManualPendingTransaction(transactionData);
    
    if (changes === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Manual pending transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating manual pending transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update manual pending transaction' },
      { status: 500 }
    );
  }
}

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
    
    const changes = deleteManualPendingTransaction(parseInt(id));
    
    if (changes === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Manual pending transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting manual pending transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete manual pending transaction' },
      { status: 500 }
    );
  }
}