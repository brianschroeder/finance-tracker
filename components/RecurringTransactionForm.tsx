'use client';

import { useState, useEffect } from 'react';
import { RecurringTransaction, RecurringCategory } from '@/lib/db';

interface RecurringTransactionFormProps {
  onSubmit: (transaction: Omit<RecurringTransaction, 'id' | 'createdAt'>) => Promise<void>;
  initialValues?: RecurringTransaction;
  onCancel?: () => void;
  isEditing?: boolean;
}

interface FormData {
  name: string;
  amount: string; // Use string for form input, convert to number on submission
  dueDate: number;
  isEssential: boolean;
  categoryId: number | null;
}

export default function RecurringTransactionForm({
  onSubmit,
  initialValues,
  onCancel,
  isEditing = false
}: RecurringTransactionFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: initialValues?.name || '',
    amount: initialValues?.amount?.toString() || '0',
    dueDate: initialValues?.dueDate || 1,
    isEssential: initialValues?.isEssential || false,
    categoryId: initialValues?.categoryId || null
  });
  
  const [categories, setCategories] = useState<RecurringCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/recurring-categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'amount') {
      // Only allow numbers and decimal points for amount
      if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'dueDate') {
      // Ensure due date is between 1-31
      const dueDate = parseInt(value, 10);
      if (!isNaN(dueDate) && dueDate >= 1 && dueDate <= 31) {
        setFormData(prev => ({ ...prev, [name]: dueDate }));
      }
    } else if (name === 'categoryId') {
      // Handle category selection
      const categoryId = value === '' ? null : parseInt(value, 10);
      setFormData(prev => ({ ...prev, categoryId }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      // Convert form data to RecurringTransaction format
      const transaction: Omit<RecurringTransaction, 'id' | 'createdAt'> = {
        name: formData.name,
        amount: parseFloat(formData.amount) || 0,
        dueDate: formData.dueDate,
        isEssential: formData.isEssential,
        categoryId: formData.categoryId
      };
      
      await onSubmit(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Format for displaying category color dots
  const CategoryColorDot = ({ color }: { color: string }) => (
    <span 
      className="inline-block w-3 h-3 rounded-full mr-2" 
      style={{ backgroundColor: color }}
    />
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Transaction Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Rent, Subscription, etc."
          required
        />
      </div>
      
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="text"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
            required
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={formData.categoryId || ''}
          onChange={handleChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
        >
          <option value="">No Category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="mt-2 flex justify-between items-center">
          <div className="flex flex-wrap gap-2 max-w-[80%]">
            {categories.map(category => (
              <span 
                key={category.id}
                className="inline-flex items-center text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <CategoryColorDot color={category.color} />
                {category.name}
              </span>
            ))}
          </div>
          <a 
            href="/recurring-categories" 
            target="_blank" 
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Manage Categories
          </a>
        </div>
      </div>
      
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
          Due Date (Day of Month)
        </label>
        <select
          id="dueDate"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          required
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center">
        <input
          id="isEssential"
          name="isEssential"
          type="checkbox"
          checked={formData.isEssential}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isEssential" className="ml-2 block text-sm text-gray-700">
          Essential Expense
        </label>
      </div>
      
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          {submitting ? 'Saving...' : isEditing ? 'Update' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
} 