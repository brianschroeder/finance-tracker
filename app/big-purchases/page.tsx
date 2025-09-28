'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

interface Transaction {
  id: number;
  date: string;
  name: string;
  amount: number;
  categoryId: number;
  cashBack?: number;
  notes?: string;
  pending?: boolean;
  pendingTipAmount?: number;
  creditCardPending?: boolean;
  cashbackPosted?: boolean;
  createdAt?: string;
}

interface BigPurchaseCategory {
  id?: number;
  name: string;
  allocatedAmount: number;
  color: string;
  isActive: boolean;
  isBudgetCategory: boolean;
  createdAt?: string;
  totalSpent?: number;
  transactionCount?: number;
  transactions?: Transaction[];
}

export default function BigPurchasesPage() {
  const [categories, setCategories] = useState<BigPurchaseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Transaction drill-down state
  const [selectedCategory, setSelectedCategory] = useState<BigPurchaseCategory | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'name'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterAmount, setFilterAmount] = useState<{min: number, max: number}>({min: 0, max: Infinity});
  const [filterDateRange, setFilterDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  
  // Form state
  const [newCategory, setNewCategory] = useState<BigPurchaseCategory>({
    name: '',
    allocatedAmount: 0,
    color: '#9333EA', // Purple default
    isActive: true,
    isBudgetCategory: false
  });
  
  const [editingCategory, setEditingCategory] = useState<BigPurchaseCategory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch big purchase categories
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/budget-categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      // Filter to only show big purchase categories (non-budget)
      const bigPurchases = (data.categories || []).filter((cat: any) => cat.isBudgetCategory === false);
      
      // Fetch spending data for each category
      const categoriesWithSpending = await Promise.all(
        bigPurchases.map(async (category: any) => {
          try {
            const spendingResponse = await fetch(`/api/transactions?categoryId=${category.id}`);
            if (spendingResponse.ok) {
              const data = await spendingResponse.json();
              const transactions = data.transactions || [];
              const totalSpent = transactions.reduce((sum: number, transaction: any) => sum + transaction.amount, 0);
              return {
                ...category,
                totalSpent,
                transactionCount: transactions.length,
                transactions
              };
            }
          } catch (err) {
            console.error(`Error fetching spending for category ${category.id}:`, err);
          }
          
          return {
            ...category,
            totalSpent: 0,
            transactionCount: 0
          };
        })
      );
      
      setCategories(categoriesWithSpending);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load big purchase categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (isEditing && editingCategory) {
      setEditingCategory(prev => ({
        ...prev!,
        [name]: type === 'number' ? parseFloat(value) : value
      }));
    } else {
      setNewCategory(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      const categoryData = isEditing ? editingCategory! : newCategory;
      
      // Validate required fields
      if (!categoryData.name.trim()) {
        toast({
          title: "Error",
          description: "Category name is required",
          variant: "error"
        });
        return;
      }
      
      const url = isEditing ? '/api/budget-categories' : '/api/budget-categories';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...categoryData,
          isBudgetCategory: false, // Always false for big purchases
          allocatedAmount: 0 // Always 0 for big purchases
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} big purchase category`);
      }
      
      toast({
        title: "Success",
        description: `Big purchase category ${isEditing ? 'updated' : 'created'} successfully`,
      });
      
      // Reset form
      setNewCategory({
        name: '',
        allocatedAmount: 0,
        color: '#9333EA',
        isActive: true,
        isBudgetCategory: false
      });
      setEditingCategory(null);
      setIsEditing(false);
      
      // Refresh categories
      fetchCategories();
      
    } catch (err) {
      console.error('Error saving category:', err);
      toast({
        title: "Error", 
        description: `Failed to ${isEditing ? 'update' : 'create'} big purchase category`,
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (category: BigPurchaseCategory) => {
    setEditingCategory(category);
    setIsEditing(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setIsEditing(false);
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this big purchase category? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/budget-categories?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete big purchase category');
      }
      
      toast({
        title: "Success",
        description: "Big purchase category deleted successfully",
      });
      
      fetchCategories();
      
    } catch (err) {
      console.error('Error deleting category:', err);
      toast({
        title: "Error",
        description: "Failed to delete big purchase category",
        variant: "error"
      });
    }
  };

  // Handle expanding/collapsing transaction view
  const toggleTransactions = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle drill-down into transaction details
  const handleDrillDown = (category: BigPurchaseCategory) => {
    setSelectedCategory(category);
    setShowTransactionDetails(true);
  };

  // Handle closing transaction details
  const handleCloseDetails = () => {
    setShowTransactionDetails(false);
    setSelectedCategory(null);
  };

  // Sort transactions based on current sort settings
  const getSortedTransactions = (transactions: Transaction[]) => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = Math.abs(a.amount) - Math.abs(b.amount);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Filter transactions based on current filter settings
  const getFilteredTransactions = (transactions: Transaction[]) => {
    return transactions.filter(transaction => {
      // Amount filter
      const amount = Math.abs(transaction.amount);
      if (amount < filterAmount.min || amount > filterAmount.max) {
        return false;
      }
      
      // Date range filter
      if (filterDateRange.start && transaction.date < filterDateRange.start) {
        return false;
      }
      if (filterDateRange.end && transaction.date > filterDateRange.end) {
        return false;
      }
      
      return true;
    });
  };

  // Handle sort change
  const handleSort = (field: 'date' | 'amount' | 'name') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort arrow indicator component
  const SortArrow = ({ field }: { field: 'date' | 'amount' | 'name' }) => {
    if (field !== sortField) return null;
    
    return (
      <span className="ml-1 text-xs">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Parse date manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-100 rounded w-64 mb-12"></div>
            <div className="space-y-6">
              <div className="h-24 bg-gray-100 rounded-xl"></div>
              <div className="h-24 bg-gray-100 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-light text-gray-900 mb-3">Big Purchases</h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            Track major expenses without budget constraints
          </p>
        </div>

        {/* Summary Section */}
        {categories.length > 0 && (
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              <div className="text-center">
                <div className="text-3xl font-light text-gray-900 mb-2">
                  ${categories.reduce((sum, cat) => sum + (cat.totalSpent || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-gray-500">Total Spending</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-gray-900 mb-2">
                  {categories.reduce((sum, cat) => sum + (cat.transactionCount || 0), 0)}
                </div>
                <div className="text-gray-500">Total Transactions</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Categories List */}
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            {categories.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-light text-gray-900 mb-3">No purchases yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Create your first category to start tracking major expenses</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map(category => {
                  const isExpanded = expandedCategories.has(category.id!);
                  const transactions = category.transactions || [];
                  
                  return (
                    <div key={category.id} className="group border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">{category.transactionCount || 0} transactions</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleTransactions(category.id!)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                            aria-label="Toggle transactions"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                            aria-label="Edit category"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category.id!)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
                            aria-label="Delete category"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-2xl font-light text-gray-900">
                          ${(category.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        
                        {transactions.length > 0 && (
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => toggleTransactions(category.id!)}
                              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {isExpanded ? 'Hide transactions' : 'View transactions'}
                            </button>
                            <button
                              onClick={() => handleDrillDown(category)}
                              className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
                            >
                              Drill down
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Expandable Transactions List */}
                      {isExpanded && transactions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {transactions.map(transaction => (
                              <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-900">{transaction.name}</h4>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-gray-900">
                                        {formatCurrency(Math.abs(transaction.amount))}
                                      </div>
                                      {transaction.cashBack && transaction.cashBack > 0 && (
                                        <div className="text-xs text-green-600 font-medium">
                                          +{formatCurrency(transaction.cashBack)} cashback
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{formatDate(transaction.date)}</p>
                                  {transaction.notes && (
                                    <p className="text-xs text-gray-400 mt-1">{transaction.notes}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {isExpanded && transactions.length === 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-center text-gray-500 text-sm">
                          No transactions found for this category
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Form */}
          <div className="lg:col-span-1">
            <div className="border border-gray-200 rounded-xl p-8 sticky top-6">
              <h2 className="text-xl font-light text-gray-900 mb-8">
                {isEditing ? 'Edit Category' : 'New Category'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label htmlFor="name" className="block text-sm text-gray-500 mb-3">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={isEditing ? editingCategory?.name : newCategory.name}
                    onChange={handleInputChange}
                    placeholder="Vacation, Home renovation..."
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 text-gray-900 placeholder-gray-400 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="color" className="block text-sm text-gray-500 mb-3">
                    Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      id="color"
                      name="color"
                      value={isEditing ? editingCategory?.color : newCategory.color}
                      onChange={handleInputChange}
                      className="h-12 w-12 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: isEditing ? editingCategory?.color : newCategory.color }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save' : 'Create')}
                  </button>
                  
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedCategory.color }}
                ></div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900">{selectedCategory.name} Transactions</h2>
                  <p className="text-gray-500">
                    {selectedCategory.transactions?.length || 0} transactions • 
                    Total: {formatCurrency(selectedCategory.totalSpent || 0)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDetails}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filters and Sorting */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                {/* Sort Controls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSort('date')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        sortField === 'date' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Date<SortArrow field="date" />
                    </button>
                    <button
                      onClick={() => handleSort('amount')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        sortField === 'amount' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Amount<SortArrow field="amount" />
                    </button>
                    <button
                      onClick={() => handleSort('name')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        sortField === 'name' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Name<SortArrow field="name" />
                    </button>
                  </div>
                </div>

                {/* Amount Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterAmount.min || ''}
                      onChange={(e) => setFilterAmount(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterAmount.max === Infinity ? '' : filterAmount.max}
                      onChange={(e) => setFilterAmount(prev => ({ ...prev, max: parseFloat(e.target.value) || Infinity }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filterDateRange.start}
                      onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={filterDateRange.end}
                      onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterAmount({min: 0, max: Infinity});
                      setFilterDateRange({start: '', end: ''});
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                const transactions = selectedCategory.transactions || [];
                const filtered = getFilteredTransactions(transactions);
                const sorted = getSortedTransactions(filtered);
                
                return (
                  <div className="space-y-4">
                    {sorted.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                        <p className="text-gray-500">Try adjusting your filters to see more results</p>
                      </div>
                    ) : (
                      sorted.map(transaction => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900 text-lg">{transaction.name}</h4>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900 text-lg">
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </div>
                                {transaction.cashBack && transaction.cashBack > 0 && (
                                  <div className="text-sm text-green-600 font-medium">
                                    +{formatCurrency(transaction.cashBack)} cashback
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-3">
                                <span className="font-medium">{formatDate(transaction.date)}</span>
                                {transaction.pending && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                    Pending
                                  </span>
                                )}
                                {transaction.creditCardPending && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    Credit Card Pending
                                  </span>
                                )}
                                {transaction.pendingTipAmount && transaction.pendingTipAmount > 0 && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                    Tip: {formatCurrency(transaction.pendingTipAmount)}
                                  </span>
                                )}
                              </div>
                              
                              {transaction.notes && (
                                <div className="text-xs text-gray-400 max-w-xs truncate italic">
                                  {transaction.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 