'use client';

import { useState, useEffect } from 'react';

interface StockPriceProps {
  symbol: string;
  compact?: boolean;
  dailyChangeOnly?: boolean;
}

interface StockData {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  lastUpdated: string;
  error?: string;
}

// Helper function to format the date in a relative format
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Return different strings based on how much time has passed
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    // For dates more than a month ago, show the actual date
    return date.toLocaleDateString();
  }
}

export default function StockPrice({ symbol, compact = false, dailyChangeOnly = false }: StockPriceProps) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Fetch stock price when the symbol changes
  useEffect(() => {
    if (!symbol) return;

    const fetchStockPrice = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}`);
        
        // Handle HTTP error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Error response from stock API:`, errorData);
          throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
        }
        
        // Parse the JSON response
        const stockData = await response.json();
        
        if (!stockData.price) {
          throw new Error('No price data in the response');
        }
        
        setData(stockData);
        setRelativeTime(formatRelativeTime(stockData.lastUpdated));
      } catch (err) {
        console.error(`Error in stock price component:`, err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStockPrice();
  }, [symbol]);

  // Update the relative time every minute
  useEffect(() => {
    if (!data?.lastUpdated) return;

    const updateRelativeTime = () => {
      setRelativeTime(formatRelativeTime(data.lastUpdated));
    };

    // Update immediately
    updateRelativeTime();

    // Then update every minute
    const intervalId = setInterval(updateRelativeTime, 60000); // 60000ms = 1 minute

    return () => clearInterval(intervalId); // Clean up on unmount
  }, [data?.lastUpdated]);

  if (dailyChangeOnly) {
    // Show only the daily price change
    if (loading) {
      return <span className="text-gray-400 animate-pulse">Loading...</span>;
    }
    
    if (error) {
      return <span className="text-red-500 text-sm" title={error}>Error</span>;
    }
    
    if (!data || data.change === null || data.change === undefined) {
      return <span className="text-gray-400">N/A</span>;
    }
    
    // At this point we know data.change is not null or undefined
    const changeValue = data.change;
    const changePercentValue = data.changePercent || 0;
    const isPositive = changeValue >= 0;
    
    return (
      <div className={`${isPositive ? 'text-green-600' : 'text-gray-600'}`}>
        {isPositive ? '+' : ''}{changeValue.toFixed(2)} ({isPositive ? '+' : ''}{changePercentValue.toFixed(2)}%)
      </div>
    );
  }

  if (compact) {
    // Compact view for using in tables or smaller UI elements
    if (loading) {
      return <span className="text-gray-400 animate-pulse">Loading...</span>;
    }
    
    if (error) {
      return <span className="text-red-500 text-sm" title={error}>Error</span>;
    }
    
    if (!data) {
      return <span className="text-gray-400">N/A</span>;
    }
    
    return (
      <div className="text-right">
        <div className="font-medium">${data.price.toFixed(2)}</div>
        {data.change !== undefined && data.change !== null && (
          <div className={`text-xs ${data.change >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.change >= 0 ? '+' : ''}{data.changePercent?.toFixed(2)}%)
          </div>
        )}
        {relativeTime && (
          <span className="text-xs text-gray-400 block" title={new Date(data.lastUpdated).toLocaleString()}>
            {relativeTime}
          </span>
        )}
      </div>
    );
  }

  // Full view with loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg shadow-sm">
        <div className="animate-pulse text-blue-500">Loading price for {symbol}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-red-800">Error fetching price</h3>
        <p className="mt-2 text-red-700">{error}</p>
        <p className="mt-4 text-sm text-red-600">
          Note: Yahoo Finance API may have temporary issues or the symbol may be invalid.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
        <p className="text-gray-500">No stock data available for {symbol}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">{data.symbol}</h3>
        <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
          Stock Price
        </span>
      </div>
      
      <div className="text-3xl font-bold text-green-600 mb-2">
        ${data.price.toFixed(2)}
      </div>
      
      {data.change !== undefined && data.change !== null && (
        <div className={`text-xl font-semibold mb-3 ${(data.change !== null && data.change >= 0) ? 'text-green-600' : 'text-gray-600'}`}>
          {(data.change !== null && data.change >= 0) ? '↑' : '↓'} {Math.abs(data.change !== null ? data.change : 0).toFixed(2)} ({(data.change !== null && data.change >= 0) ? '+' : ''}{data.changePercent?.toFixed(2)}%)
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-500">Previous Close</div>
          <div className="font-medium">${data.previousClose?.toFixed(2) || 'N/A'}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-500">Day Change</div>
          <div className={`font-medium ${data.change && data.change >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {data.change ? (data.change >= 0 ? '+' : '') + data.change.toFixed(2) : 'N/A'}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span>Updated: {relativeTime}</span>
        <span className="text-xs" title="Exact time">
          ({new Date(data.lastUpdated).toLocaleString()})
        </span>
      </div>
    </div>
  );
} 