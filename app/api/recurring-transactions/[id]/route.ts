import { NextResponse } from 'next/server';
import { 
  getDb,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  RecurringTransaction,
  getRecurringCategoryById,
  validateRecurringCategoryId
} from '@/lib/db';

// Update a recurring transaction
export async function PUT(
  request: Request,
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
    
    // Sanitize category ID - make sure it's a number, null, or undefined
    let categoryId = null;
    if (data.categoryId !== undefined && data.categoryId !== null) {
      // If it's a string, try to convert to number
      if (typeof data.categoryId === 'string') {
        const parsedId = parseInt(data.categoryId, 10);
        if (!isNaN(parsedId)) {
          categoryId = parsedId;
        }
      } 
      // If it's already a number, use it directly
      else if (typeof data.categoryId === 'number') {
        categoryId = data.categoryId;
      }
    }

    // Validate that the category exists
    categoryId = validateRecurringCategoryId(categoryId);
    
    // Create transaction object
    const transaction: RecurringTransaction = {
      id,
      name: data.name.trim(),
      amount,
      dueDate,
      isEssential: !!data.isEssential,
      categoryId
    };
    
    console.log('Updating transaction with:', {
      ...transaction,
      categoryIdType: categoryId !== null ? typeof categoryId : 'null'
    });
    
    // Temporarily disable foreign keys for the update if needed
    const db = getDb();
    const foreignKeysWereOn = db.pragma('foreign_keys', { simple: true }) === 1;
    
    try {
      if (foreignKeysWereOn) {
        console.log('Temporarily disabling foreign key constraints');
        db.pragma('foreign_keys = OFF');
      }
      
      // Update in database
      const changes = updateRecurringTransaction(transaction);
      
      if (changes === 0) {
        console.error(`No changes made to transaction ${id}`);
        return NextResponse.json(
          { error: 'Transaction not found or no changes made' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true,
        transaction
      });
    } finally {
      // Restore foreign key constraints if they were on
      if (foreignKeysWereOn) {
        console.log('Re-enabling foreign key constraints');
        db.pragma('foreign_keys = ON');
      }
    }
    
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update recurring transaction', details: (error as Error).message },
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
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }
    
    console.log(`Deleting transaction with ID: ${id}`);
    
    // Temporarily disable foreign keys for the delete if needed
    const db = getDb();
    const foreignKeysWereOn = db.pragma('foreign_keys', { simple: true }) === 1;
    
    try {
      if (foreignKeysWereOn) {
        console.log('Temporarily disabling foreign key constraints');
        db.pragma('foreign_keys = OFF');
      }
      
      // Delete from database
      const changes = deleteRecurringTransaction(id);
      
      if (changes === 0) {
        console.error(`No transaction found with ID ${id}`);
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true });
    } finally {
      // Restore foreign key constraints if they were on
      if (foreignKeysWereOn) {
        console.log('Re-enabling foreign key constraints');
        db.pragma('foreign_keys = ON');
      }
    }
    
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete recurring transaction', details: (error as Error).message },
      { status: 500 }
    );
  }
} 