'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

interface BudgetCategory {
  id?: number;
  name: string;
  allocatedAmount: number;
  color: string;
  isActive: boolean;
  isBudgetCategory?: boolean;
  createdAt?: string;
}

export default function BudgetManagement() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [newCategory, setNewCategory] = useState<BudgetCategory>({
    name: '',
    allocatedAmount: 0,
    color: '#3B82F6',
    isActive: true,
    isBudgetCategory: true
  });
  
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch budget categories
  useEffect(() => {
    fetchCategories();
  }, []);
  
  async function fetchCategories() {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/budget-categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch budget categories');
      }
      
      const data = await response.json();
      // Only show actual budget categories (filter out big purchase categories)
      const budgetCategories = (data.categories || []).filter((cat: any) => cat.isBudgetCategory !== false);
      setCategories(budgetCategories);
      // Calculate total allocated from budget categories only
      const budgetTotal = budgetCategories.reduce((sum: number, cat: any) => sum + (cat.allocatedAmount || 0), 0);
      setTotalAllocated(budgetTotal);
    } catch (err) {
      console.error('Error fetching budget categories:', err);
      setError('Failed to load budget categories. Please try again.');
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
      if (isEditing && editingCategory?.id) {
        // Update existing category
        const response = await fetch('/api/budget-categories', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editingCategory)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update category');
        }
        
        toast({
          title: 'Category Updated',
          description: `${editingCategory.name} has been updated successfully.`
        });
      } else {
        // Create new category
        const response = await fetch('/api/budget-categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newCategory)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create category');
        }
        
        toast({
          title: 'Category Added',
          description: `${newCategory.name} has been added to your budget.`
        });
        
        // Reset form
        setNewCategory({
          name: '',
          allocatedAmount: 0,
          color: '#3B82F6',
          isActive: true
        });
      }
      
      // Refresh categories
      fetchCategories();
      
      // Reset editing state
      setIsEditing(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error saving budget category:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save category'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Edit a category
  const handleEdit = (category: BudgetCategory) => {
    setEditingCategory({ ...category });
    setIsEditing(true);
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setIsEditing(false);
  };
  
  // Delete a category
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this budget category?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/budget-categories?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
      
      toast({
        title: 'Category Deleted',
        description: 'The budget category has been deleted successfully.'
      });
      
      // Refresh categories
      fetchCategories();
    } catch (err) {
      console.error('Error deleting budget category:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete category'
      });
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Calculate percentage of total
  const calculatePercentage = (amount: number) => {
    if (totalAllocated <= 0) return 0;
    return (amount / totalAllocated) * 100;
  };

  // Calculate biweekly amount (monthly / 2)
  const calculateBiweeklyAmount = (amount: number) => {
    return amount / 2;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Budget Categories List */}
      <div className="md:col-span-2">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">Budget Categories</h2>
          
          {error && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}
          
          {categories.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-gray-600">No budget categories found. Create your first category to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-100 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Monthly Budget</h3>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(totalAllocated)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Budget categories only
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-100 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Biweekly Budget</h3>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(calculateBiweeklyAmount(totalAllocated))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on 2 pay periods per month
                  </p>
                </div>
              </div>
              
              {/* Budget Categories Section */}
              {categories.filter(cat => cat.isBudgetCategory !== false).length > 0 && (
                <div className="mb-8">
                                     <div className="flex items-center mb-4">
                     <h3 className="text-lg font-semibold text-gray-800">Budget Categories</h3>
                     <div className="ml-auto px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                       Budget
                     </div>
                   </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {categories
                      .filter(cat => cat.isBudgetCategory !== false)
                      .map(category => (
                        <div key={category.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                                style={{ backgroundColor: `${category.color}20` }}  
                              >
                                <span 
                                  className="inline-block w-5 h-5 rounded-full" 
                                  style={{ backgroundColor: category.color }}
                                ></span>
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-800">{category.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  {calculatePercentage(category.allocatedAmount).toFixed(1)}% of budget
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEdit(category)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                aria-label="Edit category"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(category.id!)}
                                className="text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                aria-label="Delete category"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4 mb-3">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Monthly</p>
                              <p className="text-xl font-bold text-gray-900">
                                {formatCurrency(category.allocatedAmount)}
                              </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                              <p className="text-xs text-gray-500 mb-1">Biweekly</p>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(calculateBiweeklyAmount(category.allocatedAmount))}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${calculatePercentage(category.allocatedAmount)}%`,
                                  backgroundColor: category.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {categories.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Yet</h3>
                  <p className="text-gray-500 mb-4">Create your first budget category to get started.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Budget Category Form */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 sticky top-6">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">
            {isEditing ? 'Edit Category' : 'Add New Category'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={isEditing ? editingCategory?.name : newCategory.name}
                onChange={handleInputChange}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                required
              />
            </div>
            
            <div>
              <label htmlFor="allocatedAmount" className="block text-sm font-medium text-gray-700 mb-1.5">
                Monthly Budget Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="allocatedAmount"
                  name="allocatedAmount"
                  min="0"
                  step="0.01"
                  value={isEditing ? editingCategory?.allocatedAmount : newCategory.allocatedAmount}
                  onChange={handleInputChange}
                  className="block w-full pl-7 pr-12 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  required
                />
              </div>
              {((isEditing && editingCategory?.allocatedAmount ? editingCategory.allocatedAmount : newCategory.allocatedAmount) > 0) && (
                <div className="text-sm text-gray-500 mt-2 bg-green-50 px-3 py-2 rounded-lg">
                  Biweekly: <span className="font-semibold text-green-700">{formatCurrency(calculateBiweeklyAmount(isEditing && editingCategory ? (editingCategory.allocatedAmount ?? 0) : newCategory.allocatedAmount))}</span>
                </div>
              )}
            </div>
            

            
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1.5">
                Category Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={isEditing ? editingCategory?.color : newCategory.color}
                  onChange={handleInputChange}
                  className="h-10 w-10 rounded-lg cursor-pointer border-0"
                />
                <div 
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: isEditing ? editingCategory?.color : newCategory.color }}
                ></div>
                <span className="text-sm text-gray-500">
                  Choose a color for this category
                </span>
              </div>
            </div>
            
            <div className="pt-3">
              {isEditing ? (
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors text-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-800 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors text-sm"
                >
                  {isSubmitting ? 'Adding...' : 'Add Category'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 