import { NextResponse } from 'next/server';
import { getBudgetValidation } from '@/lib/budgetValidation';

export async function GET() {
  try {
    return NextResponse.json(getBudgetValidation());
  } catch (error) {
    console.error('Error validating budget alignment:', error);
    return NextResponse.json(
      { error: 'Failed to validate budget alignment' },
      { status: 500 }
    );
  }
}
