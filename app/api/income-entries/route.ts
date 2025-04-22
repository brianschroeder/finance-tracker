import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllIncomeEntries, 
  getIncomeEntriesByDateRange, 
  createIncomeEntry, 
  updateIncomeEntry, 
  deleteIncomeEntry,
  getTotalIncomeForDateRange,
  IncomeEntry
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let incomeEntries;
    let total = 0;
    
    if (startDate && endDate) {
      incomeEntries = getIncomeEntriesByDateRange(startDate, endDate);
      total = getTotalIncomeForDateRange(startDate, endDate);
    } else {
      incomeEntries = getAllIncomeEntries();
      // Calculate total from all entries
      total = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
    }
    
    return NextResponse.json({ 
      entries: incomeEntries,
      total
    });
  } catch (error) {
    console.error('Error fetching income entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.source || typeof data.amount !== 'number' || !data.date) {
      return NextResponse.json(
        { error: 'Source, amount, and date are required' },
        { status: 400 }
      );
    }
    
    // Format the entry
    const entry: IncomeEntry = {
      source: data.source,
      amount: data.amount,
      date: data.date,
      is_recurring: data.is_recurring || false,
      frequency: data.frequency,
      notes: data.notes
    };
    
    // Save to database
    const id = createIncomeEntry(entry);
    
    if (id === -1) {
      throw new Error('Failed to create income entry');
    }
    
    return NextResponse.json({ ...entry, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating income entry:', error);
    return NextResponse.json(
      { error: 'Failed to create income entry' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.id || !data.source || typeof data.amount !== 'number' || !data.date) {
      return NextResponse.json(
        { error: 'ID, source, amount, and date are required' },
        { status: 400 }
      );
    }
    
    // Format the entry
    const entry: IncomeEntry = {
      id: data.id,
      source: data.source,
      amount: data.amount,
      date: data.date,
      is_recurring: data.is_recurring || false,
      frequency: data.frequency,
      notes: data.notes
    };
    
    // Update in database
    const success = updateIncomeEntry(entry);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update income entry' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating income entry:', error);
    return NextResponse.json(
      { error: 'Failed to update income entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    const success = deleteIncomeEntry(parseInt(id));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete income entry' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete income entry' },
      { status: 500 }
    );
  }
} 