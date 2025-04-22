'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon, ArrowUpIcon, PresentationChartLineIcon, HomeIcon, GlobeAltIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { FaDollarSign, FaChartLine, FaPercentage, FaUniversity, FaPiggyBank, FaHome, FaPlane } from 'react-icons/fa';

interface AssetInputs {
  cash: string;
  interest: string;
  checking: string;
  retirement401k: string;
  houseFund: string;
  vacationFund: string;
  emergencyFund: string;
}

export default function AssetForm() {
  const [assets, setAssets] = useState<AssetInputs>({
    cash: '',
    interest: '',
    checking: '',
    retirement401k: '',
    houseFund: '',
    vacationFund: '',
    emergencyFund: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [totalStocksValue, setTotalStocksValue] = useState(0);
  const [loadingInvestments, setLoadingInvestments] = useState(true);

  // Utility function to format a number with commas
  const formatWithCommas = (value: string | number): string => {
    // Convert to string and handle null/undefined
    const strValue = typeof value === 'number' ? value.toString() : (value || '');
    if (!strValue) return '';
    
    // Remove any existing commas for consistent formatting
    const cleanValue = strValue.replace(/,/g, '');
    
    // If there's a decimal point, format only the part before it and limit decimals to 2
    if (cleanValue.includes('.')) {
      const [integerPart, decimalPart] = cleanValue.split('.');
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      // Limit decimal places to a maximum of 2
      const limitedDecimal = decimalPart.slice(0, 2);
      return `${formattedInteger}.${limitedDecimal}`;
    } else {
      // Format the whole number with commas
      return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  };

  // Fetch latest assets on component mount
  useEffect(() => {
    async function fetchLatestAssets() {
      try {
        const response = await fetch('/api/assets');
        
        if (!response.ok) {
          throw new Error('Failed to fetch latest assets');
        }
        
        const data = await response.json();
        
        // Check if there's an error in the response
        if (data.error) {
          console.error('API error:', data.error, data.details || '');
          throw new Error(data.error);
        }
        
        // Set assets even with empty defaults (when id is null)
        setAssets({
          cash: formatWithCommas(data.cash) || '',
          interest: formatWithCommas(data.interest) || '',
          checking: formatWithCommas(data.checking) || '',
          retirement401k: formatWithCommas(data.retirement401k) || '',
          houseFund: formatWithCommas(data.houseFund) || '',
          vacationFund: formatWithCommas(data.vacationFund) || '',
          emergencyFund: formatWithCommas(data.emergencyFund) || ''
        });
      } catch (err) {
        console.error('Error fetching assets:', err);
        // We don't need to show an error for initial fetch
      } finally {
        setLoading(false);
      }
    }
    
    fetchLatestAssets();
  }, []);

  // Fetch investments data to get stocks total
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
        
        // Calculate total stocks value
        let totalValue = 0;
        for (const investment of investments) {
          const currentPrice = investment.currentPrice || investment.avgPrice;
          totalValue += investment.shares * currentPrice;
        }
        
        // Round to 2 decimal places to avoid long floating point values
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
    
    // Remove all non-numeric characters except decimal points and commas
    const cleanValue = value.replace(/[^\d.,]/g, '');
    
    // Replace commas with empty strings for validation
    const numericValue = cleanValue.replace(/,/g, '');
    
    // Only allow one decimal point
    if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
      // Use the utility function to format the value
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
      // Create a new object with comma-free values for submission
      const cleanedAssets = Object.entries(assets).reduce((acc, [key, value]) => {
        // Remove commas for submission
        acc[key as keyof AssetInputs] = value.replace(/,/g, '');
        return acc;
      }, {} as AssetInputs);
      
      // Create payload without legacy field names
      const payload = {
        ...cleanedAssets,
        stocks: "0" // Set stocks to 0 since we're not using the field anymore
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
      
      // Show success message
      setSubmitted(true);
      
      // Reset success message after 3 seconds
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
    
    // Format as currency
    const numericValue = typeof value === 'string' ? value.replace(/,/g, '') : value.toString();
    const numValue = parseFloat(numericValue);
    if (isNaN(numValue)) return '';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const calculateTotal = (): number => {
    return Object.values(assets).reduce((total, value) => {
      // Remove commas before parsing as number
      const cleanValue = value.replace(/,/g, '');
      const numValue = parseFloat(cleanValue || '0');
      return total + (isNaN(numValue) ? 0 : numValue);
    }, 0);
  };

  // Calculate net worth (cash + interest + 401k + stocks)
  const calculateNetWorth = (): number => {
    const values = [
      assets.cash, 
      assets.interest,
      assets.retirement401k
    ];
    
    const assetsTotal = values.reduce((total, value) => {
      // Remove commas before parsing as number
      const cleanValue = (value || '').replace(/,/g, '');
      const numValue = parseFloat(cleanValue || '0');
      return total + (isNaN(numValue) ? 0 : numValue);
    }, 0);
    
    // Add stocks value to the net worth calculation
    return assetsTotal + totalStocksValue;
  };

  const categories = [
    { id: 'all', name: 'All Assets', icon: <PresentationChartLineIcon className="h-5 w-5" /> },
    { id: 'investments', name: 'Investments', icon: <ArrowUpIcon className="h-5 w-5" /> },
    { id: 'retirement', name: 'Retirement', icon: <BanknotesIcon className="h-5 w-5" /> },
    { id: 'funds', name: 'Funds', icon: <GlobeAltIcon className="h-5 w-5" /> }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const showField = (field: string) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'investments' && (field === 'cash' || field === 'interest' || field === 'stocks')) return true;
    if (activeCategory === 'retirement' && field.includes('retirement')) return true;
    if (activeCategory === 'funds' && (field.includes('Fund') || field === 'checking' || field === 'emergencyFund')) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {submitted && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-sm mb-6 transition-opacity duration-500" role="alert">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <span className="font-medium">Success!</span> Your asset values have been saved.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm mb-6" role="alert">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <span className="font-medium">Error!</span> {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Your Assets</h2>
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Net Worth:</span>
                <span className="font-bold text-blue-600">{formatCurrency(calculateNetWorth())}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1">Investments + Stocks + 401k</span>
            </div>
          </div>
        </div>
        
        <div className="border-b border-gray-100">
          <div className="px-6 py-4 flex overflow-x-auto hide-scrollbar">
            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Stocks - Auto populated and read-only */}
            {showField('stocks') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-green-600">
                  <div className="flex items-center mb-2">
                    <FaChartLine className="mr-2" />
                    <span>Stocks</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  {loadingInvestments ? (
                    <div className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
                  ) : (
                    <input
                      type="text"
                      id="stocks"
                      name="stocks"
                      value={formatWithCommas(totalStocksValue)}
                      readOnly
                      className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg bg-gray-50 font-medium text-gray-700 cursor-not-allowed"
                    />
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                  <span>Auto-populated from your investments</span>
                  <a href="/investments" className="text-blue-600 hover:underline">View Investments →</a>
                </div>
              </div>
            )}
            
            {/* Cash */}
            {showField('cash') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-blue-600">
                  <div className="flex items-center mb-2">
                    <FaDollarSign className="mr-2" />
                    <span>Cash</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="cash"
                    name="cash"
                    value={assets.cash}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white bg-opacity-70 font-medium focus:bg-blue-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            
            {/* Interest */}
            {showField('interest') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-purple-600">
                  <div className="flex items-center mb-2">
                    <FaPercentage className="mr-2" />
                    <span>Interest</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="interest"
                    name="interest"
                    value={assets.interest}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white bg-opacity-70 font-medium focus:bg-purple-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            
            {/* Checking */}
            {showField('checking') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-green-600">
                  <div className="flex items-center mb-2">
                    <FaUniversity className="mr-2" />
                    <span>Checking</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="checking"
                    name="checking"
                    value={assets.checking}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white bg-opacity-70 font-medium focus:bg-green-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            
            {/* 401k */}
            {showField('retirement401k') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-blue-600">
                  <div className="flex items-center mb-2">
                    <FaPiggyBank className="mr-2" />
                    <span>401k</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="retirement401k"
                    name="retirement401k"
                    value={assets.retirement401k}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white bg-opacity-70 font-medium focus:bg-blue-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            
            {/* House Fund */}
            {showField('houseFund') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-blue-600">
                  <div className="flex items-center mb-2">
                    <FaHome className="mr-2" />
                    <span>House Fund</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="houseFund"
                    name="houseFund"
                    value={assets.houseFund}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white bg-opacity-70 font-medium focus:bg-blue-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            
            {/* Vacation Fund */}
            {showField('vacationFund') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-blue-600">
                  <div className="flex items-center mb-2">
                    <FaPlane className="mr-2" />
                    <span>Vacation Fund</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="vacationFund"
                    name="vacationFund"
                    value={assets.vacationFund}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white bg-opacity-70 font-medium focus:bg-blue-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            
            {/* Emergency Fund */}
            {showField('emergencyFund') && (
              <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <label className="block text-sm font-medium mb-1 text-blue-600">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Emergency Fund</span>
                  </div>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="emergencyFund"
                    name="emergencyFund"
                    value={assets.emergencyFund}
                    onChange={handleChange}
                    className="block w-full pl-7 pr-12 py-3.5 text-base border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white bg-opacity-70 font-medium focus:bg-blue-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 mr-4 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
                submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                  Update Assets
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 