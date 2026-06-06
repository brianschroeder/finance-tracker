'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, PagePanel, PageShell } from '@/components/PageShell';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getStockPriceOnly } from '@/lib/stock-api';
import { TrendingUp } from 'lucide-react';

interface InvestmentFormData {
  symbol: string;
  name: string;
  shares: number | string;
  avgPrice: number | string;
  currentPrice?: number | string;
}

export default function NewInvestmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [formData, setFormData] = useState<InvestmentFormData>({
    symbol: '',
    name: '',
    shares: 0,
    avgPrice: 0,
    currentPrice: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // For numeric fields, allow the raw value (including partial decimals like "0.")
    // The number validation will happen on submit
    if (['shares', 'avgPrice', 'currentPrice'].includes(name)) {
      // Allow empty string or valid number-like input (including partial decimals)
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : value
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
        currentPrice: price,
        // If no average price is set yet, use the current price as default
        avgPrice: prev.avgPrice === 0 ? price : prev.avgPrice
      }));
      
      toast({
        title: 'Success',
        description: `Current price for ${formData.symbol} fetched successfully`,
        variant: 'success'
      });
      
      // For a better UX, we could also fetch the company name here
      // This would require an additional API call
      
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
    
    // Convert string values to numbers
    const shares = typeof formData.shares === 'string' ? parseFloat(formData.shares) : formData.shares;
    const avgPrice = typeof formData.avgPrice === 'string' ? parseFloat(formData.avgPrice) : formData.avgPrice;
    const currentPrice = typeof formData.currentPrice === 'string' ? parseFloat(formData.currentPrice) : formData.currentPrice;
    
    // Validate form
    if (!formData.symbol || !formData.name || isNaN(shares) || shares <= 0 || isNaN(avgPrice) || avgPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields and ensure shares and average price are greater than 0',
        variant: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Create submission data with properly typed numbers
      const submissionData = {
        ...formData,
        shares,
        avgPrice,
        currentPrice: currentPrice || 0
      };
      
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add investment');
      }
      
      toast({
        title: 'Success',
        description: 'Investment added successfully',
        variant: 'success'
      });
      
      // Redirect back to investments list
      router.push('/investments');
    } catch (error) {
      console.error('Error adding investment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add investment',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        eyebrow="Investments"
        title="Add Investment"
        description="Create a holding, then manage lots and purchases from the portfolio page."
        icon={<TrendingUp className="h-5 w-5" />}
        actions={(
          <Link
            href="/investments"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Investments
          </Link>
        )}
      />

      <PagePanel>
        <div className="p-5 sm:p-6">
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-800">
            <strong>Tip:</strong> After creating this investment, you can track multiple purchases at different prices using the "View Transactions" button.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="symbol" className="text-sm font-medium text-slate-700 block">
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={fetchStockInfo}
                  disabled={fetchingPrice || !formData.symbol}
                  className="px-3 py-2 bg-slate-950 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors disabled:bg-slate-300"
                >
                  {fetchingPrice ? 'Fetching...' : 'Fetch Price'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Stock or crypto ticker (e.g., AAPL, BTC-USD, ETH-USD)
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700 block">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Apple Inc. or Bitcoin"
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="shares" className="text-sm font-medium text-slate-700 block">
                Quantity (Shares/Coins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="shares"
                name="shares"
                value={formData.shares || ''}
                onChange={handleInputChange}
                placeholder="10 (e.g., 0.5 for crypto)"
                step="any"
                min="0.00000001"
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                required
              />
              <p className="text-xs text-slate-500">
                Enter fractional amounts for crypto (e.g., 0.5 BTC)
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="avgPrice" className="text-sm font-medium text-slate-700 block">
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
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="currentPrice" className="text-sm font-medium text-slate-700 block">
                Current Price
              </label>
              <input
                type="number"
                id="currentPrice"
                name="currentPrice"
                value={formData.currentPrice || ''}
                onChange={handleInputChange}
                placeholder="Same as average price if left empty"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500">
                Click "Fetch Price" to get current market price
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href="/investments"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Investment'}
            </Button>
          </div>
        </form>
        </div>
      </PagePanel>
    </PageShell>
  );
} 
