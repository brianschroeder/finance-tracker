'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface InvestmentTransaction {
  id?: number;
  investmentId: number;
  type: 'buy' | 'sell';
  quantity: number;
  pricePerUnit: number;
  transactionDate: string;
  notes?: string;
  createdAt?: string;
}

interface InvestmentTransactionsModalProps {
  investmentId: number;
  investmentSymbol: string;
  investmentName: string;
  isOpen: boolean;
  onClose: () => void;
  onTransactionsUpdated: () => void;
}

export default function InvestmentTransactionsModal({
  investmentId,
  investmentSymbol,
  investmentName,
  isOpen,
  onClose,
  onTransactionsUpdated
}: InvestmentTransactionsModalProps) {
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransaction | null>(null);
  
  const [formData, setFormData] = useState<Partial<InvestmentTransaction>>({
    type: 'buy',
    quantity: 0,
    pricePerUnit: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, investmentId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/investment-transactions?investmentId=${investmentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (['quantity', 'pricePerUnit'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Convert string values to numbers
      const quantity = typeof formData.quantity === 'string' ? parseFloat(formData.quantity as string) : formData.quantity;
      const pricePerUnit = typeof formData.pricePerUnit === 'string' ? parseFloat(formData.pricePerUnit as string) : formData.pricePerUnit;
      
      // Validate
      if (!formData.type || !quantity || quantity <= 0 || !pricePerUnit || pricePerUnit <= 0 || !formData.transactionDate) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields with valid values',
          variant: 'error'
        });
        return;
      }
      
      const submissionData = {
        investmentId,
        type: formData.type,
        quantity,
        pricePerUnit,
        transactionDate: formData.transactionDate,
        notes: formData.notes || ''
      };
      
      const method = editingTransaction ? 'PUT' : 'POST';
      const payload = editingTransaction ? { ...submissionData, id: editingTransaction.id } : submissionData;
      
      const response = await fetch('/api/investment-transactions', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transaction');
      }
      
      toast({
        title: 'Success',
        description: `Transaction ${editingTransaction ? 'updated' : 'added'} successfully`,
        variant: 'success'
      });
      
      // Reset form and refresh
      resetForm();
      fetchTransactions();
      onTransactionsUpdated();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save transaction',
        variant: 'error'
      });
    }
  };

  const handleEdit = (transaction: InvestmentTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      quantity: transaction.quantity,
      pricePerUnit: transaction.pricePerUnit,
      transactionDate: transaction.transactionDate,
      notes: transaction.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (transaction: InvestmentTransaction) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/investment-transactions?id=${transaction.id}&investmentId=${investmentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
      
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
        variant: 'success'
      });
      
      fetchTransactions();
      onTransactionsUpdated();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'error'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'buy',
      quantity: 0,
      pricePerUnit: 0,
      transactionDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingTransaction(null);
    setShowForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate totals from transactions
  const calculateTotals = () => {
    let totalQuantity = 0;
    let totalCost = 0;
    let buyTransactions = 0;

    for (const transaction of transactions) {
      if (transaction.type === 'buy') {
        totalQuantity += transaction.quantity;
        totalCost += transaction.quantity * transaction.pricePerUnit;
        buyTransactions++;
      } else if (transaction.type === 'sell') {
        totalQuantity -= transaction.quantity;
        // For sells, we don't adjust total cost in this simple model
      }
    }

    const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      totalQuantity,
      totalCost,
      avgPrice,
      buyTransactions
    };
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Transaction History</h2>
              <p className="text-sm text-gray-600 mt-1">
                {investmentSymbol} - {investmentName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Transaction Button */}
          {!showForm && (
            <div className="mb-4">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Transaction
              </Button>
            </div>
          )}

          {/* Transaction Form */}
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="transactionDate"
                      value={formData.transactionDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleInputChange}
                      placeholder="0.5"
                      step="any"
                      min="0.00000001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Per Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="pricePerUnit"
                      value={formData.pricePerUnit || ''}
                      onChange={handleInputChange}
                      placeholder="100.00"
                      step="0.01"
                      min="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes || ''}
                      onChange={handleInputChange}
                      placeholder="Optional notes about this transaction"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingTransaction ? 'Update' : 'Add'} Transaction
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Summary Section */}
          {!loading && transactions.length > 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Portfolio Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase mb-1">Total Quantity</p>
                    <p className="text-2xl font-bold text-blue-900" title={`Exact: ${totals.totalQuantity}`}>
                      {totals.totalQuantity}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">Exact amount owned</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase mb-1">Total Cost</p>
                    <p className="text-2xl font-bold text-green-900" title={`Exact: $${totals.totalCost}`}>
                      {formatCurrency(totals.totalCost)}
                    </p>
                    <p className="text-xs text-green-700 mt-1 font-mono text-[10px]">
                      ${totals.totalCost.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-purple-600 uppercase mb-1">Average Price</p>
                    <p className="text-2xl font-bold text-purple-900" title={`Exact: $${totals.avgPrice}`}>
                      {formatCurrency(totals.avgPrice)}
                    </p>
                    <p className="text-xs text-purple-700 mt-1 font-mono text-[10px]">
                      ${totals.avgPrice.toFixed(8).replace(/\.?0+$/, '')}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{totals.buyTransactions}</p>
                    <p className="text-xs text-gray-700 mt-1">Total purchases</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No transactions yet</p>
              <p className="text-sm text-gray-400">
                Add your first transaction to start tracking this investment
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Transaction History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50 text-gray-700 text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Price/Unit</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {formatDate(transaction.transactionDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'buy'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transaction.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {transaction.quantity.toFixed(8).replace(/\.?0+$/, '')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(transaction.pricePerUnit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(transaction.quantity * transaction.pricePerUnit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {transaction.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(transaction)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-right font-semibold text-gray-700">
                      Totals:
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">
                      {totals.totalQuantity}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500">
                      -
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">
                      {formatCurrency(totals.totalCost)}
                    </td>
                    <td colSpan={2} className="px-4 py-4 text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span>Avg: {formatCurrency(totals.avgPrice)}</span>
                        <span className="font-mono text-xs text-gray-500">
                          (${totals.avgPrice.toFixed(8).replace(/\.?0+$/, '')})
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
