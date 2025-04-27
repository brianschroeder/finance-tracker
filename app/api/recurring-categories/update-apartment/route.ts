import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Special endpoint to fix the Apartment transaction to use Housing category
export async function GET() {
  try {
    const db = getDb();
    
    // Get Housing category ID
    const housingCategory = db.prepare(`
      SELECT id FROM recurring_categories WHERE name = 'Housing'
    `).get() as { id: number } | undefined;
    
    // Check if Housing category exists
    if (!housingCategory) {
      return NextResponse.json(
        { error: 'Housing category not found' },
        { status: 404 }
      );
    }
    
    // Get the Apartment transaction
    const apartment = db.prepare(`
      SELECT * FROM recurring_transactions WHERE name = 'Apartment'
    `).get() as { id: number, categoryId: number | null } | undefined;
    
    // Check if Apartment transaction exists
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment transaction not found' },
        { status: 404 }
      );
    }
    
    // Update the Apartment transaction to use Housing category
    const updateStmt = db.prepare(`
      UPDATE recurring_transactions
      SET categoryId = ?
      WHERE id = ?
    `);
    
    const result = updateStmt.run(housingCategory.id, apartment.id);
    
    return NextResponse.json({
      success: true,
      message: `Updated Apartment transaction (ID: ${apartment.id}) to use Housing category (ID: ${housingCategory.id})`,
      changes: result.changes
    });
    
  } catch (error) {
    console.error('Error updating Apartment transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update Apartment transaction' },
      { status: 500 }
    );
  }
} 