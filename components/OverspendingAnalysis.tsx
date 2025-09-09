'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Transaction {
  id: number;
  date: string;
  categoryId: number | null;
  name: string;
  amount: number;
  cashBack?: number;
  notes?: string;
  category?: {
    id: number;
    name: string;
    color: string;
  };
}

interface CategoryOverspending {
  id: number;
  name: string;
  color: string;
  budgetAmount: number;
  spent: number;
  overspent: number;
  overspentPercentage: number;
  transactions: Transaction[];
}

interface OverspendingPeriod {
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalSpent: number;
  overspent: number;
  categories: CategoryOverspending[];
  biggestTransactions: Transaction[];
}

interface OverspendingSummary {
  totalOverspent: number;
  averageOverspent: number;
  periodsAnalyzed: number;
  problematicCategories: Array<{
    id: number;
    name: string;
    color: string;
    totalOverspent: number;
    occurrences: number;
    averageOverspent: number;
  }>;
}

interface OverspendingData {
  periods: OverspendingPeriod[];
  summary: OverspendingSummary;
  payFrequency: 'weekly' | 'biweekly';
}

export default function OverspendingAnalysis() {
  const [data, setData] = useState<OverspendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriods, setSelectedPeriods] = useState(6);

  useEffect(() => {
    fetchOverspendingData();
  }, [selectedPeriods]);

  const fetchOverspendingData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/overspending-analysis?periods=${selectedPeriods}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch overspending data');
      }
      
      const overspendingData = await response.json();
      setData(overspendingData);
    } catch (err) {
      console.error('Error fetching overspending data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load overspending data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy');
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading overspending analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Data</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchOverspendingData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No overspending data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overspending Analysis</h1>
          <p className="text-gray-600">
            Track your overspending patterns across {data.payFrequency} pay periods
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="periods" className="text-sm font-medium text-gray-700">
            Periods:
          </label>
          <select
            id="periods"
            value={selectedPeriods}
            onChange={(e) => setSelectedPeriods(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={3}>Last 3</option>
            <option value={6}>Last 6</option>
            <option value={12}>Last 12</option>
            <option value={24}>Last 24</option>
          </select>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="periods">By Period</TabsTrigger>
          <TabsTrigger value="categories">Problem Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Summary Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Overspending</h3>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(data.summary.totalOverspent)}
                </div>
                <p className="text-sm text-gray-600">
                  Across {data.summary.periodsAnalyzed} {data.payFrequency} periods
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Average Per Period</h3>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-600">
                  {formatCurrency(data.summary.averageOverspent)}
                </div>
                <p className="text-sm text-gray-600">
                  Per {data.payFrequency} period
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Periods with Overspending</h3>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-yellow-600">
                  {data.periods.filter(p => p.overspent > 0).length}
                </div>
                <p className="text-sm text-gray-600">
                  Out of {data.periods.length} periods analyzed
                </p>
              </div>
            </Card>
          </div>

          {/* Most Problematic Categories */}
          {data.summary.problematicCategories.length > 0 && (
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Most Problematic Categories</h3>
              <div className="space-y-3">
                {data.summary.problematicCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-gray-600">
                          Overspent in {category.occurrences} period{category.occurrences > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(category.totalOverspent)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg: {formatCurrency(category.averageOverspent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="periods" className="mt-6">
          <div className="space-y-6">
            {data.periods.map((period, index) => (
              <Card key={index} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {formatDateRange(period.startDate, period.endDate)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Budget: {formatCurrency(period.totalBudget)} | 
                      Spent: {formatCurrency(period.totalSpent)}
                    </p>
                  </div>
                  {period.overspent > 0 && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(period.overspent)} over
                      </div>
                      <div className="text-sm text-gray-600">
                        {((period.overspent / period.totalBudget) * 100).toFixed(1)}% over budget
                      </div>
                    </div>
                  )}
                </div>

                {period.overspent > 0 ? (
                  <>
                    {/* Overspent Categories */}
                    {period.categories.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Categories Over Budget:</h4>
                        <div className="space-y-2">
                          {period.categories.slice(0, 3).map((category) => (
                            <div key={category.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                ></div>
                                <span className="font-medium">{category.name}</span>
                              </div>
                              <div className="text-red-600 font-semibold">
                                +{formatCurrency(category.overspent)}
                              </div>
                            </div>
                          ))}
                          {period.categories.length > 3 && (
                            <div className="text-sm text-gray-600 text-center">
                              +{period.categories.length - 3} more categories
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Biggest Transactions */}
                    {period.biggestTransactions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Largest Transactions:</h4>
                        <div className="space-y-1">
                          {period.biggestTransactions.slice(0, 5).map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                {transaction.category && (
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: transaction.category.color }}
                                  ></div>
                                )}
                                <span>{transaction.name}</span>
                              </div>
                              <div className="font-medium">
                                {formatCurrency(Math.abs(transaction.amount))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-green-600">
                    ✓ No overspending this period
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.summary.problematicCategories.map((category) => (
              <Card key={category.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(category.totalOverspent)}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Periods with overspending:</span>
                    <span className="font-medium">{category.occurrences}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average overspent per period:</span>
                    <span className="font-medium">{formatCurrency(category.averageOverspent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <span className="font-medium">
                      {((category.occurrences / data.periods.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="text-sm text-gray-600">
                  This category consistently goes over budget. Consider adjusting your budget allocation
                  or reviewing your spending patterns in this area.
                </div>
              </Card>
            ))}
          </div>

          {data.summary.problematicCategories.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-green-600 mb-2">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Great Job!</h3>
              <p className="text-gray-600">
                No consistently problematic categories detected in your recent spending patterns.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
