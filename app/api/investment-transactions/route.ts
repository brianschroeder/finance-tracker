import { NextRequest, NextResponse } from 'next/server';
import { 
  getInvestmentTransactions, 
  createInvestmentTransaction, 
  updateInvestmentTransaction, 
  deleteInvestmentTransaction,
  InvestmentTransaction 
} from '@/lib/db';

// GET - Get all transactions for an investment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const investmentId = searchParams.get('investmentId');
    
    if (!investmentId) {
      return NextResponse.json(
        { error: 'Investment ID is required' },
        { status: 400 }
      );
    }
    
    const transactions = getInvestmentTransactions(parseInt(investmentId));
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching investment transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investment transactions' },
      { status: 500 }
    );
  }
}

// POST - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investmentId, type, quantity, pricePerUnit, transactionDate, notes } = body;
    
    // Validate required fields
    if (!investmentId || !type || !quantity || !pricePerUnit || !transactionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate type
    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json(
        { error: 'Type must be "buy" or "sell"' },
        { status: 400 }
      );
    }
    
    const transaction: InvestmentTransaction = {
      investmentId: parseInt(investmentId),
      type,
      quantity: parseFloat(quantity),
      pricePerUnit: parseFloat(pricePerUnit),
      transactionDate,
      notes
    };
    
    const id = createInvestmentTransaction(transaction);
    return NextResponse.json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    console.error('Error creating investment transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create investment transaction' },
      { status: 500 }
    );
  }
}

// PUT - Update a transaction
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, investmentId, type, quantity, pricePerUnit, transactionDate, notes } = body;
    
    // Validate required fields
    if (!id || !investmentId || !type || !quantity || !pricePerUnit || !transactionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate type
    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json(
        { error: 'Type must be "buy" or "sell"' },
        { status: 400 }
      );
    }
    
    const transaction: InvestmentTransaction = {
      id: parseInt(id),
      investmentId: parseInt(investmentId),
      type,
      quantity: parseFloat(quantity),
      pricePerUnit: parseFloat(pricePerUnit),
      transactionDate,
      notes
    };
    
    const success = updateInvestmentTransaction(transaction);
    
    if (success) {
      return NextResponse.json({ message: 'Transaction updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error updating investment transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update investment transaction' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const investmentId = searchParams.get('investmentId');
    
    if (!id || !investmentId) {
      return NextResponse.json(
        { error: 'Transaction ID and Investment ID are required' },
        { status: 400 }
      );
    }
    
    const success = deleteInvestmentTransaction(parseInt(id), parseInt(investmentId));
    
    if (success) {
      return NextResponse.json({ message: 'Transaction deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting investment transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete investment transaction' },
      { status: 500 }
    );
  }
}
