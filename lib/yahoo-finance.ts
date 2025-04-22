// Yahoo Finance API wrapper using the yahoo-finance2 library
import yahooFinance from 'yahoo-finance2';

/**
 * Fetches the current stock price for a given symbol using yahoo-finance2
 */
export async function getYahooStockPrice(symbol: string): Promise<{
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  lastUpdated: string;
  error?: string;
}> {
  try {
    if (!symbol) {
      return {
        price: null,
        previousClose: null,
        change: null,
        changePercent: null,
        currency: null,
        lastUpdated: new Date().toISOString(),
        error: 'Stock symbol is required'
      };
    }

    // Fetch the stock quote using yahoo-finance2
    const quote = await yahooFinance.quote(symbol);
    
    if (!quote || !quote.regularMarketPrice) {
      return {
        price: null,
        previousClose: null,
        change: null,
        changePercent: null,
        currency: null,
        lastUpdated: new Date().toISOString(),
        error: 'No price data found'
      };
    }
    
    // Extract the relevant data
    const price = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose || null;
    const change = quote.regularMarketChange || null;
    const changePercent = quote.regularMarketChangePercent || null;
    const currency = quote.currency || null;
    
    // Use regularMarketTime if available, otherwise use current time
    const timestamp = quote.regularMarketTime 
      ? new Date(Number(quote.regularMarketTime) * 1000).toISOString() 
      : new Date().toISOString();
    
    return {
      price,
      previousClose,
      change,
      changePercent,
      currency,
      lastUpdated: timestamp
    };
  } catch (error) {
    console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
    return {
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      currency: null,
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets historical price data for a stock
 */
export async function getYahooHistoricalData(symbol: string, period1: Date, period2: Date) {
  try {
    const result = await yahooFinance.historical(symbol, {
      period1,
      period2,
      interval: '1d' // daily interval
    });
    
    return result;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Searches for stocks by query
 */
export async function searchYahooStocks(query: string) {
  try {
    const result = await yahooFinance.search(query);
    return result;
  } catch (error) {
    console.error(`Error searching stocks for "${query}":`, error);
    throw error;
  }
} 