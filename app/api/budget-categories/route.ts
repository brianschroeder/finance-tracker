import { NextResponse } from 'next/server';
import { 
  getAllBudgetCategories, 
  getActiveBudgetCategories, 
  getBudgetCategoryById, 
  createBudgetCategory, 
  updateBudgetCategory, 
  deleteBudgetCategory,
  getTotalBudgetAllocated
} from '@/lib/db';

// GET - Fetch all budget categories or a specific category
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const onlyActive = searchParams.get('active') === 'true';

    if (id) {
      // Get a specific category by ID
      const categoryId = parseInt(id, 10);
      const category = getBudgetCategoryById(categoryId);
      
      if (!category) {
        return NextResponse.json(
          { error: 'Budget category not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(category);
    }
    
    // Get all categories or only active ones
    const categories = onlyActive ? getActiveBudgetCategories() : getAllBudgetCategories();
    const totalAllocated = getTotalBudgetAllocated();
    
    return NextResponse.json({ categories, totalAllocated });
  } catch (error) {
    console.error('Error getting budget categories:', error);
    return NextResponse.json(
      { error: 'Failed to get budget categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new budget category
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the input data
    if (!data.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    if (data.allocatedAmount === undefined || isNaN(data.allocatedAmount)) {
      return NextResponse.json(
        { error: 'Allocated amount is required and must be a number' },
        { status: 400 }
      );
    }
    
    // Default values if not provided
    const category = {
      name: data.name,
      allocatedAmount: parseFloat(data.allocatedAmount),
      color: data.color || '#3B82F6', // Default blue color
      isActive: data.isActive !== undefined ? data.isActive : true
    };
    
    const id = createBudgetCategory(category);
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error creating budget category:', error);
    return NextResponse.json(
      { error: 'Failed to create budget category' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing budget category
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the input data
    if (!data.id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    if (data.allocatedAmount === undefined || isNaN(data.allocatedAmount)) {
      return NextResponse.json(
        { error: 'Allocated amount is required and must be a number' },
        { status: 400 }
      );
    }
    
    // Prepare the category object for update
    const category = {
      id: data.id,
      name: data.name,
      allocatedAmount: parseFloat(data.allocatedAmount),
      color: data.color || '#3B82F6',
      isActive: data.isActive !== undefined ? data.isActive : true
    };
    
    const result = updateBudgetCategory(category);
    
    if (result === 0) {
      return NextResponse.json(
        { error: 'Budget category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating budget category:', error);
    return NextResponse.json(
      { error: 'Failed to update budget category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a budget category
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const result = deleteBudgetCategory(parseInt(id, 10));
    
    if (result === 0) {
      return NextResponse.json(
        { error: 'Budget category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget category:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget category' },
      { status: 500 }
    );
  }
} 