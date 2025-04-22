import { NextResponse } from 'next/server';
import { getIncomeData, saveIncomeData } from '@/lib/db';

interface IncomeData {
  payAmount: number;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  workHoursPerWeek: number;
  workDaysPerWeek: number;
  bonusPercentage: number;
}

export async function GET() {
  try {
    const incomeData = getIncomeData();
    return NextResponse.json(incomeData || {
      payAmount: 2500,
      payFrequency: 'biweekly',
      workHoursPerWeek: 40,
      workDaysPerWeek: 5,
      bonusPercentage: 10
    });
  } catch (error) {
    console.error('Error fetching income data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (
      typeof data.payAmount !== 'number' ||
      !data.payFrequency ||
      typeof data.workHoursPerWeek !== 'number' ||
      typeof data.workDaysPerWeek !== 'number' ||
      typeof data.bonusPercentage !== 'number'
    ) {
      return NextResponse.json(
        { error: 'All fields are required and must be numbers' },
        { status: 400 }
      );
    }
    
    // Validate pay frequency
    const validFrequencies = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
    if (!validFrequencies.includes(data.payFrequency)) {
      return NextResponse.json(
        { error: 'Invalid pay frequency' },
        { status: 400 }
      );
    }
    
    // Validate ranges
    if (data.payAmount < 0) {
      return NextResponse.json(
        { error: 'Pay amount cannot be negative' },
        { status: 400 }
      );
    }
    
    if (data.workHoursPerWeek <= 0 || data.workHoursPerWeek > 168) {
      return NextResponse.json(
        { error: 'Work hours per week must be between 1 and 168' },
        { status: 400 }
      );
    }
    
    if (data.workDaysPerWeek <= 0 || data.workDaysPerWeek > 7) {
      return NextResponse.json(
        { error: 'Work days per week must be between 1 and 7' },
        { status: 400 }
      );
    }
    
    if (data.bonusPercentage < 0 || data.bonusPercentage > 100) {
      return NextResponse.json(
        { error: 'Bonus percentage must be between 0 and 100' },
        { status: 400 }
      );
    }
    
    // Save the data to the database
    const id = saveIncomeData(data);
    
    return NextResponse.json({...data, id}, { status: 200 });
  } catch (error) {
    console.error('Error saving income data:', error);
    return NextResponse.json(
      { error: 'Failed to save income data' },
      { status: 500 }
    );
  }
} 