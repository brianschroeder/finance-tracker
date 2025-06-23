import { NextResponse } from 'next/server';
import { getAllFundAccounts, createFundAccount, updateFundAccount, deleteFundAccount, getTotalFundAccountsAmount, getTotalInvestingFundAccountsAmount, FundAccount } from '@/lib/db';

export async function GET() {
  try {
    const fundAccounts = getAllFundAccounts();
    const totalAmount = getTotalFundAccountsAmount();
    const totalInvestingAmount = getTotalInvestingFundAccountsAmount();
    
    return NextResponse.json({
      fundAccounts,
      totalAmount,
      totalInvestingAmount
    });
  } catch (error) {
    console.error('Error fetching fund accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fund accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Validate amount
    const amount = parseFloat(data.amount) || 0;
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: 'Amount must be a valid positive number' },
        { status: 400 }
      );
    }
    
    const fundAccount: Omit<FundAccount, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name.trim(),
      amount,
      description: data.description?.trim() || '',
      color: data.color || '#3B82F6',
      icon: data.icon || 'FaChartLine',
      isActive: data.isActive !== false,
      isInvesting: data.isInvesting === true,
      sortOrder: parseInt(data.sortOrder) || 0
    };
    
    const id = createFundAccount(fundAccount);
    
    return NextResponse.json({ 
      id, 
      success: true,
      message: 'Fund account created successfully' 
    });
  } catch (error) {
    console.error('Error creating fund account:', error);
    return NextResponse.json(
      { error: 'Failed to create fund account' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    // Validate ID
    const id = parseInt(data.id);
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: Partial<FundAccount> = {};
    
    if (data.name && typeof data.name === 'string') {
      updateData.name = data.name.trim();
    }
    
    if (data.amount !== undefined) {
      const amount = parseFloat(data.amount);
      if (!isNaN(amount) && amount >= 0) {
        updateData.amount = amount;
      }
    }
    
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || '';
    }
    
    if (data.color) {
      updateData.color = data.color;
    }
    
    if (data.icon) {
      updateData.icon = data.icon;
    }
    
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    
    if (data.isInvesting !== undefined) {
      updateData.isInvesting = data.isInvesting;
    }
    
    if (data.sortOrder !== undefined) {
      updateData.sortOrder = parseInt(data.sortOrder) || 0;
    }
    
    const success = updateFundAccount(id, updateData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Fund account not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Fund account updated successfully' 
    });
  } catch (error) {
    console.error('Error updating fund account:', error);
    return NextResponse.json(
      { error: 'Failed to update fund account' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }
    
    const success = deleteFundAccount(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Fund account not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Fund account deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting fund account:', error);
    return NextResponse.json(
      { error: 'Failed to delete fund account' },
      { status: 500 }
    );
  }
} 