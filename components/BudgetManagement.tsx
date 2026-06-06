'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit2, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '@/components/FinanceUI';

interface BudgetCategory {
  id?: number;
  name: string;
  allocatedAmount: number;
  color: string;
  isActive: boolean;
  isBudgetCategory?: boolean;
}

const blankCategory: BudgetCategory = {
  name: '',
  allocatedAmount: 0,
  color: '#0f172a',
  isActive: true,
  isBudgetCategory: true,
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function money(value: number) {
  return currency.format(value || 0);
}

export default function BudgetManagement() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BudgetCategory>(blankCategory);
  const [editingId, setEditingId] = useState<number | null>(null);

  const totalAllocated = useMemo(() => {
    return categories.reduce((sum, category) => sum + (category.allocatedAmount || 0), 0);
  }, [categories]);

  async function fetchCategories() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/budget-categories');
      if (!response.ok) throw new Error('Failed to fetch budget categories');
      const data = await response.json();
      setCategories((data.categories || []).filter((category: BudgetCategory) => category.isBudgetCategory !== false));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load budget categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function resetForm() {
    setFormData(blankCategory);
    setEditingId(null);
  }

  function editCategory(category: BudgetCategory) {
    setFormData({ ...category });
    setEditingId(category.id || null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        allocatedAmount: Number(formData.allocatedAmount) || 0,
        isActive: true,
        isBudgetCategory: true,
      };

      const response = await fetch('/api/budget-categories', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save category');
      }

      toast({
        title: editingId ? 'Category Updated' : 'Category Added',
        description: `${payload.name} has been saved.`,
      });
      resetForm();
      await fetchCategories();
    } catch (saveError) {
      toast({
        title: 'Error',
        description: saveError instanceof Error ? saveError.message : 'Failed to save category',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteCategory(id?: number) {
    if (!id || !window.confirm('Delete this budget category?')) return;

    try {
      const response = await fetch(`/api/budget-categories?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      toast({ title: 'Category Deleted', description: 'The category has been removed.' });
      await fetchCategories();
      if (editingId === id) resetForm();
    } catch (deleteError) {
      toast({
        title: 'Error',
        description: deleteError instanceof Error ? deleteError.message : 'Failed to delete category',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading categories
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Category Plan</p>
            <p className="text-sm text-slate-500">Monthly total {money(totalAllocated)}. Current pay-period budget uses half of this amount.</p>
          </div>
          <p className="text-2xl font-semibold text-slate-950">{money(totalAllocated / 2)}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No categories yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {categories.map((category) => {
              const share = totalAllocated > 0 ? (category.allocatedAmount / totalAllocated) * 100 : 0;
              return (
                <div key={category.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                      <p className="truncate text-sm font-medium text-slate-950">{category.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{share.toFixed(1)}% of monthly budget</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-semibold text-slate-950">{money(category.allocatedAmount)}</p>
                    <p className="text-xs text-slate-500">{money(category.allocatedAmount / 2)} per pay period</p>
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    <button
                      onClick={() => editCategory(category)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Edit category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">{editingId ? 'Edit Category' : 'Add Category'}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className={labelClass}>Name</label>
            <input
              id="name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="allocatedAmount" className={labelClass}>Monthly Amount</label>
            <input
              id="allocatedAmount"
              type="number"
              min="0"
              step="0.01"
              value={formData.allocatedAmount}
              onChange={(event) => setFormData((current) => ({ ...current, allocatedAmount: parseFloat(event.target.value) || 0 }))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="color" className={labelClass}>Color</label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={formData.color}
                onChange={(event) => setFormData((current) => ({ ...current, color: event.target.value }))}
                className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
              />
              <input
                value={formData.color}
                onChange={(event) => setFormData((current) => ({ ...current, color: event.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={isSubmitting || !formData.name.trim()} className={primaryButtonClass}>
            {isSubmitting ? 'Saving...' : editingId ? 'Save' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
