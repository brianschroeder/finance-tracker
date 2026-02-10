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
      // Log the error but don't make it a 404 - return the result anyway
      // so clients can decide how to handle it
      console.log(`[Stock API] No data for symbol: ${symbol} - ${result.error || 'No price available'}`);
      
      // Return the result with error info instead of 404
      // This allows clients to handle the error gracefully
      return NextResponse.json({
        ...result,
        price: null,
        error: result.error || 'No price data available'
      }, { status: 200 }); // Changed from 404 to 200 to not trigger error handlers
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[Stock API] Error fetching stock price:`, error);
    
    // Return a structured error response instead of throwing
    return NextResponse.json({
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      currency: null,
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch stock price'
    }, { status: 200 }); // Changed from 500 to 200 to not trigger error handlers
  }
} 