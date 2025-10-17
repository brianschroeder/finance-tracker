'use client';

import { RecurringTransaction } from '@/lib/db';
import { useMemo, useState } from 'react';

interface RecurringBillsChartProps {
  transactions: RecurringTransaction[];
  onTransactionsUpdate?: () => void;
}

export default function RecurringBillsChart({ transactions, onTransactionsUpdate }: RecurringBillsChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Sort transactions by amount from highest to lowest, take top 10
  const topTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const topTotal = topTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Colors for the chart segments - expanded palette for 10 items
  const colors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f59e0b', // amber-500
  ];

  // Calculate angles for donut chart
  const segments = useMemo(() => {
    let cumulativeAngle = 0;
    return topTransactions.map((transaction, index) => {
      const percentage = (transaction.amount / topTotal) * 100;
      const angle = (transaction.amount / topTotal) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle += angle;
      
      return {
        ...transaction,
        percentage,
        startAngle,
        endAngle,
        color: colors[index % colors.length]
      };
    });
  }, [topTransactions, topTotal]);

  // Delete a transaction
  const handleDeleteTransaction = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    
    setDeletingId(id);
    
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      // Notify parent component of the update
      if (onTransactionsUpdate) {
        onTransactionsUpdate();
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  // Create SVG path for donut segment
  const createPath = (centerX: number, centerY: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = centerX + outerRadius * Math.cos(startAngleRad);
    const y1 = centerY + outerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(endAngleRad);
    const y2 = centerY + outerRadius * Math.sin(endAngleRad);
    
    const x3 = centerX + innerRadius * Math.cos(endAngleRad);
    const y3 = centerY + innerRadius * Math.sin(endAngleRad);
    const x4 = centerX + innerRadius * Math.cos(startAngleRad);
    const y4 = centerY + innerRadius * Math.sin(startAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", x1, y1,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
      "L", x3, y3,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
      "Z"
    ].join(" ");
  };

  if (transactions.length === 0) {
    return null;
  }

  const hoveredTransaction = hoveredSegment !== null ? segments[hoveredSegment] : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Bills Breakdown</h3>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(totalAmount)}/month
          </div>
          <div className="text-xs text-gray-500">
            {formatCurrency(totalAmount * 12)}/year total
          </div>
        </div>
      </div>
      
      <div className="flex items-start gap-8">
        {/* Donut Chart */}
        <div className="flex-shrink-0 relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {segments.map((segment, index) => (
              <path
                key={segment.id}
                d={createPath(100, 100, 60, 90, segment.startAngle, segment.endAngle)}
                fill={segment.color}
                className={`transition-all duration-200 cursor-pointer ${
                  hoveredSegment === index 
                    ? 'opacity-100 filter drop-shadow-lg' 
                    : hoveredSegment !== null 
                      ? 'opacity-50' 
                      : 'opacity-90 hover:opacity-100'
                }`}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {hoveredTransaction ? (
                <>
                  <div className="text-sm font-medium text-gray-900 truncate max-w-20">
                    {hoveredTransaction.name}
                  </div>
                  <div className="text-lg font-bold" style={{ color: hoveredTransaction.color }}>
                    {formatCurrency(hoveredTransaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(hoveredTransaction.percentage)}%
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-gray-900">Top {topTransactions.length}</div>
                  <div className="text-sm text-gray-500">Bills</div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Scrollable Legend */}
        <div className="flex-1">
          <div className="max-h-64 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {segments.map((segment, index) => (
              <div 
                key={segment.id} 
                className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                  hoveredSegment === index 
                    ? 'bg-gray-50 shadow-sm' 
                    : 'hover:bg-gray-25'
                }`}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 transition-transform duration-200"
                  style={{ 
                    backgroundColor: segment.color,
                    transform: hoveredSegment === index ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {segment.name}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(segment.amount)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(segment.amount * 12)}/year
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(segment.percentage)}% of top bills
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTransaction(segment.id!, segment.name);
                  }}
                  disabled={deletingId === segment.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 disabled:opacity-50"
                  title={`Delete ${segment.name}`}
                >
                  {deletingId === segment.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
            
            {/* Show remaining transactions in scrollable area */}
            {transactions.length > 10 && (
              <div className="border-t pt-3 mt-3">
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Other Bills ({transactions.length - 10} remaining)
                </div>
                {transactions
                  .filter(transaction => !topTransactions.some(top => top.id === transaction.id))
                  .sort((a, b) => b.amount - a.amount)
                  .map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-1 px-2 hover:bg-gray-25 rounded group">
                      <span className="text-xs text-gray-600 truncate">
                        {transaction.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatCurrency(transaction.amount * 12)}/year
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(transaction.id!, transaction.name);
                          }}
                          disabled={deletingId === transaction.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 disabled:opacity-50"
                          title={`Delete ${transaction.name}`}
                        >
                          {deletingId === transaction.id ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                  Additional: {formatCurrency(totalAmount - topTotal)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 