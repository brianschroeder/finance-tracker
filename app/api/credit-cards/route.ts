import { NextResponse } from 'next/server';
import { getAllCreditCards, createCreditCard, updateCreditCard, deleteCreditCard, getCreditCardById } from '@/lib/db';

// Define the CreditCard interface
interface CreditCard {
  id?: number;
  name: string;
  balance: number;
  limit: number;
  color?: string;
}

export async function GET() {
  try {
    const creditCards = getAllCreditCards();
    return NextResponse.json(creditCards);
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit cards' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const creditCard = await request.json();
    
    // Validate required fields
    if (!creditCard.name || creditCard.limit <= 0) {
      return NextResponse.json(
        { error: 'Name and limit are required fields' },
        { status: 400 }
      );
    }
    
    // Default color if not provided
    if (!creditCard.color) {
      creditCard.color = '#000000';
    }
    
    // Default balance to zero if not provided
    if (creditCard.balance === undefined) {
      creditCard.balance = 0;
    }
    
    // Save to database
    const id = createCreditCard(creditCard);
    
    return NextResponse.json({ ...creditCard, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating credit card:', error);
    return NextResponse.json(
      { error: 'Failed to create credit card' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const creditCard = await request.json();
    
    // Validate required fields
    if (!creditCard.id || !creditCard.name || creditCard.limit <= 0) {
      return NextResponse.json(
        { error: 'ID, name, and limit are required fields' },
        { status: 400 }
      );
    }
    
    // Check if card exists
    const existingCard = getCreditCardById(creditCard.id);
    if (!existingCard) {
      return NextResponse.json(
        { error: 'Credit card not found' },
        { status: 404 }
      );
    }
    
    // Update the card
    const success = updateCreditCard(creditCard);
    
    if (success) {
      return NextResponse.json(creditCard, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Failed to update credit card' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating credit card:', error);
    return NextResponse.json(
      { error: 'Failed to update credit card' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    
    if (!idParam) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }
    
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    // Check if card exists
    const existingCard = getCreditCardById(id);
    if (!existingCard) {
      return NextResponse.json(
        { error: 'Credit card not found' },
        { status: 404 }
      );
    }
    
    // Delete the card
    const success = deleteCreditCard(id);
    
    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete credit card' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return NextResponse.json(
      { error: 'Failed to delete credit card' },
      { status: 500 }
    );
  }
} 