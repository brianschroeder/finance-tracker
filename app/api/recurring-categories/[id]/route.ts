import { NextResponse } from 'next/server';
import { 
  updateRecurringCategory,
  deleteRecurringCategory,
  getRecurringCategoryById,
  RecurringCategory
} from '@/lib/db';

// Get a single recurring transaction category
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    const category = getRecurringCategoryById(id);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(category);
    
  } catch (error) {
    console.error('Error retrieving category:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve category' },
      { status: 500 }
    );
  }
}

// Update a recurring transaction category
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
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

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
      id,
      name: data.name.trim(),
      color: data.color || '#3B82F6',
      isActive: data.isActive !== undefined ? !!data.isActive : true
    };
    
    // Update in database
    const changes = updateRecurringCategory(category);
    
    if (changes === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      category
    });
    
  } catch (error) {
    console.error(`Error updating recurring category:`, error);
    return NextResponse.json(
      { error: 'Failed to update recurring category' },
      { status: 500 }
    );
  }
}

// Delete a recurring transaction category
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
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    // Delete from database
    const changes = deleteRecurringCategory(id);
    
    if (changes === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true
    });
    
  } catch (error) {
    console.error(`Error deleting recurring category:`, error);
    return NextResponse.json(
      { error: 'Failed to delete recurring category' },
      { status: 500 }
    );
  }
} 