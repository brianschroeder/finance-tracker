'use client';

import { useState } from 'react';
import StockPrice from '../components/StockPrice';

export default function StockDemo() {
  const [symbol, setSymbol] = useState('AAPL');
  const [inputSymbol, setInputSymbol] = useState('AAPL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSymbol(inputSymbol.toUpperCase());
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Stock Price Demo</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="flex-1 border rounded p-2"
          />
          <button 
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Get Price
          </button>
        </div>
      </form>

      <div className="border rounded p-4">
        <div className="flex justify-between items-center">
          <div className="text-xl">
            {symbol}
          </div>
          <StockPrice symbol={symbol} />
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-500">
        Note: Using Yahoo Finance API for real-time stock data
      </p>
    </div>
  );
} 