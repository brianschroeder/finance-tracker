import { NextRequest, NextResponse } from 'next/server';
import { addTestTransactions } from '../transactions/add-test-data';

export async function POST(request: NextRequest) {
  try {
    console.log('Adding test transactions...');
    const result = addTestTransactions();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully added ${result.count} test transactions`, 
        ids: result.ids 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to add test transactions', details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test-data endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to add test transactions', details: String(error) },
      { status: 500 }
    );
  }
} 