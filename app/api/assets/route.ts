import { NextResponse } from 'next/server';
import { saveAssets, getLatestAssets } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Convert string values to numbers, no need for legacy field names
    const assets = {
      cash: parseFloat(data.cash) || 0,
      stocks: parseFloat(data.stocks) || 0,
      interest: parseFloat(data.interest) || 0,
      checking: parseFloat(data.checking) || 0,
      retirement401k: parseFloat(data.retirement401k) || 0,
      houseFund: parseFloat(data.houseFund) || 0,
      vacationFund: parseFloat(data.vacationFund) || 0,
      emergencyFund: parseFloat(data.emergencyFund) || 0
    };
    
    // Validate that we have numbers
    for (const [key, value] of Object.entries(assets)) {
      if (isNaN(value)) {
        return NextResponse.json(
          { error: `Invalid value for ${key}` },
          { status: 400 }
        );
      }
    }
    
    // Save to database
    const id = saveAssets(assets);
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error saving assets:', error);
    return NextResponse.json(
      { error: 'Failed to save assets' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const assets = getLatestAssets();
    
    if (!assets) {
      // Return an empty default asset structure instead of 404
      return NextResponse.json({
        id: null,
        date: new Date().toISOString().split('T')[0],
        cash: 0,
        stocks: 0,
        interest: 0,
        checking: 0,
        retirement401k: 0,
        houseFund: 0,
        vacationFund: 0,
        emergencyFund: 0,
        totalAssets: 0
      });
    }
    
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    // Log more detailed error information to help with debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch assets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 