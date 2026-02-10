// Yahoo Finance API wrapper with direct API fallback

/**
 * Direct fetch to Yahoo Finance API as a fallback
 */
async function fetchDirectYahooQuote(symbol: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data?.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      return {
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose,
        regularMarketChange: meta.regularMarketPrice && meta.chartPreviousClose 
          ? meta.regularMarketPrice - meta.chartPreviousClose 
          : null,
        regularMarketChangePercent: meta.regularMarketPrice && meta.chartPreviousClose
          ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
          : null,
        currency: meta.currency,
        regularMarketTime: meta.regularMarketTime,
        previousClose: meta.chartPreviousClose || meta.previousClose
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Direct Yahoo API fetch failed for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetches the current stock price for a given symbol using direct API
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

    // Use direct API fetch for better reliability
    const quote = await fetchDirectYahooQuote(symbol);
    
    if (!quote) {
      return {
        price: null,
        previousClose: null,
        change: null,
        changePercent: null,
        currency: null,
        lastUpdated: new Date().toISOString(),
        error: 'No response from API'
      };
    }
    
    // Try to get price from multiple fields (sometimes regularMarketPrice isn't available during off-hours)
    const price = quote.regularMarketPrice 
      || quote.postMarketPrice 
      || quote.preMarketPrice 
      || quote.previousClose 
      || null;
    
    if (!price) {
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
    
    // Extract the relevant data with fallbacks
    const previousClose = quote.regularMarketPreviousClose || quote.previousClose || null;
    const change = quote.regularMarketChange || quote.postMarketChange || quote.preMarketChange || null;
    const changePercent = quote.regularMarketChangePercent || quote.postMarketChangePercent || quote.preMarketChangePercent || null;
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
    
    // Provide more detailed error message
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for common error types
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Network connection failed';
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = 'Symbol not found';
      } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'Rate limit exceeded - please try again later';
      } else if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON')) {
        errorMessage = 'Yahoo Finance API returned invalid data - the service may be temporarily unavailable';
      }
    }
    
    return {
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      currency: null,
      lastUpdated: new Date().toISOString(),
      error: errorMessage
    };
  }
}

/**
 * Gets historical price data for a stock
 */
export async function getYahooHistoricalData(symbol: string, period1: Date, period2: Date) {
  try {
    const period1Unix = Math.floor(period1.getTime() / 1000);
    const period2Unix = Math.floor(period2.getTime() / 1000);
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1Unix}&period2=${period2Unix}&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data?.chart?.result?.[0]?.timestamp) {
      const timestamps = data.chart.result[0].timestamp;
      const quotes = data.chart.result[0].indicators.quote[0];
      
      return timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000),
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index]
      }));
    }
    
    return [];
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
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.quotes || [];
  } catch (error) {
    console.error(`Error searching stocks for "${query}":`, error);
    throw error;
  }
} 