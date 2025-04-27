import { NextResponse } from 'next/server';
import { 
  updateRecurringTransaction,
  deleteRecurringTransaction,
  RecurringTransaction
} from '@/lib/db';

// Update a recurring transaction
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is fully resolved
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

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
      id,
      name: data.name.trim(),
      amount,
      dueDate,
      isEssential: !!data.isEssential,
      categoryId: data.categoryId || null
    };
    
    // Update in database
    const changes = updateRecurringTransaction(transaction);
    
    if (changes === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      transaction
    });
    
  } catch (error) {
    console.error(`Error updating recurring transaction:`, error);
    return NextResponse.json(
      { error: 'Failed to update recurring transaction' },
      { status: 500 }
    );
  }
}

// Delete a recurring transaction
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is fully resolved
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }
    
    // Delete from database
    const changes = deleteRecurringTransaction(id);
    
    if (changes === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true
    });
    
  } catch (error) {
    console.error(`Error deleting recurring transaction:`, error);
    return NextResponse.json(
      { error: 'Failed to delete recurring transaction' },
      { status: 500 }
    );
  }
} 