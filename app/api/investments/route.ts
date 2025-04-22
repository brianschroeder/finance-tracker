import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllInvestments,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  updateInvestmentPrice,
  deleteInvestment,
  Investment,
  calculateDayChanges,
  saveDailyInvestmentSnapshot
} from '@/lib/db';

// GET /api/investments - Get all investments
// GET /api/investments?id=123 - Get investment by ID
// GET /api/investments?snapshot=true - Save daily snapshot
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const snapshot = searchParams.get('snapshot');
    
    // If snapshot param is provided, save the daily snapshot
    if (snapshot === 'true') {
      const count = saveDailyInvestmentSnapshot();
      return NextResponse.json({ success: true, count });
    }
    
    // Get single investment by ID
    if (id) {
      const investment = getInvestmentById(Number(id));
      
      if (!investment) {
        return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
      }
      
      return NextResponse.json(investment);
    }
    
    // Get all investments with day change calculations
    const investments = getAllInvestments();
    const dayChanges = calculateDayChanges();
    
    return NextResponse.json({ 
      investments,
      totalValue: dayChanges.totalValue,
      totalGainLoss: dayChanges.totalValue - (investments.reduce((sum, inv) => sum + (inv.shares * inv.avgPrice), 0)),
      dayChange: dayChanges.dayChange,
      dayChangePercent: dayChanges.dayChangePercent,
      lastUpdated: investments.length > 0 ? investments[0].lastUpdated : null
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

// POST /api/investments - Create a new investment
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.symbol || !data.name || data.shares === undefined || data.avgPrice === undefined) {
      return NextResponse.json(
        { error: 'Symbol, name, shares, and average price are required fields' },
        { status: 400 }
      );
    }
    
    // Validate numeric fields
    if (isNaN(data.shares) || data.shares <= 0) {
      return NextResponse.json(
        { error: 'Shares must be a positive number' },
        { status: 400 }
      );
    }
    
    if (isNaN(data.avgPrice) || data.avgPrice <= 0) {
      return NextResponse.json(
        { error: 'Average price must be a positive number' },
        { status: 400 }
      );
    }
    
    // Create the investment
    const investment: Investment = {
      symbol: data.symbol,
      name: data.name,
      shares: data.shares,
      avgPrice: data.avgPrice,
      currentPrice: data.currentPrice || data.avgPrice
    };
    
    const id = createInvestment(investment);
    
    return NextResponse.json({ 
      id,
      success: true,
      message: 'Investment created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json(
      { error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}

// PUT /api/investments - Update an existing investment
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate investment ID
    if (!data.id) {
      return NextResponse.json(
        { error: 'Investment ID is required' },
        { status: 400 }
      );
    }
    
    // Check if only updating price
    if (data.updatePriceOnly) {
      if (data.currentPrice === undefined || isNaN(data.currentPrice) || data.currentPrice <= 0) {
        return NextResponse.json(
          { error: 'Current price must be a positive number' },
          { status: 400 }
        );
      }
      
      const changes = updateInvestmentPrice(data.id, data.currentPrice);
      
      return NextResponse.json({
        success: true,
        changes,
        message: 'Investment price updated successfully'
      });
    }
    
    // Validate required fields for full update
    if (!data.symbol || !data.name || data.shares === undefined || data.avgPrice === undefined) {
      return NextResponse.json(
        { error: 'Symbol, name, shares, and average price are required fields' },
        { status: 400 }
      );
    }
    
    // Check if investment exists
    const existingInvestment = getInvestmentById(data.id);
    if (!existingInvestment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }
    
    // Update the investment
    const investment: Investment = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      shares: data.shares,
      avgPrice: data.avgPrice,
      currentPrice: data.currentPrice || data.avgPrice
    };
    
    const changes = updateInvestment(investment);
    
    return NextResponse.json({ 
      success: true,
      changes,
      message: 'Investment updated successfully'
    });
  } catch (error) {
    console.error('Error updating investment:', error);
    return NextResponse.json(
      { error: 'Failed to update investment' },
      { status: 500 }
    );
  }
}

// DELETE /api/investments?id=123 - Delete an investment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Investment ID is required' },
        { status: 400 }
      );
    }
    
    // Check if investment exists
    const investment = getInvestmentById(Number(id));
    if (!investment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }
    
    const changes = deleteInvestment(Number(id));
    
    return NextResponse.json({
      success: true,
      changes,
      message: 'Investment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting investment:', error);
    return NextResponse.json(
      { error: 'Failed to delete investment' },
      { status: 500 }
    );
  }
} 