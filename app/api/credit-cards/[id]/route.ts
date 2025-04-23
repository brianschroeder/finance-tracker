import { NextResponse, NextRequest } from 'next/server';
import { getCreditCardById, updateCreditCard, deleteCreditCard } from '@/lib/db';

// Define the CreditCard interface to match lib/db.ts
interface CreditCard {
  id: number;
  name: string;
  balance: number;
  limit: number;
  color: string; // No longer optional to match the DB interface
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const creditCard = getCreditCardById(id);
    
    if (!creditCard) {
      return NextResponse.json(
        { error: 'Credit card not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(creditCard);
  } catch (error) {
    console.error(`Error fetching credit card:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch credit card' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const updatedCard = await request.json();
    
    // Validate required fields
    if (!updatedCard.name || updatedCard.limit <= 0) {
      return NextResponse.json(
        { error: 'Name and limit are required fields' },
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
    
    // Ensure color is provided, use existing or default
    if (!updatedCard.color) {
      updatedCard.color = existingCard.color || '#000000';
    }
    
    // Update the card with the correct ID
    const cardToUpdate: CreditCard = {
      ...updatedCard,
      id
    };
    
    const success = updateCreditCard(cardToUpdate);
    
    if (success) {
      return NextResponse.json(cardToUpdate);
    } else {
      return NextResponse.json(
        { error: 'Failed to update credit card' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error updating credit card:`, error);
    return NextResponse.json(
      { error: 'Failed to update credit card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = parseInt(context.params.id);
    
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
      return NextResponse.json({ success: true, message: 'Credit card deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete credit card' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error deleting credit card:`, error);
    return NextResponse.json(
      { error: 'Failed to delete credit card' },
      { status: 500 }
    );
  }
} 