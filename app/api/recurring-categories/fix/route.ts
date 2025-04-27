import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Category {
  id: number;
  name: string;
  color: string;
  isActive: number;
  createdAt: string;
}

interface Transaction {
  id: number;
  name: string;
  amount: number;
  dueDate: number;
  isEssential: number;
  categoryId: number | null;
  createdAt: string;
}

interface Results {
  categories: Category[];
  transactions: Transaction[];
  invalidTransactions: Transaction[];
  actionsTaken: string[];
  integrityCheck?: unknown;
}

// Endpoint to fix foreign key constraint issues in the database
export async function GET() {
  try {
    const db = getDb();
    
    // Step 1: Get all categories and transactions
    const categories = db.prepare(`SELECT * FROM recurring_categories`).all() as Category[];
    const transactions = db.prepare(`SELECT * FROM recurring_transactions`).all() as Transaction[];
    
    // Step 2: Find transactions with invalid categoryId
    const validCategoryIds = new Set(categories.map(c => c.id));
    const invalidTransactions = transactions.filter(t => 
      t.categoryId !== null && !validCategoryIds.has(t.categoryId)
    );
    
    const results: Results = {
      categories,
      transactions,
      invalidTransactions,
      actionsTaken: []
    };
    
    // Step 3: Fix transactions with invalid categoryId
    if (invalidTransactions.length > 0) {
      const updateStmt = db.prepare(`
        UPDATE recurring_transactions
        SET categoryId = NULL
        WHERE id = ?
      `);
      
      for (const t of invalidTransactions) {
        const result = updateStmt.run(t.id);
        results.actionsTaken.push(`Fixed transaction id=${t.id}, name="${t.name}" with invalid categoryId=${t.categoryId}`);
      }
    }
    
    // Step 4: Specifically check Housing (ID 5) and make sure it's valid
    const housingCategory = categories.find(c => c.name === 'Housing');
    if (housingCategory) {
      results.actionsTaken.push(`Housing category found with ID ${housingCategory.id}`);
    } else {
      results.actionsTaken.push('No Housing category found');
    }
    
    // Step 5: Run integrity check
    const integrityCheck = db.pragma('integrity_check');
    results.integrityCheck = integrityCheck;
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fixing database:', error);
    return NextResponse.json(
      { error: 'Failed to fix database' },
      { status: 500 }
    );
  }
} 