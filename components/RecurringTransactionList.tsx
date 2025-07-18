'use client';

import { useState, useEffect } from 'react';
import { RecurringTransaction } from '@/lib/db';
import RecurringTransactionForm from './RecurringTransactionForm';

interface RecurringTransactionListProps {
  initialTransactions?: RecurringTransaction[];
  onTransactionsUpdate?: () => void;
}

export default function RecurringTransactionList({ 
  initialTransactions = [],
  onTransactionsUpdate 
}: RecurringTransactionListProps) {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>(initialTransactions);
  const [loading, setLoading] = useState(!initialTransactions.length);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [sortField, setSortField] = useState<'name' | 'amount' | 'dueDate' | 'category' | 'type'>('category');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Update local state when initialTransactions prop changes
  useEffect(() => {
    if (initialTransactions.length > 0) {
      setTransactions(initialTransactions);
      setLoading(false);
    }
  }, [initialTransactions]);
  
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
      
      // Notify parent component of the update
      if (onTransactionsUpdate) {
        onTransactionsUpdate();
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Load transactions on component mount only if no initial transactions provided
  useEffect(() => {
    if (initialTransactions.length === 0) {
      fetchTransactions();
    }
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
      
      // Notify parent component of the update
      if (onTransactionsUpdate) {
        onTransactionsUpdate();
      }
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
      
      // Notify parent component of the update
      if (onTransactionsUpdate) {
        onTransactionsUpdate();
      }
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
      
      // Notify parent component of the update
      if (onTransactionsUpdate) {
        onTransactionsUpdate();
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction');
    }
  };
  
  // Reset all forms and editing states
  const resetForms = () => {
    setShowAddForm(false);
    setEditingTransaction(null);
    setSelectedTransaction(null);
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

  // Get sorted transactions
  const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } 
      else if (sortField === 'amount') {
        return sortDirection === 'asc'
          ? a.amount - b.amount
          : b.amount - a.amount;
      }
      else if (sortField === 'dueDate') {
        return sortDirection === 'asc'
          ? a.dueDate - b.dueDate
          : b.dueDate - a.dueDate;
      }
      else if (sortField === 'category') {
        const categoryA = a.category?.name || '';
        const categoryB = b.category?.name || '';
        return sortDirection === 'asc'
          ? categoryA.localeCompare(categoryB)
          : categoryB.localeCompare(categoryA);
      }
      else if (sortField === 'type') {
        // Sort by isEssential (true/false)
        if (a.isEssential === b.isEssential) return 0;
        if (sortDirection === 'asc') {
          return a.isEssential ? -1 : 1;
        } else {
          return a.isEssential ? 1 : -1;
        }
      }
      return 0;
    });
  };

  // Handle sort change
  const handleSort = (field: 'name' | 'amount' | 'dueDate' | 'category' | 'type') => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort arrow indicator component
  const SortArrow = ({ field }: { field: 'name' | 'amount' | 'dueDate' | 'category' | 'type' }) => {
    if (field !== sortField) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

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
          <a
            href="/recurring-categories"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Categories
          </a>
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
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <SortArrow field="name" />
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  Amount
                  <SortArrow field="amount" />
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('dueDate')}
                >
                  Due Date
                  <SortArrow field="dueDate" />
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('category')}
                >
                  Category
                  <SortArrow field="category" />
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('type')}
                >
                  Type
                  <SortArrow field="type" />
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedTransactions().map(transaction => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(transaction.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Day {transaction.dueDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.category ? (
                      <div className="flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: transaction.category.color }}
                        />
                        <span className="text-sm text-gray-900">{transaction.category.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No Category</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.isEssential
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.isEssential ? 'Essential' : 'Non-Essential'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href="#edit"
                      onClick={(e) => {
                        e.preventDefault();
                        if (selectedTransaction === transaction.id) {
                          // If clicking on the same transaction that's selected, cancel the selection
                          resetForms();
                        } else {
                          // Otherwise select this transaction and edit it
                          resetForms();
                          setSelectedTransaction(transaction.id || null);
                          setEditingTransaction(transaction);
                        }
                      }}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md mr-3 hover:bg-blue-200 inline-block"
                    >
                      {selectedTransaction === transaction.id ? 'Cancel' : 'Edit'}
                    </a>
                    {selectedTransaction === transaction.id && (
                      <a
                        href="#delete"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteTransaction(transaction.id!);
                        }}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 inline-block"
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