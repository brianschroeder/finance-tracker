import { NextRequest, NextResponse } from 'next/server';
import { getYahooStockPrice } from '@/lib/yahoo-finance';

/**
 * Server-side API route to fetch stock prices
 * This uses yahoo-finance2 library instead of Alpha Vantage
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Stock symbol is required' },
      { status: 400 }
    );
  }

  try {
    const result = await getYahooStockPrice(symbol);
    
    // Check for errors
    if (result.error || !result.price) {
      console.error(`[Stock API] No data for symbol: ${symbol} - ${result.error || 'No price available'}`);
      return NextResponse.json(
        { error: result.error || 'Invalid stock symbol or no data available' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[Stock API] Error fetching stock price:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stock price' },
      { status: 500 }
    );
  }
} 