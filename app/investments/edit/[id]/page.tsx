'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@/components/ui/icons';
import Link from 'next/link';
import { getStockPriceOnly } from '@/lib/stock-api';

interface InvestmentFormData {
  id?: number;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
}

interface EditInvestmentPageProps {
  params: any; // Use any type to bypass TypeScript errors with React.use()
}

export default function EditInvestmentPage({ params }: EditInvestmentPageProps) {
  // Using React.use() as required by Next.js, with a type assertion
  const resolvedParams: { id: string } = React.use(params as any);
  const id = resolvedParams.id;
  
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [formData, setFormData] = useState<InvestmentFormData>({
    symbol: '',
    name: '',
    shares: 0,
    avgPrice: 0,
    currentPrice: 0
  });

  // Fetch investment data
  useEffect(() => {
    async function fetchInvestment() {
      try {
        setInitialLoading(true);
        const response = await fetch(`/api/investments?id=${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: 'Error',
              description: 'Investment not found',
              variant: 'error'
            });
            router.push('/investments');
            return;
          }
          throw new Error('Failed to fetch investment');
        }
        
        const investment = await response.json();
        setFormData({
          id: investment.id,
          symbol: investment.symbol,
          name: investment.name,
          shares: investment.shares,
          avgPrice: investment.avgPrice,
          currentPrice: investment.currentPrice || investment.avgPrice
        });
      } catch (error) {
        console.error('Error fetching investment:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch investment data',
          variant: 'error'
        });
        router.push('/investments');
      } finally {
        setInitialLoading(false);
      }
    }
    
    fetchInvestment();
  }, [id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (['shares', 'avgPrice', 'currentPrice'].includes(name) && value && !isNaN(parseFloat(value))) {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const fetchStockInfo = async () => {
    if (!formData.symbol) {
      toast({
        title: 'Error',
        description: 'Please enter a stock symbol first',
        variant: 'error'
      });
      return;
    }
    
    try {
      setFetchingPrice(true);
      
      // Attempt to fetch the current price
      const price = await getStockPriceOnly(formData.symbol);
      
      if (price === null) {
        toast({
          title: 'Warning',
          description: 'Could not fetch current price. The API may be rate limited or the symbol may be invalid.',
          variant: 'warning'
        });
        return;
      }
      
      // Update the form data with the fetched price
      setFormData(prev => ({
        ...prev,
        currentPrice: price
      }));
      
      toast({
        title: 'Success',
        description: `Current price for ${formData.symbol} fetched successfully`,
        variant: 'success'
      });
      
    } catch (error) {
      console.error('Error fetching stock price:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch current price. Please try again.',
        variant: 'error'
      });
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.symbol || !formData.name || formData.shares <= 0 || formData.avgPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields and ensure shares and average price are greater than 0',
        variant: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/investments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update investment');
      }
      
      toast({
        title: 'Success',
        description: 'Investment updated successfully',
        variant: 'success'
      });
      
      // Redirect back to investments list
      router.push('/investments');
    } catch (error) {
      console.error('Error updating investment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update investment',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-8 text-center">
        Loading investment data...
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <div className="flex items-center mb-6">
        <Link href="/investments" className="mr-4 p-2 rounded-full hover:bg-gray-100">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Investment</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="symbol" className="text-sm font-medium text-gray-700 block">
                Symbol <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  placeholder="AAPL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={fetchStockInfo}
                  disabled={fetchingPrice || !formData.symbol}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {fetchingPrice ? 'Fetching...' : 'Fetch Price'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Stock ticker symbol (e.g., AAPL for Apple)
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700 block">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Apple Inc."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="shares" className="text-sm font-medium text-gray-700 block">
                Shares <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="shares"
                name="shares"
                value={formData.shares || ''}
                onChange={handleInputChange}
                placeholder="10"
                step="0.01"
                min="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="avgPrice" className="text-sm font-medium text-gray-700 block">
                Average Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="avgPrice"
                name="avgPrice"
                value={formData.avgPrice || ''}
                onChange={handleInputChange}
                placeholder="150.00"
                step="0.01"
                min="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="currentPrice" className="text-sm font-medium text-gray-700 block">
                Current Price
              </label>
              <input
                type="number"
                id="currentPrice"
                name="currentPrice"
                value={formData.currentPrice || ''}
                onChange={handleInputChange}
                placeholder="Current market price"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500">
                Click "Fetch Price" to get current market price
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href="/investments"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Investment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 