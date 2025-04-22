// Stock API utility functions
// This uses the Alpha Vantage API as an example. You may need to register for a free API key.
// Visit: https://www.alphavantage.co/support/#api-key

// You can replace this with your own API key after registering
const ALPHA_VANTAGE_API_KEY = 'demo'; // Using demo key for example purposes

/**
 * Fetches the current stock price for a given symbol
 * Uses our server-side API to avoid CORS issues
 */
export async function getStockPrice(symbol: string): Promise<{
  price: number | null;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: string | null;
  lastUpdated?: string;
  error?: string;
}> {
  try {
    if (!symbol) {
      console.warn('Stock symbol is required');
      return { price: null, error: 'Stock symbol is required' };
    }

    // Use our server-side API route to fetch the stock price
    const response = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`No price data found for ${symbol}`);
        return { price: null, error: 'No price data found' };
      }
      
      // Handle other errors
      console.error(`Error fetching stock price for ${symbol}: ${response.statusText}`);
      return { price: null, error: response.statusText };
    }
    
    const data = await response.json();
    
    if (data.price !== undefined) {
      return data;
    }
    
    console.error(`Unexpected API response format:`, data);
    return { price: null, error: 'Invalid response format' };
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    return { price: null, error: 'Failed to fetch stock price' };
  }
}

/**
 * Simplified function that only returns the price as a number or null
 * This maintains backward compatibility with existing code
 */
export async function getStockPriceOnly(symbol: string): Promise<number | null> {
  const result = await getStockPrice(symbol);
  return result.price;
}

/**
 * Alternative implementation using Yahoo Finance API (unofficial)
 * This can be used as a fallback if Alpha Vantage doesn't work
 */
export async function fetchStockPriceYahoo(symbol: string): Promise<number | null> {
  try {
    // Using Yahoo Finance API (unofficial)
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    
    if (!response.ok) {
      console.error(`Error fetching Yahoo Finance data for ${symbol}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if we got valid data
    if (data.chart && 
        data.chart.result && 
        data.chart.result[0] && 
        data.chart.result[0].meta && 
        data.chart.result[0].meta.regularMarketPrice) {
      return data.chart.result[0].meta.regularMarketPrice;
    }
    
    console.error(`Unexpected Yahoo Finance API response format for ${symbol}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
    return null;
  }
} 