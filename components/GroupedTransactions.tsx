'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, 
  CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts';

// Modern design color palette
const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16'  // lime-500
];

// Background gradients for bars
const GRADIENTS = [
  ['#3b82f6', '#60a5fa'], // blue gradient
  ['#10b981', '#34d399'], // emerald gradient
  ['#f59e0b', '#fbbf24'], // amber gradient
  ['#ef4444', '#f87171'], // red gradient
  ['#8b5cf6', '#a78bfa'], // violet gradient
  ['#ec4899', '#f472b6'], // pink gradient
  ['#06b6d4', '#22d3ee'], // cyan gradient
  ['#84cc16', '#a3e635']  // lime gradient
];

const GroupedTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [addingTestData, setAddingTestData] = useState(false);
  const [groupedData, setGroupedData] = useState<Array<{name: string, value: number, formattedValue: string}>>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{date: string, amount: number}>>([]);
  const [viewMode, setViewMode] = useState<'vendor' | 'trend'>('vendor');
  const [budgetPeriod, setBudgetPeriod] = useState<{startDate: string, endDate: string} | null>(null);
  const [loadingBudgetPeriod, setLoadingBudgetPeriod] = useState(true);

  // Define fetchBudgetPeriod function outside useEffect so it can be reused
  const fetchBudgetPeriod = async () => {
    try {
      setLoadingBudgetPeriod(true);
      
      // First try to get the pay period from the pay settings
      try {
        const paySettingsResponse = await fetch('/api/pay-settings');
        
        if (!paySettingsResponse.ok) {
          throw new Error('Failed to fetch pay settings');
        }
        
        const payData = await paySettingsResponse.json();
        
        if (payData && payData.lastPayDate) {
          // Calculate pay period based on last pay date and frequency
          const lastPayDate = new Date(payData.lastPayDate);
          // Use UTC methods to avoid timezone issues
          lastPayDate.setUTCHours(0, 0, 0, 0);
          
          const frequency = payData.frequency || 'biweekly';
          
          // Calculate current pay period
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          
          let payPeriodStart = new Date(lastPayDate);
          
          // Find the pay period start that is before today
          while (payPeriodStart > today) {
            // Move back one pay period
            if (frequency === 'weekly') {
              payPeriodStart.setUTCDate(payPeriodStart.getUTCDate() - 7);
            } else {
              payPeriodStart.setUTCDate(payPeriodStart.getUTCDate() - 14);
            }
          }
          
          // Move forward to find the current pay period
          while (true) {
            const payPeriodEnd = new Date(payPeriodStart);
            
            // Set the end date to be exactly the duration of pay period after start, minus 1ms
            // This is important because the end date is inclusive
            if (frequency === 'weekly') {
              payPeriodEnd.setUTCDate(payPeriodStart.getUTCDate() + 7 - 1);
            } else {
              payPeriodEnd.setUTCDate(payPeriodStart.getUTCDate() + 14 - 1);
            }
            
            // Add 23:59:59.999 to end date to make it inclusive of the whole day
            payPeriodEnd.setUTCHours(23, 59, 59, 999);
            
            // If today is within this pay period, we've found it
            if (today <= payPeriodEnd) {
              // Format dates as YYYY-MM-DD for API consumption
              const formatDateString = (date: Date) => {
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              };
              
              // Create a new Date just for end date display to ensure we get the full last day
              const displayEndDate = new Date(payPeriodEnd);
              
              const formattedStart = formatDateString(payPeriodStart);
              const formattedEnd = formatDateString(displayEndDate);
              
              console.log('Calculated pay period dates:', formattedStart, 'to', formattedEnd);
              
              setBudgetPeriod({
                startDate: formattedStart,
                endDate: formattedEnd
              });
              
              setDebugInfo(`Pay period calculated: ${formattedStart} to ${formattedEnd}`);
              break;
            }
            
            // Move to next pay period start
            const nextStart = new Date(payPeriodEnd);
            nextStart.setUTCDate(nextStart.getUTCDate() + 1);
            payPeriodStart = nextStart;
            
            // Safety check to prevent infinite loops
            if (payPeriodStart > new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
              throw new Error('Failed to find current pay period within reasonable time range');
            }
          }
        } else {
          throw new Error('Pay settings data is incomplete');
        }
      } catch (payErr) {
        console.error('Error calculating pay period from pay settings:', payErr);
        
        // Fallback to the budget-analysis API
        const response = await fetch('/api/budget-analysis?periodType=biweekly');
        
        if (!response.ok) {
          throw new Error('Failed to fetch budget period');
        }
        
        const data = await response.json();
        
        if (data.summary && data.summary.startDate && data.summary.endDate) {
          console.log('Budget API returned period:', data.summary.startDate, 'to', data.summary.endDate);
          
          setBudgetPeriod({
            startDate: data.summary.startDate,
            endDate: data.summary.endDate
          });
          
          setDebugInfo(`Budget period from API: ${data.summary.startDate} to ${data.summary.endDate}`);
        } else {
          throw new Error('Budget period data not available from API');
        }
      }
    } catch (err: any) {
      console.error('Error fetching budget period:', err);
      setDebugInfo(`Error getting budget period: ${err.message}`);
      setError('Failed to load budget period');
    } finally {
      setLoadingBudgetPeriod(false);
    }
  };

  // First, fetch the budget period dates
  useEffect(() => {
    fetchBudgetPeriod();
  }, []);

  // Fetch transactions after we have the budget period
  useEffect(() => {
    if (budgetPeriod) {
      fetchTransactions();
    }
  }, [budgetPeriod]);

  const fetchTransactions = async () => {
    if (!budgetPeriod) {
      setDebugInfo('No budget period available, cannot fetch transactions');
      return;
    }
    
    try {
      setLoading(true);
      setDebugInfo(`Fetching transactions for period ${budgetPeriod.startDate} to ${budgetPeriod.endDate}...`);
      
      // Add startDate and endDate query parameters
      const response = await fetch(
        `/api/transactions?startDate=${budgetPeriod.startDate}&endDate=${budgetPeriod.endDate}`
      );
      
      console.log(`Fetching transactions with date range: ${budgetPeriod.startDate} to ${budgetPeriod.endDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setDebugInfo(`Got response: ${JSON.stringify(data).substring(0, 200)}...`);
      
      // The API appears to be returning transactions directly, not inside a 'transactions' field
      let transactionsArray;
      
      // Check if the data is already an array or if it's nested inside a 'transactions' object
      if (Array.isArray(data)) {
        transactionsArray = data;
      } else if (data && data.transactions && Array.isArray(data.transactions)) {
        transactionsArray = data.transactions;
      } else {
        // We'll try to parse the response as a standalone transaction if possible
        transactionsArray = [data];
      }
      
      console.log('Extracted transactions data:', transactionsArray.length, 'transactions');
      
      if (transactionsArray.length > 0) {
        console.log('First transaction:', transactionsArray[0]);
        setDebugInfo(prev => prev + `\nFound ${transactionsArray.length} transactions. First transaction: ${JSON.stringify(transactionsArray[0]).substring(0, 100)}...`);
      }
      
      setTransactions(transactionsArray);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setDebugInfo(`Error: ${err.message || String(err)}`);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Process transactions data whenever it changes
  useEffect(() => {
    // Skip if transactions is not an array
    if (!Array.isArray(transactions)) {
      setDebugInfo(prevInfo => prevInfo + '\nTransactions is not an array');
      setGroupedData([]);
      setTimeSeriesData([]);
      return;
    }
    
    if (transactions.length === 0) {
      setDebugInfo(prevInfo => prevInfo + '\nTransactions array is empty');
      setGroupedData([]);
      setTimeSeriesData([]);
      return;
    }
    
    setDebugInfo(prevInfo => prevInfo + `\nProcessing ${transactions.length} transactions`);
    
    // Create groups for vendor chart
    const groups: Record<string, number> = {};
    let expenseCount = 0;
    
    // Create date-based data for line chart
    const dateMap: Record<string, number> = {};
    
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    sortedTransactions.forEach(transaction => {
      // Check if the transaction object has the expected properties
      if (!transaction || typeof transaction !== 'object') {
        console.error('Invalid transaction:', transaction);
        return;
      }
      
      // Get the name/payee from transaction - look at multiple possible property names
      const payee = 
        transaction.payee ||
        transaction.name ||
        'Unknown';
      
      // Get the amount (handle both positive and negative)
      const amount = typeof transaction.amount === 'number' 
        ? Math.abs(transaction.amount) 
        : 0;
      
      if (amount > 0) {
        // Add to vendor groups
        groups[payee] = (groups[payee] || 0) + amount;
        expenseCount++;
        
        // Add to time series data
        if (transaction.date) {
          const date = transaction.date;
          dateMap[date] = (dateMap[date] || 0) + amount;
        }
      }
    });

    setDebugInfo(prevInfo => prevInfo + `\nFound ${expenseCount} expenses across ${Object.keys(groups).length} vendors`);
    
    // Convert to array and sort by amount (descending)
    const result = Object.entries(groups)
      .map(([name, value]) => ({ 
        name, 
        value,
        formattedValue: formatCurrency(value)
      }))
      .sort((a, b) => b.value - a.value);
    
    // Convert date map to time series array and sort by date
    const timeSeriesResult = Object.entries(dateMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setDebugInfo(prevInfo => prevInfo + `\nTop vendor: ${result.length > 0 ? result[0].name + ' - ' + formatCurrency(result[0].value) : 'None'}`);

    // Take top 7 vendors and group the rest as "Other"
    if (result.length > 7) {
      const topVendors = result.slice(0, 7);
      const otherVendors = result.slice(7);
      const otherTotal = otherVendors.reduce((sum, item) => sum + item.value, 0);
      setGroupedData([...topVendors, { 
        name: 'Other', 
        value: otherTotal,
        formattedValue: formatCurrency(otherTotal)
      }]);
    } else {
      setGroupedData(result);
    }
    
    setTimeSeriesData(timeSeriesResult);
  }, [transactions]);

  const addTestData = async () => {
    try {
      setAddingTestData(true);
      setDebugInfo('Adding test transactions...');
      
      const response = await fetch('/api/test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add test data');
      }
      
      const result = await response.json();
      setDebugInfo(`Added test data: ${result.message}`);
      
      // Refresh transactions
      await fetchTransactions();
    } catch (err: any) {
      console.error('Error adding test data:', err);
      setDebugInfo(`Error adding test data: ${err.message || String(err)}`);
    } finally {
      setAddingTestData(false);
    }
  };

  // Format date for display (MM/DD)
  const formatDateForDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  // Format the date range for display
  const formatDateRange = () => {
    if (!budgetPeriod) return '';
    
    try {
      // Improved date parsing to handle different formats
      const formatDate = (dateStr: string) => {
        try {
          // Parse the date in a way that won't be affected by timezones
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            // Format is YYYY-MM-DD
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            return `${month}/${day}`;
          }
          
          // Fallback to Date parsing if needed
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
          
          console.warn('Could not parse date:', dateStr);
          return dateStr;
        } catch (e) {
          console.error('Error parsing date:', e);
          return dateStr;
        }
      };
      
      console.log('Formatting date range from:', budgetPeriod.startDate, 'to', budgetPeriod.endDate);
      return `${formatDate(budgetPeriod.startDate)} - ${formatDate(budgetPeriod.endDate)}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return `${budgetPeriod.startDate} - ${budgetPeriod.endDate}`;
    }
  };

  if (loading || loadingBudgetPeriod) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-64">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="text-red-500 font-medium mb-2">Error loading data</div>
            <div className="text-xs text-gray-500 max-w-md whitespace-pre-line">{debugInfo}</div>
          </div>
        </div>
      </div>
    );
  }

  if (groupedData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-2">No transactions found for this pay period</p>
        {budgetPeriod && (
          <p className="text-sm text-gray-500">{formatDateRange()}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('vendor')}
            className={`px-3 py-1.5 text-sm font-medium rounded ${
              viewMode === 'vendor' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Vendor
          </button>
          <button
            onClick={() => setViewMode('trend')}
            className={`px-3 py-1.5 text-sm font-medium rounded ${
              viewMode === 'trend' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Date
          </button>
        </div>
        
        {budgetPeriod && (
          <div className="flex items-center">
            <div className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-100">
              Pay Period: <span className="font-bold">{formatDateRange()}</span>
            </div>
            <button 
              onClick={async () => {
                // First refresh the budget period
                await fetchBudgetPeriod();
                // Then refresh transactions if we have a budget period
                if (budgetPeriod) {
                  await fetchTransactions();
                }
              }}
              className="ml-2 p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100"
              title="Refresh data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {viewMode === 'vendor' ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)} 
                labelFormatter={(label) => `Vendor: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="value">
                {groupedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeSeriesData}
              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDateForDisplay}
                dy={10}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)} 
                labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                contentStyle={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                fill="url(#colorAmount)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default GroupedTransactions;