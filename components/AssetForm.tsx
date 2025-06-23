'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon, ArrowUpIcon, PresentationChartLineIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { FaDollarSign, FaPercentage, FaUniversity } from 'react-icons/fa';
import Link from 'next/link';

interface AssetInputs {
  cash: string;
  interest: string;
  checking: string;
  retirement401k: string;
}

export default function AssetForm() {
  const [assets, setAssets] = useState<AssetInputs>({
    cash: '',
    interest: '',
    checking: '',
    retirement401k: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalStocksValue, setTotalStocksValue] = useState(0);
  const [loadingInvestments, setLoadingInvestments] = useState(true);

  const formatWithCommas = (value: string | number): string => {
    const strValue = typeof value === 'number' ? value.toString() : (value || '');
    if (!strValue) return '';
    
    const cleanValue = strValue.replace(/,/g, '');
    
    if (cleanValue.includes('.')) {
      const [integerPart, decimalPart] = cleanValue.split('.');
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const limitedDecimal = decimalPart.slice(0, 2);
      return `${formattedInteger}.${limitedDecimal}`;
    } else {
      return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  };

  useEffect(() => {
    async function fetchLatestAssets() {
      try {
        const response = await fetch('/api/assets');
        
        if (!response.ok) {
          throw new Error('Failed to fetch latest assets');
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('API error:', data.error, data.details || '');
          throw new Error(data.error);
        }
        
        setAssets({
          cash: formatWithCommas(data.cash) || '',
          interest: formatWithCommas(data.interest) || '',
          checking: formatWithCommas(data.checking) || '',
          retirement401k: formatWithCommas(data.retirement401k) || ''
        });
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLatestAssets();
  }, []);

  useEffect(() => {
    async function fetchInvestmentsData() {
      try {
        setLoadingInvestments(true);
        const response = await fetch('/api/investments');
        
        if (!response.ok) {
          throw new Error('Failed to fetch investments data');
        }
        
        const data = await response.json();
        const investments = data.investments || [];
        
        let totalValue = 0;
        for (const investment of investments) {
          const currentPrice = investment.currentPrice || investment.avgPrice;
          totalValue += investment.shares * currentPrice;
        }
        
        totalValue = Math.round(totalValue * 100) / 100;
        setTotalStocksValue(totalValue);
      } catch (err) {
        console.error('Error fetching investments:', err);
      } finally {
        setLoadingInvestments(false);
      }
    }
    
    fetchInvestmentsData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    const cleanValue = value.replace(/[^\d.,]/g, '');
    const numericValue = cleanValue.replace(/,/g, '');
    
    if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
      const formattedValue = formatWithCommas(cleanValue);
      
      setAssets(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    setError('');
    
    try {
      const cleanedAssets = Object.entries(assets).reduce((acc, [key, value]) => {
        acc[key as keyof AssetInputs] = value.replace(/,/g, '');
        return acc;
      }, {} as AssetInputs);
      
      // Keep the existing fund values to avoid losing them
      const currentResponse = await fetch('/api/assets');
      const currentData = await currentResponse.json();
      
      const payload = {
        ...cleanedAssets,
        stocks: "0",
        // Preserve existing fund values
        houseFund: currentData.houseFund || 0,
        vacationFund: currentData.vacationFund || 0,
        emergencyFund: currentData.emergencyFund || 0
      };
      
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save assets');
      }
      
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting asset data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    if (!value) return '';
    
    const numericValue = typeof value === 'string' ? value.replace(/,/g, '') : value.toString();
    const numValue = parseFloat(numericValue);
    if (isNaN(numValue)) return '';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const calculateTotal = (): number => {
    const values = Object.values(assets).map(value => parseFloat(value.replace(/,/g, '')) || 0);
    return values.reduce((sum, value) => sum + value, 0) + totalStocksValue;
  };

  const calculateNetWorth = (): number => {
    const assetTotal = calculateTotal();
    return assetTotal;
  };

  const assetFields = [
    {
      name: 'cash',
      label: 'Cash Savings',
      icon: <FaDollarSign className="w-5 h-5" />,
      color: 'bg-green-500',
      description: 'Liquid cash in savings accounts'
    },
    {
      name: 'interest',
      label: 'Interest/Bonds',
      icon: <FaPercentage className="w-5 h-5" />,
      color: 'bg-purple-500',
      description: 'High-yield savings, CDs, bonds'
    },
    {
      name: 'checking',
      label: 'Checking Account',
      icon: <BanknotesIcon className="w-5 h-5" />,
      color: 'bg-blue-500',
      description: 'Primary checking account balance'
    },
    {
      name: 'retirement401k',
      label: '401k/Retirement',
      icon: <FaUniversity className="w-5 h-5" />,
      color: 'bg-indigo-500',
      description: '401k, IRA, and other retirement accounts'
    }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner about Fund Accounts */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Fund Accounts Now Managed Separately
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Fund accounts (House Fund, Vacation Fund, Emergency Fund) are now managed in a separate section. 
                <Link href="/fund-accounts" className="font-medium underline hover:text-blue-900 ml-1">
                  Manage Fund Accounts →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <ArrowUpIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(calculateTotal())}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <PresentationChartLineIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Investment Portfolio</p>
              <p className="text-2xl font-bold text-gray-900">
                {loadingInvestments ? '...' : formatCurrency(totalStocksValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <ArrowPathIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Net Worth</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(calculateNetWorth())}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Update Asset Values</h2>
          <p className="text-gray-600">Enter your current asset amounts to track your financial progress</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {submitted && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">Assets updated successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assetFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label htmlFor={field.name} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <div className={`p-2 rounded-full text-white ${field.color}`}>
                    {field.icon}
                  </div>
                  <div>
                    <span>{field.label}</span>
                    <p className="text-xs text-gray-500 font-normal">{field.description}</p>
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="text"
                    id={field.name}
                    name={field.name}
                    value={assets[field.name as keyof AssetInputs]}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Update Assets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 