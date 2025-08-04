'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface SpendingCategory {
  id: number;
  name: string;
  color: string;
  spent: number;
  cashBack: number;
  rawSpent: number;
  allocatedAmount: number;
  isBudgetCategory: boolean;
}

interface SpendingSummary {
  budget: {
    totalSpent: number;
    totalCashBack: number;
    totalRawSpent: number;
    categoryCount: number;
  };
  tracking: {
    totalSpent: number;
    totalCashBack: number;
    totalRawSpent: number;
    categoryCount: number;
  };
  overall: {
    totalSpent: number;
    totalCashBack: number;
    totalRawSpent: number;
    totalCategories: number;
  };
  startDate: string;
  endDate: string;
}

interface TotalSpendingData {
  budgetCategories: SpendingCategory[];
  trackingCategories: SpendingCategory[];
  summary: SpendingSummary;
}

interface TotalSpendingAnalysisProps {
  className?: string;
}

export default function TotalSpendingAnalysis({ className = '' }: TotalSpendingAnalysisProps) {
  const [spendingData, setSpendingData] = useState<TotalSpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dateRange, setDateRange] = useState<'month' | 'year'>('month');

  useEffect(() => {
    fetchSpendingData();
  }, [dateRange]);

  async function fetchSpendingData() {
    try {
      setLoading(true);
      setError('');
      
      const now = new Date();
      let startDate: string;
      let endDate: string;
      
      if (dateRange === 'month') {
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      } else {
        startDate = format(startOfYear(now), 'yyyy-MM-dd');
        endDate = format(endOfYear(now), 'yyyy-MM-dd');
      }

      const response = await fetch(`/api/total-spending?startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch spending data');
      }
      
      const data = await response.json();
      setSpendingData(data);
    } catch (err) {
      console.error('Error fetching spending data:', err);
      setError('Failed to load spending data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!spendingData) {
    return null;
  }

  const { summary, budgetCategories, trackingCategories } = spendingData;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Total Spending Analysis</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setDateRange('month')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              dateRange === 'month'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDateRange('year')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              dateRange === 'year'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Budget Categories</h3>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(summary.budget.totalSpent)}
          </div>
          <div className="text-sm text-blue-600">
            {summary.budget.categoryCount} categories
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Big Purchases</h3>
          <div className="text-2xl font-bold text-purple-900">
            {formatCurrency(summary.tracking.totalSpent)}
          </div>
          <div className="text-sm text-purple-600">
            {summary.tracking.categoryCount} categories
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-1">Total Spending</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.overall.totalSpent)}
          </div>
          <div className="text-sm text-gray-600">
            All {summary.overall.totalCategories} categories
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Categories */}
        {budgetCategories.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Budget Categories</h3>
            <div className="space-y-2">
              {budgetCategories
                .filter(cat => cat.spent > 0)
                .sort((a, b) => b.spent - a.spent)
                .map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-800">{category.name}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(category.spent)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Big Purchases */}
        {trackingCategories.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Big Purchases 
              <span className="text-sm font-normal text-gray-500 ml-1">(no budget limit)</span>
            </h3>
            <div className="space-y-2">
              {trackingCategories
                .filter(cat => cat.spent > 0)
                .sort((a, b) => b.spent - a.spent)
                .map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-800">{category.name}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(category.spent)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Show message if no big purchase categories exist yet */}
      {trackingCategories.length === 0 && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <div className="text-sm text-purple-800">
            <strong>Tip:</strong> Create big purchase categories to monitor expenses like vacations, 
            home improvements, or special events without affecting your budget calculations.
          </div>
        </div>
      )}
    </div>
  );
} 