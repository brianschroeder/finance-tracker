'use client';

import { useState } from 'react';
import StockPrice from './StockPrice';

export default function StockLookup() {
  const [symbol, setSymbol] = useState('');
  const [currentSymbol, setCurrentSymbol] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      setCurrentSymbol(symbol.trim().toUpperCase());
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Stock Price Lookup</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Lookup
          </button>
        </div>
      </form>

      {currentSymbol && (
        <div className="mt-4">
          <StockPrice symbol={currentSymbol} />
        </div>
      )}
    </div>
  );
} 