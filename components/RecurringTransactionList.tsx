'use client';

import { useState, useEffect } from 'react';
import { RecurringTransaction } from '@/lib/db';
import RecurringTransactionForm from './RecurringTransactionForm';

export default function RecurringTransactionList() {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  
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
  
  // Add a new transaction
  const handleAddTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/recurring-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add transaction');
      }
      
      const data = await response.json();
      
      // Add the new transaction to the list
      setTransactions(prev => [...prev, data.transaction]);
      
      // Hide the form
      setShowAddForm(false);
    } catch (err) {
      throw err;
    }
  };
  
  // Update an existing transaction
  const handleUpdateTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'createdAt'>) => {
    if (!editingTransaction) return;
    
    try {
      const response = await fetch(`/api/recurring-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transaction');
      }
      
      const data = await response.json();
      
      // Update the transaction in the list
      setTransactions(prev => 
        prev.map(t => t.id === editingTransaction.id ? data.transaction : t)
      );
      
      // Clear editing state
      setEditingTransaction(null);
    } catch (err) {
      throw err;
    }
  };
  
  // Delete a transaction
  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      // Remove the transaction from the list
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction');
    }
  };
  
  // Reset all forms and editing states
  const resetForms = () => {
    setShowAddForm(false);
    setEditingTransaction(null);
  };

  // Add event listener for the Add Transaction button
  useEffect(() => {
    const handleShowAddForm = () => {
      resetForms();
      setShowAddForm(true);
    };
    
    window.addEventListener('showAddForm', handleShowAddForm);
    
    return () => {
      window.removeEventListener('showAddForm', handleShowAddForm);
    };
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get total amount for all transactions and essential transactions
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const essentialAmount = transactions.filter(t => t.isEssential).reduce((sum, t) => sum + t.amount, 0);

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
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recurring Transactions</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              resetForms();
              setShowAddForm(true);
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Transaction
          </button>
        </div>
      </div>
      
      {error && (
        <div className="px-6 py-4 bg-blue-100 border-b border-blue-200">
          <p className="text-blue-700">{error}</p>
        </div>
      )}
      
      {/* Add/Edit Form */}
      {(showAddForm || editingTransaction) && (
        <div className="p-6 border-b border-gray-200">
          <h4 className={`text-md font-medium mb-4 ${editingTransaction ? 'bg-blue-100 p-2 rounded text-blue-800' : ''}`}>
            {editingTransaction ? `Edit Transaction: ${editingTransaction.name}` : 'Add New Transaction'}
          </h4>
          <RecurringTransactionForm
            onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
            initialValues={editingTransaction || undefined}
            onCancel={resetForms}
            isEditing={!!editingTransaction}
          />
        </div>
      )}
      
      {/* Transactions Summary */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Total Monthly Recurring:</span>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Essential Expenses:</span>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(essentialAmount)}</p>
            <span className="text-sm text-gray-500">
              ({totalAmount > 0 ? Math.round((essentialAmount / totalAmount) * 100) : 0}% of total)
            </span>
          </div>
        </div>
      </div>
      
      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No recurring transactions found.</p>
          <p className="mt-2">Add your first transaction to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.dueDate}
                    <span className="text-gray-400 text-xs ml-1">
                      {['st', 'nd', 'rd'][((transaction.dueDate + 90) % 100 - 91) % 10] || 'th'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.isEssential ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.isEssential ? 'Essential' : 'Non-essential'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href="#edit"
                      onClick={(e) => {
                        e.preventDefault();
                        if (editingTransaction?.id === transaction.id) {
                          // If clicking on the same transaction that's being edited, cancel edit
                          resetForms();
                        } else {
                          resetForms();
                          // Use setTimeout to ensure state updates have time to process
                          setTimeout(() => {
                            setEditingTransaction(transaction);
                            // Force scroll to the edit form
                            window.scrollTo(0, 0);
                          }, 10);
                        }
                      }}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md mr-3 hover:bg-blue-200 inline-block"
                    >
                      {editingTransaction?.id === transaction.id ? 'Cancel' : 'Edit'}
                    </a>
                    {editingTransaction?.id === transaction.id && (
                      <a
                        href="#delete"
                        onClick={(e) => {
                          e.preventDefault();
                          transaction.id && handleDeleteTransaction(transaction.id);
                        }}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 inline-block"
                      >
                        Delete
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 