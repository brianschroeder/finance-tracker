'use client';

import { useState, useEffect } from 'react';
import { RecurringCategory } from '@/lib/db';
import RecurringCategoryForm from './RecurringCategoryForm';

export default function RecurringCategoryList() {
  const [categories, setCategories] = useState<RecurringCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RecurringCategory | null>(null);
  
  // Fetch all recurring categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recurring-categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring categories');
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Add a new category
  const handleAddCategory = async (category: Omit<RecurringCategory, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/recurring-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add category');
      }
      
      const data = await response.json();
      
      // Add the new category to the list
      setCategories(prev => [...prev, data.category]);
      
      // Hide the form
      setShowAddForm(false);
    } catch (err) {
      throw err;
    }
  };
  
  // Update an existing category
  const handleUpdateCategory = async (category: Omit<RecurringCategory, 'id' | 'createdAt'>) => {
    if (!editingCategory) return;
    
    try {
      const response = await fetch(`/api/recurring-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }
      
      const data = await response.json();
      
      // Update the category in the list
      setCategories(prev => 
        prev.map(c => c.id === editingCategory.id ? data.category : c)
      );
      
      // Clear editing state
      setEditingCategory(null);
    } catch (err) {
      throw err;
    }
  };
  
  // Delete a category
  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? Recurring transactions using this category will have it removed.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/recurring-categories/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
      
      // Remove the category from the list
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };
  
  // Reset all forms and editing states
  const resetForms = () => {
    setShowAddForm(false);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recurring Transaction Categories</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              resetForms();
              setShowAddForm(true);
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Category
          </button>
        </div>
      </div>
      
      {error && (
        <div className="px-6 py-4 bg-red-100 border-b border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Add/Edit Form */}
      {(showAddForm || editingCategory) && (
        <div className="p-6 border-b border-gray-200">
          <h4 className={`text-md font-medium mb-4 ${editingCategory ? 'bg-blue-100 p-2 rounded text-blue-800' : ''}`}>
            {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
          </h4>
          <RecurringCategoryForm
            onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
            initialValues={editingCategory || undefined}
            onCancel={resetForms}
            isEditing={!!editingCategory}
          />
        </div>
      )}
      
      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No categories found.</p>
          <p className="mt-2">Add your first category to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map(category => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      category.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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