import { NextResponse } from 'next/server';
import { savePaySettings, getPaySettings } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the input data
    if (!data.lastPayDate) {
      return NextResponse.json(
        { error: 'Last pay date is required' },
        { status: 400 }
      );
    }
    
    if (!data.frequency || !['weekly', 'biweekly'].includes(data.frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be either "weekly" or "biweekly"' },
        { status: 400 }
      );
    }
    
    // Save to database
    const id = savePaySettings({
      lastPayDate: data.lastPayDate,
      frequency: data.frequency
    });
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error saving pay settings:', error);
    return NextResponse.json(
      { error: 'Failed to save pay settings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const settings = getPaySettings();
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error('Error retrieving pay settings:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve pay settings' },
      { status: 500 }
    );
  }
} 