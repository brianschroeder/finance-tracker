'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

interface Transaction {
  id?: number;
  date: string;
  categoryId: number | null;
  name: string;
  amount: number;
  cashBack?: number;
  notes?: string;
  pending?: boolean;
  pendingTipAmount?: number;
  createdAt?: string;
  category?: {
    id: number;
    name: string;
    color: string;
    allocatedAmount: number;
    isActive: boolean;
  };
  cashbackPosted?: boolean;
  sortOrder?: number;
}

interface BudgetCategory {
  id: number;
  name: string;
  allocatedAmount: number;
  color: string;
  isActive: boolean;
}

// Sortable Transaction Item Component
function SortableTransactionItem({ 
  transaction, 
  onEdit, 
  onDelete, 
  formatCurrency, 
  formatDate, 
  selectedTransaction 
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  selectedTransaction: number | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: transaction.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="flex items-center cursor-grab active:cursor-grabbing mr-4 p-2 text-gray-400 hover:text-gray-600 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        
        {/* Transaction Info */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Date */}
          <div className="text-sm text-gray-500">
            {formatDate(transaction.date)}
          </div>
          
          {/* Name */}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {transaction.name}
              {transaction.pending && (
                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Pending
                </span>
              )}
              {transaction.pending && transaction.pendingTipAmount && transaction.pendingTipAmount > 0 && (
                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Tip: {formatCurrency(transaction.pendingTipAmount)}
                </span>
              )}
            </div>
            {transaction.notes && (
              <div className="text-xs text-gray-500 truncate max-w-xs">{transaction.notes}</div>
            )}
          </div>
          
          {/* Category */}
          <div>
            {transaction.category ? (
              <span 
                className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" 
                style={{ 
                  backgroundColor: `${transaction.category.color}25`,
                  color: transaction.category.color,
                  border: `1px solid ${transaction.category.color}50`
                }}
              >
                {transaction.category.name}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Uncategorized</span>
            )}
          </div>
          
          {/* Amount */}
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(transaction.amount)}
          </div>
          
          {/* Cash Back */}
          <div className="text-sm">
            {transaction.cashBack && transaction.cashBack > 0 ? (
              <span className={`font-medium ${transaction.cashbackPosted ? 'text-green-600' : 'text-blue-500'}`}>
                {formatCurrency(transaction.cashBack)}
                {!transaction.cashbackPosted && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">pending</span>
                )}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(transaction)}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 text-sm"
          >
            {selectedTransaction === transaction.id ? 'Cancel' : 'Edit'}
          </button>
          {selectedTransaction === transaction.id && (
            <button
              onClick={() => onDelete(transaction.id!)}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Form state
  const [formData, setFormData] = useState<Transaction>({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: null,
    name: '',
    amount: 0,
    cashBack: 0,
    cashbackPosted: true,
    notes: '',
    pending: false,
    pendingTipAmount: 0
  });

  // Tab state
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter state
  const [startDate, setStartDate] = useState<string>(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'));
  
  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
  }, [activeTab, startDate, endDate]);
  
  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);
  
  async function fetchTransactions() {
    try {
      setLoading(true);
      setError('');
      
      let url = '/api/transactions';
      
      if (activeTab === 'filtered') {
        url = `/api/transactions?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchCategories() {
    try {
      const response = await fetch('/api/budget-categories?allActive=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }
  
  // Handle drag end for reordering
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = transactions.findIndex((transaction) => transaction.id === active.id);
      const newIndex = transactions.findIndex((transaction) => transaction.id === over?.id);

      const newTransactions = arrayMove(transactions, oldIndex, newIndex);
      setTransactions(newTransactions);

      // Update the order in the database
      try {
        const transactionIds = newTransactions.map((t) => t.id!);
        
        const response = await fetch('/api/transactions', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactionIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to update transaction order');
        }

        toast({
          title: 'Success',
          description: 'Transaction order updated successfully',
          variant: 'success'
        });
      } catch (err) {
        console.error('Error updating transaction order:', err);
        // Revert the order if the API call failed
        fetchTransactions();
        toast({
          title: 'Error',
          description: 'Failed to update transaction order',
          variant: 'error'
        });
      }
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name === 'amount' && value && !isNaN(parseFloat(value))) {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else if (name === 'categoryId') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? parseInt(value, 10) : null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      categoryId: null,
      name: '',
      amount: 0,
      cashBack: 0,
      cashbackPosted: true,
      notes: '',
      pending: false,
      pendingTipAmount: 0
    });
    setEditingTransaction(null);
    setSelectedTransaction(null);
    setShowForm(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      // Validate form
      if (!formData.date || !formData.name || formData.amount <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields and ensure amount is greater than 0',
          variant: 'error'
        });
        return;
      }
      
      // Check if we're updating a transaction with cashback
      const hasCashback = editingTransaction && editingTransaction.cashBack && editingTransaction.cashBack > 0;
      const cashbackStatusChanged = editingTransaction && 
        formData.cashbackPosted !== editingTransaction.cashbackPosted &&
        (formData.cashBack || 0) > 0;
      
      const method = editingTransaction ? 'PUT' : 'POST';
      const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
      const payload = editingTransaction ? { ...formData, id: editingTransaction.id } : formData;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Check if response is OK first
      if (!response.ok) {
        let errorMessage = 'Failed to update transaction';
        
        // Try to parse error response as JSON
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If parsing JSON fails, use the status text or a generic message
          errorMessage = response.statusText || errorMessage;
          console.error('Failed to parse error response:', jsonError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Success path - try to parse the response
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        console.warn('Response is not JSON but operation succeeded:', jsonError);
        // Continue with default success behavior even if response is not valid JSON
      }
      
      toast({
        title: 'Success',
        description: `Transaction ${editingTransaction ? 'updated' : 'created'} successfully`,
        variant: 'success'
      });
      
      // Refresh transactions list
      fetchTransactions();
      
      // Dispatch event for cashback changes to update dashboard
      if (hasCashback || cashbackStatusChanged || (formData.cashBack && formData.cashBack > 0)) {
        // Create and dispatch a custom event that the dashboard can listen for
        const event = new Event('transactionsChanged');
        window.dispatchEvent(event);
      }
      
      // Reset the form
      resetForm();
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update transaction. Please try again.',
        variant: 'error'
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setSelectedTransaction(transaction.id!);
    setFormData({
      date: transaction.date,
      categoryId: transaction.categoryId,
      name: transaction.name,
      amount: transaction.amount,
      cashBack: transaction.cashBack || 0,
      cashbackPosted: transaction.cashbackPosted !== undefined ? transaction.cashbackPosted : true,
      notes: transaction.notes || '',
      pending: transaction.pending || false,
      pendingTipAmount: transaction.pendingTipAmount || 0
    });
    setShowForm(true);
  };
  
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
        variant: 'success'
      });
      
      // Refresh transactions list
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete transaction',
        variant: 'error'
      });
    }
  };
  
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

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="filtered">Filter by Date</TabsTrigger>
            </TabsList>
            <Button
              onClick={() => setShowForm(!showForm)}
              variant={showForm ? "outline" : "primary"}
            >
              {showForm ? 'Cancel' : 'Add Transaction'}
            </Button>
          </div>
          
          <TabsContent value="filtered" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={startDate}
                  onChange={handleFilterChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={endDate}
                  onChange={handleFilterChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </TabsContent>
          
          {showForm && (
            <div className="mb-6 mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-4">
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0.01"
                        step="0.01"
                        className="block w-full pl-7 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      value={formData.categoryId || ''}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cashBack" className="block text-sm font-medium text-gray-700 mb-1">
                      Cash Back
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="cashBack"
                        name="cashBack"
                        value={formData.cashBack || ''}
                        onChange={handleInputChange}
                        min="0.00"
                        step="0.01"
                        className="block w-full pl-7 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {(formData.cashBack || 0) > 0 && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="cashbackPosted"
                        name="cashbackPosted"
                        checked={formData.cashbackPosted || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, cashbackPosted: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="cashbackPosted" className="ml-2 block text-sm text-gray-700">
                        Cash back has been posted to account
                      </label>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="pending"
                    name="pending"
                    checked={formData.pending || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, pending: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="pending" className="ml-2 block text-sm text-gray-700">
                    Mark as pending (not yet cleared by bank)
                  </label>
                </div>
                
                {formData.pending && (
                  <div className="mb-4">
                    <label htmlFor="pendingTipAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      Pending Tip Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="pendingTipAmount"
                        name="pendingTipAmount"
                        value={formData.pendingTipAmount || ''}
                        onChange={handleInputChange}
                        min="0.00"
                        step="0.01"
                        className="block w-full pl-7 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Amount expected to be added later (e.g., tip)"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      For cases like restaurant bills where the meal charge has already posted, but the tip will be added later.
                      Only the tip amount should be entered here.
                    </p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                  >
                    {editingTransaction ? 'Update' : 'Save'} Transaction
                  </Button>
                </div>
              </form>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-6" role="alert">
              <p>{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-gray-50 px-6 py-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-4"></div> {/* Space for drag handle */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cash Back</div>
                    </div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</div>
                  </div>
                </div>
              </div>
              
              {/* Sortable List */}
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={transactions.map(t => t.id!)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <SortableTransactionItem
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        selectedTransaction={selectedTransaction}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
} 