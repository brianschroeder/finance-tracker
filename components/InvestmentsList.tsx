'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { EditIcon, TrashIcon, RefreshIcon } from '@/components/ui/icons';
import Link from 'next/link';
import { getStockPriceOnly } from '@/lib/stock-api';
import StockPrice from '@/app/components/StockPrice';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register all required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface Investment {
  id?: number;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  lastUpdated?: string;
  createdAt?: string;
}

// Helper function to format the date in a relative format
function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Return different strings based on how much time has passed
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hr ago`;
  } else if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else {
    // For dates more than a month ago, show the actual date
    return date.toLocaleDateString();
  }
}

export default function InvestmentsList() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Investment>({
    symbol: '',
    name: '',
    shares: 0,
    avgPrice: 0,
    currentPrice: 0
  });

  // Fetch investments
  useEffect(() => {
    fetchInvestments().then(() => {
      // After fetching investments, refresh the prices
      // Adding a small delay so the UI can update first
      setTimeout(() => {
        refreshAllPrices();
      }, 500);
    });
  }, []);
  
  async function fetchInvestments() {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/investments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch investments');
      }
      
      const data = await response.json();
      setInvestments(data.investments || []);
    } catch (err) {
      console.error('Error fetching investments:', err);
      setError('Failed to load investments. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
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
  
  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      shares: 0,
      avgPrice: 0,
      currentPrice: 0
    });
    setEditingInvestment(null);
    setShowForm(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!formData.symbol || !formData.name || formData.shares <= 0 || formData.avgPrice <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields and ensure shares and average price are greater than 0',
          variant: 'error'
        });
        return;
      }
      
      const method = editingInvestment ? 'PUT' : 'POST';
      const url = '/api/investments';
      const payload = editingInvestment ? { ...formData, id: editingInvestment.id } : formData;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingInvestment ? 'update' : 'create'} investment`);
      }
      
      toast({
        title: 'Success',
        description: `Investment ${editingInvestment ? 'updated' : 'created'} successfully`,
        variant: 'success'
      });
      
      // Refresh investments list
      fetchInvestments();
      
      // Reset the form
      resetForm();
    } catch (err) {
      console.error('Error saving investment:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save investment',
        variant: 'error'
      });
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/investments?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete investment');
      }
      
      toast({
        title: 'Success',
        description: 'Investment deleted successfully',
        variant: 'success'
      });
      
      // Refresh investments list
      fetchInvestments();
    } catch (err) {
      console.error('Error deleting investment:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete investment',
        variant: 'error'
      });
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };
  
  const calculateTotalValue = (shares: number, price: number) => {
    return shares * price;
  };
  
  const calculateGainLoss = (shares: number, avgPrice: number, currentPrice: number) => {
    const costBasis = shares * avgPrice;
    const currentValue = shares * currentPrice;
    return currentValue - costBasis;
  };
  
  const calculateGainLossPercentage = (avgPrice: number, currentPrice: number) => {
    if (avgPrice <= 0) return 0;
    return ((currentPrice - avgPrice) / avgPrice) * 100;
  };
  
  const updateAllPrices = async () => {
    setRefreshingPrices(true);
    
    toast({
      title: 'Updating Prices',
      description: 'Fetching current stock prices. This may take a moment...',
      variant: 'info'
    });
    
    // Update each investment with current market price
    const updatedInvestments = [...investments];
    let successCount = 0;
    let failCount = 0;
    
    for (const investment of updatedInvestments) {
      if (!investment.id) continue;
      
      try {
        // Get the real price from the stock API using getStockPriceOnly
        const currentPrice = await getStockPriceOnly(investment.symbol);
        
        if (currentPrice === null) {
          failCount++;
          continue;
        }
        
        const response = await fetch('/api/investments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: investment.id,
            currentPrice: currentPrice,
            updatePriceOnly: true
          })
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error updating price for ${investment.symbol}:`, err);
        failCount++;
      }
    }
    
    if (successCount > 0) {
      toast({
        title: 'Success',
        description: `Updated prices for ${successCount} investments${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        variant: 'success'
      });
      
      // Refresh the list
      fetchInvestments();
    } else if (failCount > 0) {
      toast({
        title: 'Error',
        description: `Failed to update prices. Please try again later.`,
        variant: 'error'
      });
    }
    
    setRefreshingPrices(false);
  };
  
  // Update single investment price
  const updateSinglePrice = async (investment: Investment) => {
    try {
      const currentPrice = await getStockPriceOnly(investment.symbol);
      
      if (currentPrice === null) {
        toast({
          title: 'Error',
          description: `Could not fetch price for ${investment.symbol}. The API may be rate limited or the symbol may be invalid.`,
          variant: 'error'
        });
        return;
      }
      
      const response = await fetch('/api/investments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: investment.id,
          currentPrice: currentPrice,
          updatePriceOnly: true
        })
      });
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Updated price for ${investment.symbol} to ${formatCurrency(currentPrice)}`,
          variant: 'success'
        });
        
        // Refresh the list
        fetchInvestments();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update price. Please try again.',
          variant: 'error'
        });
      }
    } catch (error) {
      console.error(`Error updating price for ${investment.symbol}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to update price. Please try again.',
        variant: 'error'
      });
    }
  };
  
  // Generate data for portfolio visualization
  const generatePortfolioData = () => {
    if (!investments.length) return { 
      doughnut: { 
        labels: [], 
        datasets: [{ 
          data: [], 
          backgroundColor: [], 
          borderColor: [],
          borderWidth: 1,
          hoverOffset: 15
        }] 
      }
    };
    
    // Group investments for visualization
    const symbolData = investments.reduce((acc: Record<string, number>, investment) => {
      const currentPrice = investment.currentPrice || investment.avgPrice;
      const value = investment.shares * currentPrice;
      acc[investment.symbol] = (acc[investment.symbol] || 0) + value;
      return acc;
    }, {});
    
    // Sort by value (descending)
    const sortedData = Object.entries(symbolData)
      .sort(([, a], [, b]) => b - a);
    
    // If there are more than 7 investments, group the smallest ones as "Other"
    let chartData = sortedData;
    if (sortedData.length > 7) {
      const topInvestments = sortedData.slice(0, 6);
      const otherInvestments = sortedData.slice(6);
      const otherValue = otherInvestments.reduce((sum, [, value]) => sum + value, 0);
      chartData = [...topInvestments, ['Other', otherValue]];
    }
    
    // Generate colors
    const generateColor = (index: number) => {
      // Modern color palette
      const colors = [
        { bg: '#0ea5e9', border: '#0284c7' }, // sky blue
        { bg: '#8b5cf6', border: '#7c3aed' }, // violet
        { bg: '#10b981', border: '#059669' }, // emerald
        { bg: '#f59e0b', border: '#d97706' }, // amber
        { bg: '#ec4899', border: '#db2777' }, // pink
        { bg: '#6366f1', border: '#4f46e5' }, // indigo
        { bg: '#ef4444', border: '#dc2626' }, // red
      ];
      
      return colors[index % colors.length];
    };
    
    // Create data for doughnut chart
    const labels = chartData.map(([symbol]) => symbol);
    const values = chartData.map(([, value]) => value);
    const colors = chartData.map((_, index) => generateColor(index));
    
    return {
      doughnut: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map(c => c.bg),
          borderColor: colors.map(c => c.border),
          borderWidth: 1,
          hoverOffset: 15
        }]
      }
    };
  };

  const portfolioData = useMemo(() => generatePortfolioData(), [investments]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: false,
        position: 'right' as const,
        labels: {
          boxWidth: 10,
          padding: 15,
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#64748b'
        }
      },
      tooltip: {
        enabled: true,
        position: 'nearest' as const,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: {
          size: 13,
          family: 'Inter, system-ui, sans-serif'
        },
        bodyFont: {
          size: 12,
          family: 'Inter, system-ui, sans-serif'
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          title: () => [''],
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw;
            const percentage = (value / totalInvestmentValue * 100).toFixed(1);
            return [`${label}: ${formatCurrency(value)}`, `${percentage}% of portfolio`];
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 800,
      easing: 'easeOutQuart' as const
    },
    elements: {
      arc: {
        borderWidth: 1,
        hoverOffset: 5,
        hoverBorderWidth: 2
      }
    },
    layout: {
      padding: {
        top: 5,
        right: 5,
        bottom: 5, 
        left: 5
      }
    }
  };
  
  // Refresh all investment prices using the new API endpoint
  const refreshAllPrices = async () => {
    // Just use the updateAllPrices function since it works client-side
    updateAllPrices();
  };
  
  // Calculate today's total change
  const calculateTodaysChange = async () => {
    if (refreshingPrices) return;
    
    setRefreshingPrices(true);
    let totalDailyChange = 0;
    let totalDailyChangePercent = 0;
    
    try {
      // Fetch the latest prices for each investment
      for (const investment of investments) {
        try {
          const response = await fetch(`/api/stock-price?symbol=${encodeURIComponent(investment.symbol)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.change) {
              // Calculate the change amount for this holding
              const dailyChangeAmount = data.change * investment.shares;
              totalDailyChange += dailyChangeAmount;
              
              // If we have a percentage, we can use it to calculate a weighted percentage
              if (data.changePercent) {
                const investmentValue = investment.shares * (investment.currentPrice || investment.avgPrice);
                const weightedPercent = investmentValue / totalInvestmentValue * data.changePercent;
                totalDailyChangePercent += weightedPercent;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching price for ${investment.symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Error calculating today\'s change:', error);
    } finally {
      setRefreshingPrices(false);
    }
    
    return { amount: totalDailyChange, percent: totalDailyChangePercent };
  };
  
  // State to store today's change
  const [todaysChange, setTodaysChange] = useState<{ amount: number, percent: number } | null>(null);
  
  // Fetch today's change when investments change or prices are refreshed
  useEffect(() => {
    if (investments.length > 0) {
      calculateTodaysChange().then(result => {
        if (result) setTodaysChange(result);
      });
    }
  }, [investments]);
  
  // Find the most recent lastUpdated timestamp
  const getMostRecentUpdate = (): string | undefined => {
    if (!investments || investments.length === 0) return undefined;
    
    const sortedInvestments = [...investments].sort((a, b) => {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
    
    return sortedInvestments[0].lastUpdated;
  };
  
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 w-full max-w-3xl bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-lg shadow text-center">
        <svg className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium">Error Loading Investments</h3>
        <p className="mt-1">{error}</p>
      </div>
    );
  }
  
  const totalInvestmentValue = investments.reduce(
    (total, investment) => total + calculateTotalValue(investment.shares, investment.currentPrice || investment.avgPrice),
    0
  );
  
  const totalGainLoss = investments.reduce(
    (total, investment) => total + calculateGainLoss(
      investment.shares, 
      investment.avgPrice, 
      investment.currentPrice || investment.avgPrice
    ),
    0
  );
  
  const totalCostBasis = investments.reduce(
    (total, investment) => total + (investment.shares * investment.avgPrice),
    0
  );
  
  const totalGainLossPercentage = totalCostBasis > 0 
    ? (totalGainLoss / totalCostBasis) * 100 
    : 0;
  
  return (
    <div className="w-full bg-gray-50 rounded-xl overflow-hidden shadow-sm">
      {/* Dashboard Header */}
      <div className="p-6 bg-white border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Investment Portfolio</h2>
          <p className="text-sm text-gray-500">Track and manage your stock investments</p>
        </div>
        {!loading && getMostRecentUpdate() && (
          <span className="text-xs text-gray-500" title={getMostRecentUpdate() ? new Date(getMostRecentUpdate()!).toLocaleString() : ''}>
            Last updated: {formatRelativeTime(getMostRecentUpdate())}
          </span>
        )}
      </div>
      
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-500">Portfolio Value</p>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalInvestmentValue)}</p>
          <p className="text-sm text-gray-500">Cost Basis: {formatCurrency(totalCostBasis)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Gain/Loss</p>
          <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {formatCurrency(totalGainLoss)}
          </p>
          <p className={`text-sm ${totalGainLoss >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {formatPercentage(totalGainLossPercentage)}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-500">Today's Change</p>
          {todaysChange ? (
            <>
              <p className={`text-3xl font-bold ${todaysChange.amount >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {formatCurrency(todaysChange.amount)}
              </p>
              <p className={`text-sm ${todaysChange.amount >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {todaysChange.amount >= 0 ? '+' : ''}{todaysChange.percent.toFixed(2)}%
              </p>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-400">--</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-500">Holding Count</p>
          <p className="text-3xl font-bold text-gray-800">{investments.length}</p>
          <Link 
            href="/investments/new"
            className="text-sm text-blue-600 hover:underline"
          >
            Add new investment
          </Link>
        </div>
      </div>
      
      {/* Modern Allocation Visualization */}
      {investments.length > 0 ? (
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Portfolio Allocation</h3>
              <p className="text-sm text-gray-500 mt-1">Breakdown of your investment holdings</p>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col lg:flex-row justify-center">
                {/* Chart Area */}
                <div className="w-full lg:w-1/2 flex justify-center items-center">
                  <div className="relative w-64 h-64 md:w-80 md:h-80 p-2">
                    {portfolioData.doughnut && (
                      <Doughnut 
                        data={portfolioData.doughnut} 
                        options={doughnutOptions} 
                        className="chart-container"
                      />
                    )}
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-medium">TOTAL VALUE</div>
                      <div className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalInvestmentValue)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Legend and Holdings */}
                <div className="w-full lg:w-1/2 mt-8 lg:mt-0 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <h4 className="text-base font-semibold text-gray-700">Portfolio Summary</h4>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                      {investments.length} Holdings
                    </span>
                  </div>
                  
                  {/* Custom Legend with Hover Effect */}
                  <div className="mb-6 space-y-2">
                    {portfolioData.doughnut?.labels.map((label, index) => {
                      const value = portfolioData.doughnut?.datasets[0].data[index] || 0;
                      const percentage = (value / totalInvestmentValue * 100).toFixed(1);
                      const bgColor = portfolioData.doughnut?.datasets[0].backgroundColor[index];
                      
                      return (
                        <div 
                          key={label} 
                          className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-sm mr-3 flex-shrink-0" 
                              style={{ backgroundColor: bgColor }}
                            ></div>
                            <span className="text-sm font-medium text-gray-800">{label}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(value)}</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 py-3 px-6 text-center">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Pro Tip:</span> Consider rebalancing your portfolio at least once per quarter
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 mb-4">No investments added yet.</p>
            <Link 
              href="/investments/new" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium inline-flex items-center hover:bg-blue-700 transition-colors"
            >
              Add Your First Investment
            </Link>
          </div>
        </div>
      )}
      
      {/* Investments Table */}
      {investments.length > 0 && (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Holdings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-700 text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Shares</th>
                    <th className="px-4 py-3 text-right">Avg. Price</th>
                    <th className="px-4 py-3 text-right">Current Price</th>
                    <th className="px-4 py-3 text-right">Daily Change</th>
                    <th className="px-4 py-3 text-right">Total Value</th>
                    <th className="px-4 py-3 text-right">Gain/Loss</th>
                    <th className="px-4 py-3 text-right">%</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {investments.map((investment) => {
                    const currentPrice = investment.currentPrice || investment.avgPrice;
                    const totalValue = calculateTotalValue(investment.shares, currentPrice);
                    const gainLoss = calculateGainLoss(investment.shares, investment.avgPrice, currentPrice);
                    const gainLossPercentage = calculateGainLossPercentage(investment.avgPrice, currentPrice);
                    const isPositive = gainLoss >= 0;
                    const lastUpdated = investment.lastUpdated ? new Date(investment.lastUpdated) : null;
                    
                    return (
                      <tr key={investment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{investment.symbol}</td>
                        <td className="px-4 py-4">{investment.name}</td>
                        <td className="px-4 py-4 text-right">{investment.shares.toFixed(2)}</td>
                        <td className="px-4 py-4 text-right">{formatCurrency(investment.avgPrice)}</td>
                        <td className="px-4 py-4 text-right">
                          {investment.currentPrice ? (
                            <span>{formatCurrency(investment.currentPrice)}</span>
                          ) : (
                            <StockPrice symbol={investment.symbol} compact={true} />
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <StockPrice symbol={investment.symbol} compact={true} dailyChangeOnly={true} />
                        </td>
                        <td className="px-4 py-4 text-right">{formatCurrency(totalValue)}</td>
                        <td className={`px-4 py-4 text-right ${isPositive ? 'text-green-600' : 'text-gray-600'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(gainLoss)}
                        </td>
                        <td className={`px-4 py-4 text-right ${isPositive ? 'text-green-600' : 'text-gray-600'}`}>
                          {isPositive ? '+' : ''}{formatPercentage(gainLossPercentage)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-1">
                            <Link 
                              href={`/investments/edit/${investment.id}`}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              <EditIcon className="w-4 h-4" />
                              <span className="sr-only">Edit</span>
                            </Link>
                            <button 
                              onClick={() => investment.id && handleDelete(investment.id)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 