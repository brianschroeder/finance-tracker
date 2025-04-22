'use client';

import { useState, useEffect } from 'react';

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

export default function ApiTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('AAPL');
  const [relativeTime, setRelativeTime] = useState<string>('');

  const fetchStockPrice = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRelativeTime('');

    try {
      const response = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}`);
      const contentType = response.headers.get('content-type');
      
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        throw new Error('Unexpected non-JSON response');
      }
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      
      setResult(data);
      
      if (data.lastUpdated) {
        setRelativeTime(formatRelativeTime(data.lastUpdated));
        
        // Update the relative time every minute
        const intervalId = setInterval(() => {
          setRelativeTime(formatRelativeTime(data.lastUpdated));
        }, 60000);
        
        // Clean up interval on next fetch
        return () => clearInterval(intervalId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Stock API Test</h1>
      
      <div className="p-6 bg-white rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-medium mb-4">Test Parameters</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Symbol
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="px-4 py-2 border rounded-md flex-1"
            />
            <button
              onClick={fetchStockPrice}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter a valid stock symbol (e.g., AAPL, MSFT, GOOGL)
          </p>
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Environment Info</h3>
          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <div>API Key Set: <span className="font-mono">{process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY ? 'Yes' : 'No'}</span></div>
            <div>Node Environment: <span className="font-mono">{process.env.NODE_ENV}</span></div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-4">API Response</h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
          
          {result.price && (
            <div className="mt-6 text-center">
              <div className="text-sm font-medium text-gray-500">Current Price</div>
              <div className="text-3xl font-bold text-green-600">
                ${Number(result.price).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex flex-col items-center">
                <span>Updated: {relativeTime || 'just now'}</span>
                <span className="text-xs opacity-70" title="Exact time">
                  ({new Date(result.lastUpdated).toLocaleString()})
                </span>
                {result.lastTradingDay && (
                  <span className="mt-1">Last Trading Day: {result.lastTradingDay}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 