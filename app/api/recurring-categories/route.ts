import { NextResponse } from 'next/server';
import { 
  getAllRecurringCategories,
  saveRecurringCategory,
  RecurringCategory
} from '@/lib/db';

// Get all recurring transaction categories
export async function GET() {
  try {
    const categories = getAllRecurringCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error retrieving recurring categories:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recurring categories' },
      { status: 500 }
    );
  }
}

// Create a new recurring transaction category
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the request data
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    // Create category object
    const category: RecurringCategory = {
      name: data.name.trim(),
      color: data.color || '#3B82F6',
      isActive: data.isActive !== undefined ? !!data.isActive : true
    };
    
    // Save to database
    const id = saveRecurringCategory(category);
    
    return NextResponse.json({ 
      id, 
      success: true,
      category: { ...category, id }
    });
    
  } catch (error) {
    console.error('Error saving recurring category:', error);
    return NextResponse.json(
      { error: 'Failed to save recurring category' },
      { status: 500 }
    );
  }
} 