'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, formatDistance } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BudgetCategory {
  id: number;
  name: string;
  allocatedAmount: number;
  fullMonthAmount: number;
  color: string;
  spent: number;
  cashBack: number;
  rawSpent: number;
  pendingTipAmount?: number;
  pendingCashbackAmount?: number;
  adjustedSpent?: number; // Spent including pending tips, minus pending cashback
  remaining: number;
  daysInPeriod: number;
}

interface BudgetSummary {
  totalAllocated: number;
  totalMonthlyAllocated: number;
  totalSpent: number;
  totalCashBack: number;
  totalRawSpent: number;
  totalAdjustedSpent?: number;
  totalRemaining: number;
  totalPendingTipAmount?: number;
  totalPendingCashbackAmount?: number;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  periodType: string;
}

export default function BudgetAnalysis() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('biweekly');
  
  // Date ranges
  const today = new Date();
  const currentMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
  
  const previousMonthStart = format(startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)), 'yyyy-MM-dd');
  const previousMonthEnd = format(endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)), 'yyyy-MM-dd');
  
  const yearStart = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
  const yearEnd = format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd');
  
  // Custom date range
  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentMonthEnd);
  
  // Fetch budget analysis
  useEffect(() => {
    fetchBudgetAnalysis();
  }, [activeTab, startDate, endDate]);
  
  async function fetchBudgetAnalysis() {
    try {
      setLoading(true);
      setError('');
      
      let url = '/api/budget-analysis';
      
      // Determine the date range based on the active tab
      if (activeTab === 'currentMonth') {
        url = `${url}?startDate=${currentMonthStart}&endDate=${currentMonthEnd}&periodType=month`;
      } else if (activeTab === 'previousMonth') {
        url = `${url}?startDate=${previousMonthStart}&endDate=${previousMonthEnd}&periodType=month`;
      } else if (activeTab === 'yearToDate') {
        url = `${url}?startDate=${yearStart}&endDate=${yearEnd}&periodType=custom`;
      } else if (activeTab === 'biweekly') {
        url = `${url}?periodType=biweekly`;
      } else if (activeTab === 'custom') {
        url = `${url}?startDate=${startDate}&endDate=${endDate}&periodType=custom`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch budget analysis');
      }
      
      const data = await response.json();
      setCategories(data.categories || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching budget analysis:', err);
      setError('Failed to load budget data. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return format(new Date(year, month - 1, day), 'MMM d, yyyy');
  };
  
  const calculatePercentage = (spent: number, allocated: number) => {
    if (allocated === 0) return 0;
    return Math.min((spent / allocated) * 100, 100); // Cap at 100%
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'startDate') {
      setStartDate(value);
    } else if (name === 'endDate') {
      setEndDate(value);
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="mt-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <Tabs defaultValue="biweekly" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="mb-6">
            <TabsList className="inline-flex bg-gray-100 rounded-lg p-1 space-x-1">
              <TabsTrigger value="biweekly" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">Current Pay Period</TabsTrigger>
              <TabsTrigger value="currentMonth" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">Current Month</TabsTrigger>
              <TabsTrigger value="previousMonth" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">Previous Month</TabsTrigger>
              <TabsTrigger value="yearToDate" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">Year to Date</TabsTrigger>
              <TabsTrigger value="custom" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">Custom Range</TabsTrigger>
            </TabsList>
            
            <TabsContent value="custom" className="mt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={startDate}
                    onChange={handleDateChange}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={endDate}
                    onChange={handleDateChange}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-6" role="alert">
              <p>{error}</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-gray-600">No budget categories found.</p>
              <p className="mt-2 text-gray-600">Create budget categories to track your spending.</p>
            </div>
          ) : (
            <div>
              {summary && (
                <div className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        {summary.periodType === 'month' ? 'Monthly Budget' : 
                         summary.periodType === 'biweekly' ? 'Biweekly Budget' : 'Budget for Period'}
                      </h3>
                      <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(summary.totalAllocated)}</p>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {formatDate(summary.startDate)} - {formatDate(summary.endDate)}
                        {summary.periodType !== 'month' && (
                          <span className="block mt-1">
                            {summary.periodType === 'biweekly' ? 
                             '(14 days - 50.0% of monthly budget)' :
                             `(${summary.daysInPeriod} days - ${(summary.totalAllocated / summary.totalMonthlyAllocated * 100).toFixed(1)}% of monthly budget)`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Total Spent</h3>
                      <p className="text-2xl font-bold text-gray-700 mt-1">
                        {formatCurrency(summary.totalAdjustedSpent !== undefined ? summary.totalAdjustedSpent : summary.totalSpent)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {(((summary.totalAdjustedSpent !== undefined ? summary.totalAdjustedSpent : summary.totalSpent) / summary.totalAllocated) * 100).toFixed(1)}% of budget
                        {((summary.totalPendingTipAmount && summary.totalPendingTipAmount > 0) || (summary.totalPendingCashbackAmount && summary.totalPendingCashbackAmount > 0)) && (
                          <span className="block mt-1">
                            {formatCurrency(summary.totalSpent)} base
                            {summary.totalPendingTipAmount && summary.totalPendingTipAmount > 0 && (
                              <span className="block text-gray-600">+{formatCurrency(summary.totalPendingTipAmount)} pending</span>
                            )}
                            {summary.totalPendingCashbackAmount && summary.totalPendingCashbackAmount > 0 && (
                              <span className="block text-blue-600">-{formatCurrency(summary.totalPendingCashbackAmount)} pending cashback</span>
                            )}
                          </span>
                        )}
                        {summary.totalCashBack > 0 && (
                          <span className="block text-blue-600 mt-1">
                            Cash back: {formatCurrency(summary.totalCashBack)} ({((summary.totalCashBack / summary.totalRawSpent) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className={`p-5 rounded-xl border ${summary.totalRemaining >= 0 ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Remaining</h3>
                      <p className={`text-2xl font-bold mt-1 ${summary.totalRemaining >= 0 ? 'text-green-700' : 'text-gray-900'}`}>
                        {formatCurrency(summary.totalRemaining)}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${summary.totalRemaining >= 0 ? 'bg-green-600' : 'bg-gray-600'}`} 
                          style={{ width: `${100 - calculatePercentage(summary.totalSpent, summary.totalAllocated)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Budget Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.map(category => (
                  <div key={category.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center mb-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                        style={{ backgroundColor: `${category.color}20` }}  
                      >
                        <span 
                          className="inline-block w-5 h-5 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-800">{category.name}</h3>
                    </div>
                    
                    <div className="flex items-baseline mb-3">
                      <p className={`text-2xl font-bold mb-1 ${category.remaining >= 0 ? 'text-blue-600' : 'text-gray-800'}`}>
                        {formatCurrency(category.remaining >= 0 ? category.remaining : -category.remaining)}
                      </p>
                      <p className="text-xs text-gray-500 ml-2">
                        {category.remaining >= 0 ? 'remaining' : 'over budget'}
                      </p>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-3">
                      <div 
                        className={`h-2 rounded-full ${category.remaining < 0 ? 'bg-gray-600' : ''}`}
                        style={{ 
                          width: `${Math.min(calculatePercentage(category.adjustedSpent || category.spent, category.allocatedAmount), 100)}%`,
                          backgroundColor: category.remaining < 0 ? '#4B5563' : category.color 
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-gray-700">
                        {formatCurrency(category.adjustedSpent || category.spent)} spent
                        {((category.pendingTipAmount && category.pendingTipAmount > 0) || (category.pendingCashbackAmount && category.pendingCashbackAmount > 0)) ? (
                          <span className="block text-gray-500 mt-0.5">
                            {formatCurrency(category.spent)} base
                            {category.pendingTipAmount && category.pendingTipAmount > 0 && (
                              <span className="block">+{formatCurrency(category.pendingTipAmount)} pending</span>
                            )}
                            {category.pendingCashbackAmount && category.pendingCashbackAmount > 0 && (
                              <span className="block">-{formatCurrency(category.pendingCashbackAmount)} cashback pending</span>
                            )}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-medium text-gray-500">{(((category.adjustedSpent || category.spent) / category.allocatedAmount) * 100).toFixed(0)}%</span>
                      <span className="font-bold text-gray-700">{formatCurrency(category.allocatedAmount)} budget</span>
                    </div>
                    
                    {category.cashBack > 0 && (
                      <div className="mt-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md inline-block font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline-block mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                        {formatCurrency(category.cashBack)} cash back ({((category.cashBack / category.rawSpent) * 100).toFixed(1)}%)
                      </div>
                    )}
                    
                    {category.remaining < 0 && (
                      <div className="mt-2 text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline-block mr-1 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        Over budget by {formatCurrency(Math.abs(category.remaining))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
} 