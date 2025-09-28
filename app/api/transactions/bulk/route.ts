import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, Transaction } from '@/lib/db';

// POST /api/transactions/bulk - Create multiple transactions
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate that we have transactions array
    if (!data.transactions || !Array.isArray(data.transactions)) {
      return NextResponse.json(
        { error: 'transactions array is required' },
        { status: 400 }
      );
    }
    
    const transactions = data.transactions;
    const createdTransactions = [];
    const errors = [];
    
    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const transactionData = transactions[i];
      
      try {
        // Validate required fields
        if (!transactionData.date || !transactionData.name || transactionData.amount === undefined) {
          errors.push(`Transaction ${i + 1}: Date, name, and amount are required fields`);
          continue;
        }
        
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(transactionData.date)) {
          errors.push(`Transaction ${i + 1}: Date must be in YYYY-MM-DD format`);
          continue;
        }
        
        // Validate amount is a number
        if (isNaN(transactionData.amount)) {
          errors.push(`Transaction ${i + 1}: Amount must be a number`);
          continue;
        }
        
        // Validate cashBack is a number and non-negative if provided
        if (transactionData.cashBack !== undefined && (isNaN(transactionData.cashBack) || transactionData.cashBack < 0)) {
          errors.push(`Transaction ${i + 1}: Cash back must be a non-negative number`);
          continue;
        }
        
        // Validate pendingTipAmount is a number and non-negative if provided
        if (transactionData.pendingTipAmount !== undefined && (isNaN(transactionData.pendingTipAmount) || transactionData.pendingTipAmount < 0)) {
          errors.push(`Transaction ${i + 1}: Pending tip amount must be a non-negative number`);
          continue;
        }
        
        // Create the transaction object
        const transaction: Transaction = {
          date: transactionData.date,
          categoryId: transactionData.categoryId || null,
          name: transactionData.name,
          amount: transactionData.amount,
          cashBack: transactionData.cashBack || 0,
          cashbackPosted: transactionData.cashbackPosted !== undefined ? transactionData.cashbackPosted : true,
          notes: transactionData.notes || null,
          pending: transactionData.pending !== undefined ? transactionData.pending : false,
          pendingTipAmount: transactionData.pendingTipAmount || 0,
          creditCardPending: transactionData.creditCardPending || false
        };
        
        // Create the transaction in the database
        const id = createTransaction(transaction);
        
        createdTransactions.push({
          id,
          ...transaction
        });
        
      } catch (error) {
        console.error(`Error creating transaction ${i + 1}:`, error);
        errors.push(`Transaction ${i + 1}: Failed to create transaction`);
      }
    }
    
    // Return response with results
    const response: any = {
      created: createdTransactions.length,
      transactions: createdTransactions
    };
    
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    // If no transactions were created, return an error
    if (createdTransactions.length === 0) {
      return NextResponse.json(
        { 
          error: 'No transactions were created',
          errors: errors
        },
        { status: 400 }
      );
    }
    
    // Return success response
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('Error in bulk transaction creation:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating transactions' },
      { status: 500 }
    );
  }
} 