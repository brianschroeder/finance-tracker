'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SavingsPlanData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  yearlyContribution: number;
  yearlyBonus: number;
  annualReturn: number;
}

export default function SavingsPlanPage() {
  // Form state
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [retirementAge, setRetirementAge] = useState<number>(65);
  const [currentSavings, setCurrentSavings] = useState<number>(100000);
  const [yearlyContribution, setYearlyContribution] = useState<number>(20000);
  const [yearlyBonus, setYearlyBonus] = useState<number>(5000);
  const [annualReturn, setAnnualReturn] = useState<number>(7);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Projection state
  const [projectionData, setProjectionData] = useState<{
    ages: number[];
    totals: number[];
    projectedAmount: number;
    totalContributions: number;
    totalInterest: number;
  }>({
    ages: [],
    totals: [],
    projectedAmount: 0,
    totalContributions: 0,
    totalInterest: 0
  });

  // Load saved data on component mount
  useEffect(() => {
    const fetchSavedData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/savings-plan');
        
        if (!response.ok) {
          throw new Error('Failed to fetch saved data');
        }
        
        const data: SavingsPlanData = await response.json();
        
        // Update state with saved values
        setCurrentAge(data.currentAge);
        setRetirementAge(data.retirementAge);
        setCurrentSavings(data.currentSavings);
        setYearlyContribution(data.yearlyContribution);
        setYearlyBonus(data.yearlyBonus);
        setAnnualReturn(data.annualReturn);
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSavedData();
  }, []);

  // Calculate retirement savings projection
  useEffect(() => {
    const calculateProjection = () => {
      const yearsToRetirement = retirementAge - currentAge;
      const ages: number[] = [];
      const totals: number[] = [];
      
      let savings = currentSavings;
      let totalContributions = currentSavings;
      
      for (let i = 0; i <= yearsToRetirement; i++) {
        const age = currentAge + i;
        ages.push(age);
        totals.push(Math.round(savings));
        
        // Add yearly contribution and bonus
        if (i < yearsToRetirement) {
          savings += yearlyContribution + yearlyBonus;
          totalContributions += yearlyContribution + yearlyBonus;
          
          // Apply investment return
          savings *= (1 + annualReturn / 100);
        }
      }
      
      const projectedAmount = Math.round(savings);
      const totalInterest = projectedAmount - totalContributions;
      
      setProjectionData({
        ages,
        totals,
        projectedAmount,
        totalContributions,
        totalInterest
      });
    };
    
    calculateProjection();
  }, [currentAge, retirementAge, currentSavings, yearlyContribution, yearlyBonus, annualReturn]);

  // Save current values
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      const savingsData: SavingsPlanData = {
        currentAge,
        retirementAge,
        currentSavings,
        yearlyContribution,
        yearlyBonus,
        annualReturn
      };
      
      const response = await fetch('/api/savings-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savingsData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError((error as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Chart data
  const chartData = {
    labels: projectionData.ages,
    datasets: [
      {
        label: 'Projected Savings',
        data: projectionData.totals,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.2,
        fill: true
      }
    ]
  };
  
  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Balance: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Retirement Savings Plan</h1>
        <Link
          href="/"
          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Back to Dashboard
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Retirement Calculator</h2>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-3 py-1.5 ${
                saving ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              } text-white text-xs rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          
          {saveSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
              Settings saved successfully!
            </div>
          )}
          
          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {saveError}
            </div>
          )}
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded-md w-full"></div>
              <div className="h-10 bg-gray-200 rounded-md w-full"></div>
              <div className="h-10 bg-gray-200 rounded-md w-full"></div>
              <div className="h-10 bg-gray-200 rounded-md w-full"></div>
              <div className="h-10 bg-gray-200 rounded-md w-full"></div>
              <div className="h-10 bg-gray-200 rounded-md w-full"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Age
                </label>
                <input
                  type="number"
                  min="18"
                  max="90"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retirement Age
                </label>
                <input
                  type="number"
                  min={currentAge + 1}
                  max="100"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Savings ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yearly Contribution ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={yearlyContribution}
                  onChange={(e) => setYearlyContribution(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yearly Bonus ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={yearlyBonus}
                  onChange={(e) => setYearlyBonus(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Annual Return (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Projection Results */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Retirement Projection</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-700 mb-1">Projected Amount</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(projectionData.projectedAmount)}</p>
              <p className="text-xs text-blue-600 mt-1">at age {retirementAge}</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <p className="text-sm text-green-700 mb-1">Total Contributions</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(projectionData.totalContributions)}</p>
              <p className="text-xs text-green-600 mt-1">over {retirementAge - currentAge} years</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <p className="text-sm text-purple-700 mb-1">Investment Growth</p>
              <p className="text-2xl font-bold text-purple-800">{formatCurrency(projectionData.totalInterest)}</p>
              <p className="text-xs text-purple-600 mt-1">from interest</p>
            </div>
          </div>
          
          {/* Projection Chart */}
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
      
      {/* Retirement Tips */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Retirement Planning Tips</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-800 mb-2">Early Savings Impact</h3>
            <p className="text-sm text-gray-600">
              Starting early can dramatically increase your retirement savings due to compound interest.
              Even small increases in your annual contribution can lead to significant growth over time.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-800 mb-2">Diversification</h3>
            <p className="text-sm text-gray-600">
              Consider a mix of retirement accounts including 401(k), IRA, and taxable investment accounts 
              to maximize tax advantages and maintain flexibility.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-800 mb-2">Inflation Consideration</h3>
            <p className="text-sm text-gray-600">
              This calculator doesn't account for inflation. Consider that the purchasing power of your 
              projected amount will be lower in future years.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-800 mb-2">Retirement Income</h3>
            <p className="text-sm text-gray-600">
              A common guideline is to aim for retirement savings that can provide 70-80% of your pre-retirement
              annual income to maintain your standard of living.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 