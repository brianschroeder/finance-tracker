import { NextResponse } from 'next/server';
import {
  createAdditionalBudgetItem,
  deleteAdditionalBudgetItem,
  getAllAdditionalBudgetItems,
  getTotalAdditionalBudgetAmount,
  updateAdditionalBudgetItem,
  type AdditionalBudgetItem
} from '@/lib/db';

export async function GET() {
  try {
    const items = getAllAdditionalBudgetItems();
    const totalAmount = getTotalAdditionalBudgetAmount();

    return NextResponse.json({
      items,
      totalAmount,
      count: items.length
    });
  } catch (error) {
    console.error('Error fetching additional budget items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch additional budget items' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const amount = parseFloat(data.amount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const item: Omit<AdditionalBudgetItem, 'id' | 'createdAt' | 'updatedAt'> = {
      amount,
      description: data.description?.trim() || 'Additional Budget',
      isActive: data.isActive !== false
    };

    const id = createAdditionalBudgetItem(item);
    const created = getAllAdditionalBudgetItems().find(budgetItem => budgetItem.id === id);

    return NextResponse.json({
      id,
      item: created,
      success: true,
      message: 'Additional budget item created successfully'
    });
  } catch (error) {
    console.error('Error creating additional budget item:', error);
    return NextResponse.json(
      { error: 'Failed to create additional budget item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const id = parseInt(data.id, 10);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    const updateData: Partial<AdditionalBudgetItem> = {};

    if (data.amount !== undefined) {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      updateData.amount = amount;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || 'Additional Budget';
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const success = updateAdditionalBudgetItem(id, updateData);

    if (!success) {
      return NextResponse.json(
        { error: 'Additional budget item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Additional budget item updated successfully'
    });
  } catch (error) {
    console.error('Error updating additional budget item:', error);
    return NextResponse.json(
      { error: 'Failed to update additional budget item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '', 10);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    const success = deleteAdditionalBudgetItem(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Additional budget item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Additional budget item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting additional budget item:', error);
    return NextResponse.json(
      { error: 'Failed to delete additional budget item' },
      { status: 500 }
    );
  }
}
