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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setDebugInfo('Fetching transactions...');
      const response = await fetch('/api/transactions');
      
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
      
      console.log('Extracted transactions data:', transactionsArray);
      
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

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  if (loading) {
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
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-64">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="text-gray-500 font-medium mb-2">No transaction data available</div>
            <div className="text-xs text-gray-400 max-w-md whitespace-pre-line">{debugInfo}</div>
            <button
              onClick={addTestData}
              disabled={addingTestData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition duration-200"
            >
              {addingTestData ? 'Adding...' : 'Add Test Transactions'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total spending
  const totalSpending = groupedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full mx-auto">
      {/* Chart selection tabs */}
      <div className="flex justify-center mb-6 border-b border-gray-200">
        <button
          className={`py-3 px-8 font-medium text-sm transition-colors ${
            viewMode === 'vendor' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setViewMode('vendor')}
        >
          By Vendor
        </button>
        <button
          className={`py-3 px-8 font-medium text-sm transition-colors ${
            viewMode === 'trend' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setViewMode('trend')}
        >
          Spending Trend
        </button>
      </div>

      {viewMode === 'vendor' ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* New Modern Bar Chart section */}
          <div className="w-full lg:w-2/3">
            <div className="h-[630px] bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-8">Spending Distribution</h3>
              
              {/* Custom spending distribution visualization */}
              <div className="space-y-4">
                {groupedData.map((group, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-28 truncate text-sm font-medium text-gray-700">{group.name}</div>
                    
                    <div className="flex-1 h-9 relative">
                      <div 
                        className="absolute inset-0 bg-gray-100 rounded-md"
                      ></div>
                      <div 
                        style={{ 
                          width: `${Math.min(100, (group.value / Math.max(...groupedData.map(d => d.value))) * 100)}%`,
                          background: `linear-gradient(to right, ${GRADIENTS[index % GRADIENTS.length][0]}, ${GRADIENTS[index % GRADIENTS.length][1]})`
                        }} 
                        className="absolute inset-0 h-full rounded-md transition-all duration-500"
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-end pr-3">
                        <span className="text-sm font-semibold text-gray-700">{formatCurrency(group.value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vendor breakdown section */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[650px]">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-700">Vendor Breakdown</h3>
              </div>
              <div className="overflow-y-auto" style={{ height: "calc(100% - 125px)" }}>
                {groupedData.map((group, index) => (
                  <div key={index} className="flex items-center py-5 px-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-full mr-4 flex-shrink-0" 
                        style={{ 
                          background: `linear-gradient(to right, ${GRADIENTS[index % GRADIENTS.length][0]}, ${GRADIENTS[index % GRADIENTS.length][1]})` 
                        }} 
                      />
                      <span className="text-base font-medium text-gray-700 truncate max-w-[220px]">{group.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-gray-800 text-base">{formatCurrency(group.value)}</span>
                      <span className="text-sm text-gray-500">
                        {Math.round((group.value / totalSpending) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between font-semibold">
                  <span className="text-sm text-gray-700">Total</span>
                  <span className="text-gray-800">{formatCurrency(totalSpending)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          {/* Time Series Chart */}
          <div className="h-[650px] bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Spending Trend</h3>
            <div className="h-[calc(100%-3.5rem)]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeSeriesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 30,
                    bottom: 20,
                  }}
                >
                  <defs>
                    <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={true} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDateForDisplay}
                    tick={{ fontSize: 13, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fontSize: 13, fill: '#6B7280' }}
                    width={70}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value as number)}`, 'Amount']}
                    labelFormatter={formatDateForDisplay}
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSpending)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupedTransactions;