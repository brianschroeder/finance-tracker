import { NextRequest, NextResponse } from 'next/server';
import { saveDailyInvestmentSnapshot } from '@/lib/db';

// This API route should be called daily by a cron job to save the investment snapshot
// for calculating day-to-day price changes.
// Can be manually triggered with: GET /api/cron/investment-snapshot?key=YOUR_SECRET_KEY
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // Optional: Add basic security with a simple API key check
    // In production, use a proper environment variable check
    const ALLOWED_KEY = process.env.CRON_API_KEY || 'your-secret-key-here';
    
    if (key !== ALLOWED_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Save the daily snapshot
    const count = saveDailyInvestmentSnapshot();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      investmentsUpdated: count,
      message: `Successfully saved daily snapshot for ${count} investments`
    });
  } catch (error) {
    console.error('Error saving daily investment snapshot:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save daily investment snapshot',
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 