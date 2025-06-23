'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, TrashIcon, PencilIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { FaChartLine, FaHome, FaPlane, FaUniversity, FaCar, FaGraduationCap, FaHeart, FaShoppingCart } from 'react-icons/fa';

interface FundAccount {
  id?: number;
  name: string;
  amount: number;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  isInvesting?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AssetData {
  cash: number;
  interest: number;
}

const iconOptions = [
  { value: 'FaChartLine', label: 'Stock Market', icon: FaChartLine },
  { value: 'FaHome', label: 'House', icon: FaHome },
  { value: 'FaPlane', label: 'Travel', icon: FaPlane },
  { value: 'FaUniversity', label: 'Education', icon: FaUniversity },
  { value: 'FaCar', label: 'Car', icon: FaCar },
  { value: 'FaGraduationCap', label: 'Education', icon: FaGraduationCap },
  { value: 'FaHeart', label: 'Emergency', icon: FaHeart },
  { value: 'FaShoppingCart', label: 'Shopping', icon: FaShoppingCart },
];

const colorOptions = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function FundAccountsManagement() {
  const [fundAccounts, setFundAccounts] = useState<FundAccount[]>([]);
  const [totalFundAmount, setTotalFundAmount] = useState(0);
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    description: '',
    color: '#3B82F6',
    icon: 'FaChartLine',
    isInvesting: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch fund accounts and assets in parallel
      const [fundResponse, assetResponse] = await Promise.all([
        fetch('/api/fund-accounts'),
        fetch('/api/assets')
      ]);
      
      if (!fundResponse.ok) {
        throw new Error('Failed to fetch fund accounts');
      }
      
      if (!assetResponse.ok) {
        throw new Error('Failed to fetch assets');
      }
      
      const fundData = await fundResponse.json();
      const assetData = await assetResponse.json();
      

      setFundAccounts(fundData.fundAccounts || []);
      setTotalFundAmount(fundData.totalAmount || 0);
      setAssetData({
        cash: assetData.cash || 0,
        interest: assetData.interest || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
             toast({
         title: 'Error',
         description: 'Failed to load fund accounts data'
       });
    } finally {
      setLoading(false);
    }
  };

  const calculateAvailableCash = () => {
    if (!assetData) return 0;
    return assetData.cash - totalFundAmount;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      description: '',
      color: '#3B82F6',
      icon: 'FaChartLine',
      isInvesting: false
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
             toast({
         title: 'Error',
         description: 'Fund name is required'
       });
      return;
    }
    
    const amount = parseFloat(formData.amount) || 0;
    if (amount < 0) {
             toast({
         title: 'Error',
         description: 'Amount must be a positive number'
       });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const payload = {
        name: formData.name.trim(),
        amount,
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon,
        isInvesting: formData.isInvesting
      };
      
      let response;
      if (editingId) {
        // Update existing fund account
        response = await fetch('/api/fund-accounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingId })
        });
      } else {
        // Create new fund account
        response = await fetch('/api/fund-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save fund account');
      }
      
      toast({
        title: 'Success',
        description: editingId ? 'Fund account updated successfully' : 'Fund account created successfully'
      });
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving fund account:', error);
             toast({
         title: 'Error',
         description: error instanceof Error ? error.message : 'Failed to save fund account'
       });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (fundAccount: FundAccount) => {
    console.log('Loading fund account for edit:', fundAccount); // Debug log
    setFormData({
      name: fundAccount.name,
      amount: fundAccount.amount.toString(),
      description: fundAccount.description || '',
      color: fundAccount.color || '#3B82F6',
      icon: fundAccount.icon || 'FaChartLine',
      isInvesting: Boolean(fundAccount.isInvesting) // Ensure proper boolean conversion
    });
    setEditingId(fundAccount.id!);
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fund account?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/fund-accounts?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete fund account');
      }
      
      toast({
        title: 'Success',
        description: 'Fund account deleted successfully'
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting fund account:', error);
             toast({
         title: 'Error',
         description: error instanceof Error ? error.message : 'Failed to delete fund account'
       });
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(option => option.value === iconName);
    return iconOption ? iconOption.icon : FaChartLine;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>
        <div className="animate-pulse h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  // Debug log
  console.log('Current formData:', formData);

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Fund Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <BanknotesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Cash Available</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(assetData ? assetData.cash : 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <FaChartLine className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Allocated</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(totalFundAmount)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Remaining</p>
                <p className={`text-xl font-bold ${calculateAvailableCash() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calculateAvailableCash())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? 'Edit Fund Account' : 'Add New Fund Account'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fund Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Emergency Fund"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {iconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isInvesting"
                checked={formData.isInvesting}
                onChange={(e) => {
                  console.log('Checkbox changed:', e.target.checked);
                  setFormData({ ...formData, isInvesting: e.target.checked });
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="isInvesting" className="text-sm font-medium text-gray-700 cursor-pointer">
                This is an investing fund (will be shown as available investing funds)
                {formData.isInvesting && <span className="ml-2 text-green-600 font-bold">✓ CHECKED</span>}
              </label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update Fund' : 'Add Fund'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Fund Accounts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Fund Accounts</h3>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Fund
            </Button>
          )}
        </div>
        
        {fundAccounts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FaChartLine className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No fund accounts yet</p>
            <p className="text-sm text-gray-500">Add your first fund account to start tracking your savings goals</p>
          </div>
        ) : (
          <div className="space-y-3">
                        {fundAccounts.map((fund) => {
              const IconComponent = getIconComponent(fund.icon || 'FaChartLine');
              return (
                <div
                  key={fund.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-full text-white"
                      style={{ backgroundColor: fund.color || '#3B82F6' }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-800">{fund.name}</h4>
                        {fund.isInvesting ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                            Investing
                          </span>
                        ): null}
                      </div>
                      {fund.description && (
                        <p className="text-sm text-gray-600">{fund.description}</p>
                      )}
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(fund.amount)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(fund)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(fund.id!)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 