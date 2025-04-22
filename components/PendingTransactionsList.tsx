'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from "@/components/ui/use-toast";

interface PendingTransaction {
  id: number;
  name: string;
  amount: number;
  dueDate: number;
  isEssential: boolean;
  formattedDate: string;
  daysUntilDue: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  recurringTransactionId: number;
  isCompleted: boolean;
}

interface PaySettings {
  id: number;
  lastPayDate: string;
  frequency: 'weekly' | 'biweekly';
}

export default function PendingTransactionsList() {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [payPeriodStart, setPayPeriodStart] = useState<string | null>(null);
  const [payPeriodEnd, setPayPeriodEnd] = useState<string | null>(null);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);
  const [totalCompletedAmount, setTotalCompletedAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<{ id: number, amount: string } | null>(null);
  const [updatingAmount, setUpdatingAmount] = useState<number | null>(null);

  // Fetch pending transactions
  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  // Update total amounts whenever transactions change
  useEffect(() => {
    updateTotalAmounts();
  }, [transactions]);

  function updateTotalAmounts() {
    // Calculate pending and completed amounts
    const pendingAmount = transactions
      .filter(t => !t.isCompleted)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const completedAmount = transactions
      .filter(t => t.isCompleted)
      .reduce((sum, t) => sum + t.amount, 0);
    
    setTotalPendingAmount(pendingAmount);
    setTotalCompletedAmount(completedAmount);
  }

  async function fetchPendingTransactions() {
    try {
      setLoading(true);
      const response = await fetch('/api/pending-transactions', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending transactions');
      }
      
      const data = await response.json();
      if (data) {
        // Get all transactions
        const allTransactions = data.transactions || [];
        
        setTransactions(allTransactions);
        
        // Extract pay period dates from the first transaction (if available)
        if (allTransactions.length > 0) {
          setPayPeriodStart(allTransactions[0].payPeriodStart);
          setPayPeriodEnd(allTransactions[0].payPeriodEnd);
        }
      }
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
      setError('Could not load pending transactions');
    } finally {
      setLoading(false);
    }
  }

  const toggleTransactionStatus = async (transaction: PendingTransaction) => {
    // Set submitting state with transaction ID to show loading state for this row only
    setSubmitting(transaction.id);
    
    try {
      if (transaction.isCompleted) {
        await handleMarkAsIncomplete(transaction);
      } else {
        await handleMarkAsComplete(transaction);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const handleMarkAsComplete = async (transaction: PendingTransaction) => {
    try {
      const response = await fetch('/api/completed-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recurringTransactionId: transaction.id,
          payPeriodStart: transaction.payPeriodStart,
          payPeriodEnd: transaction.payPeriodEnd
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark transaction as complete');
      }
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => 
          t.id === transaction.id ? { ...t, isCompleted: true } : t
        )
      );
      
      toast({
        title: "Transaction marked as complete",
        description: `${transaction.name} has been marked as complete.`,
      });
    } catch (err) {
      console.error('Error marking transaction as complete:', err);
      toast({
        title: "Error",
        description: "Failed to mark transaction as complete. Please try again.",
        variant: "error",
      });
    }
  };

  const handleMarkAsIncomplete = async (transaction: PendingTransaction) => {
    try {
      // Find the corresponding completed transaction entry
      // We need to make a call to get the completed transaction ID first
      const getResponse = await fetch(`/api/completed-transactions?payPeriodStart=${transaction.payPeriodStart}&payPeriodEnd=${transaction.payPeriodEnd}`);
      
      if (!getResponse.ok) {
        throw new Error('Failed to get completed transactions');
      }
      
      const completedData = await getResponse.json();
      const completedEntry = completedData.transactions.find(
        (t: any) => t.recurringTransactionId === transaction.id
      );
      
      if (!completedEntry) {
        throw new Error('Could not find completed transaction entry');
      }
      
      // Now delete the completed transaction entry
      const response = await fetch(`/api/completed-transactions?id=${completedEntry.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark transaction as incomplete');
      }
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => 
          t.id === transaction.id ? { ...t, isCompleted: false } : t
        )
      );
      
      toast({
        title: "Transaction marked as incomplete",
        description: `${transaction.name} has been marked as incomplete.`,
      });
    } catch (err) {
      console.error('Error marking transaction as incomplete:', err);
      toast({
        title: "Error",
        description: "Failed to mark transaction as incomplete. Please try again.",
        variant: "error",
      });
    }
  };

  // Add new function to handle amount editing
  const handleAmountEdit = (transaction: PendingTransaction) => {
    setEditingTransaction({
      id: transaction.id,
      amount: transaction.amount.toString()
    });
  };

  // Add new function to update amount
  const handleAmountUpdate = async (transaction: PendingTransaction) => {
    if (!editingTransaction) return;
    
    const newAmount = parseFloat(editingTransaction.amount);
    if (isNaN(newAmount)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid number",
        variant: "error"
      });
      return;
    }
    
    setUpdatingAmount(transaction.id);
    
    try {
      const response = await fetch('/api/pending-transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: transaction.id,
          amount: newAmount,
          payPeriodStart: transaction.payPeriodStart,
          payPeriodEnd: transaction.payPeriodEnd
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update amount');
      }
      
      // Update local transaction state
      setTransactions(prev => 
        prev.map(t => 
          t.id === transaction.id ? { ...t, amount: newAmount } : t
        )
      );
      
      toast({
        title: "Amount updated",
        description: `Amount for ${transaction.name} has been updated.`,
      });
    } catch (err) {
      console.error('Error updating amount:', err);
      toast({
        title: "Error",
        description: "Failed to update amount. Please try again.",
        variant: "error"
      });
    } finally {
      setUpdatingAmount(null);
      setEditingTransaction(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  const formatDate = (dateString: string) => {
    // Parse the date string manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    // Create a date with the specific year, month, and day
    // Note: month is 0-indexed in JavaScript Date objects, so we subtract 1
    const date = new Date(year, month - 1, day);
    return format(date, 'MMMM d');
  };

  const pendingTransactions = transactions.filter(t => !t.isCompleted);
  const completedTransactions = transactions.filter(t => t.isCompleted);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {error && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {payPeriodStart && payPeriodEnd && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Transactions for Pay Period
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {formatDate(payPeriodStart)} to {formatDate(payPeriodEnd)}
          </p>
        </div>
      )}
      
      <div className="p-6">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No transactions for this pay period.
            </p>
            <Link 
              href="/recurring-transactions" 
              className="text-blue-600 hover:text-blue-800"
            >
              Manage recurring transactions →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Left
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* First show all pending transactions */}
                  {pendingTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => toggleTransactionStatus(transaction)}
                          disabled={submitting === transaction.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-100 text-blue-800 hover:bg-blue-200`}
                        >
                          {submitting === transaction.id ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : "Pending"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.amount < 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                        {editingTransaction && editingTransaction.id === transaction.id ? (
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={editingTransaction.amount}
                              onChange={(e) => setEditingTransaction({...editingTransaction, amount: e.target.value})}
                              className="w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAmountUpdate(transaction);
                                } else if (e.key === 'Escape') {
                                  setEditingTransaction(null);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleAmountUpdate(transaction)}
                              disabled={updatingAmount === transaction.id}
                              className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                            >
                              {updatingAmount === transaction.id ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                "Save"
                              )}
                            </button>
                            <button
                              onClick={() => setEditingTransaction(null)}
                              className="ml-1 p-1 text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAmountEdit(transaction)}
                            className="hover:underline focus:outline-none"
                          >
                            {formatCurrency(transaction.amount)}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.formattedDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.daysUntilDue} {transaction.daysUntilDue === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.isEssential 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.isEssential ? 'Essential' : 'Optional'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Then show all completed transactions */}
                  {completedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => toggleTransactionStatus(transaction)}
                          disabled={submitting === transaction.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-100`}
                        >
                          {submitting === transaction.id ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : "Completed"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 line-through">
                        {transaction.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 line-through">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 line-through">
                        {formatDate(transaction.formattedDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 line-through">
                        {transaction.daysUntilDue} {transaction.daysUntilDue === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800`}>
                          {transaction.isEssential ? 'Essential' : 'Optional'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Pending Amount
                  </h3>
                  <span className="text-2xl font-bold text-gray-600">
                    {formatCurrency(totalPendingAmount)}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Completed Amount
                  </h3>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalCompletedAmount)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="p-6 border-t border-gray-200">
        <div className="text-right">
          <Link 
            href="/recurring-transactions" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage recurring transactions →
          </Link>
        </div>
      </div>
    </div>
  );
} 