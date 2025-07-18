'use client';

import { useState, useEffect } from 'react';
import { RecurringTransaction } from '@/lib/db';
import RecurringTransactionList from '@/components/RecurringTransactionList';
import RecurringBillsChart from '@/components/RecurringBillsChart';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { AddTransactionButton } from '@/components/ui/add-transaction-button';
import Link from 'next/link';

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all recurring transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recurring-transactions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions');
      }
      
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Refresh transactions callback for child components
  const handleTransactionsUpdate = () => {
    fetchTransactions();
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Recurring Transactions</h1>
              <p className="text-gray-500 mt-1.5">
                Manage your monthly recurring bills, subscriptions, and other regular expenses with categories
              </p>
            </div>
            <div className="flex gap-2">
              <AddTransactionButton />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        )}
        
        {/* Bills Overview Chart */}
        <RecurringBillsChart 
          transactions={transactions} 
          onTransactionsUpdate={handleTransactionsUpdate}
        />
        
        {/* Transactions Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <RecurringTransactionList 
            initialTransactions={transactions}
            onTransactionsUpdate={handleTransactionsUpdate}
          />
        </div>
      </div>
    </div>
  );
} 