import { NextResponse } from 'next/server';
import { getSavingsPlanData, saveSavingsPlanData } from '@/lib/db';

interface SavingsPlanData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  yearlyContribution: number;
  yearlyBonus: number;
  annualReturn: number;
}

// Default data for fallback
const defaultSavingsPlanData: SavingsPlanData = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 100000,
  yearlyContribution: 20000,
  yearlyBonus: 5000,
  annualReturn: 7
};

export async function GET() {
  try {
    const savingsPlanData = getSavingsPlanData();
    return NextResponse.json(savingsPlanData || defaultSavingsPlanData);
  } catch (error) {
    console.error('Error fetching savings plan data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings plan data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (
      typeof data.currentAge !== 'number' ||
      typeof data.retirementAge !== 'number' ||
      typeof data.currentSavings !== 'number' ||
      typeof data.yearlyContribution !== 'number' ||
      typeof data.yearlyBonus !== 'number' ||
      typeof data.annualReturn !== 'number'
    ) {
      return NextResponse.json(
        { error: 'All fields are required and must be numbers' },
        { status: 400 }
      );
    }
    
    // Validate ranges
    if (data.currentAge < 18 || data.currentAge > 100) {
      return NextResponse.json(
        { error: 'Current age must be between 18 and 100' },
        { status: 400 }
      );
    }
    
    if (data.retirementAge <= data.currentAge || data.retirementAge > 100) {
      return NextResponse.json(
        { error: 'Retirement age must be greater than current age and less than 100' },
        { status: 400 }
      );
    }
    
    // Save to database
    const id = saveSavingsPlanData(data);
    
    return NextResponse.json({...data, id}, { status: 200 });
  } catch (error) {
    console.error('Error saving savings plan data:', error);
    return NextResponse.json(
      { error: 'Failed to save savings plan data' },
      { status: 500 }
    );
  }
} 