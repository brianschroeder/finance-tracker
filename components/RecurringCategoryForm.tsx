'use client';

import { useState } from 'react';
import { RecurringCategory } from '@/lib/db';

interface RecurringCategoryFormProps {
  onSubmit: (category: Omit<RecurringCategory, 'id' | 'createdAt'>) => Promise<void>;
  initialValues?: RecurringCategory;
  onCancel?: () => void;
  isEditing?: boolean;
}

interface FormData {
  name: string;
  color: string;
  isActive: boolean;
}

const PREDEFINED_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6B7280', // Gray
];

export default function RecurringCategoryForm({
  onSubmit,
  initialValues,
  onCancel,
  isEditing = false
}: RecurringCategoryFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: initialValues?.name || '',
    color: initialValues?.color || PREDEFINED_COLORS[0],
    isActive: initialValues?.isActive ?? true
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = e.target.checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      // Validate
      if (!formData.name.trim()) {
        throw new Error('Category name is required');
      }
      
      // Convert form data to RecurringCategory format
      const category: Omit<RecurringCategory, 'id' | 'createdAt'> = {
        name: formData.name.trim(),
        color: formData.color,
        isActive: formData.isActive
      };
      
      await onSubmit(category);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Housing, Utilities, Entertainment, etc."
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category Color
        </label>
        <div className="grid grid-cols-5 gap-3">
          {PREDEFINED_COLORS.map(color => (
            <button
              key={color}
              type="button"
              className={`h-10 rounded-md border-2 ${formData.color === color ? 'border-gray-800' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
            />
          ))}
        </div>
        <div className="mt-3">
          <label htmlFor="custom-color" className="block text-sm text-gray-500">
            Custom Color
          </label>
          <div className="flex items-center mt-1">
            <input
              type="color"
              id="custom-color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="h-10 w-12 border-0 p-0"
            />
            <input
              type="text"
              value={formData.color}
              onChange={handleChange}
              name="color"
              className="ml-2 block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
          Active Category
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
          {submitting ? 'Saving...' : isEditing ? 'Update' : 'Add Category'}
        </button>
      </div>
    </form>
  );
} 