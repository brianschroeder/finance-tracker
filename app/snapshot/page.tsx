'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/PageTitle';

interface AssetData {
  id: number;
  date: string;
  cash: number;
  stocks: number;
  interest: number;
  checking: number;
  retirement401k: number;
  houseFund: number;
  vacationFund: number;
  emergencyFund: number;
  totalAssets: number;
}

interface BudgetSummary {
  totalAllocated: number;
  totalMonthlyAllocated: number;
  totalSpent: number;
  totalCashBack: number;
  totalRawSpent: number;
  totalAdjustedSpent?: number;
  totalRemaining: number;
  totalPendingTipAmount?: number;
  totalPendingCashbackAmount?: number;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  periodType: string;
}

interface CreditCard {
  id: number;
  name: string;
  balance: number;
  limit: number;
  color?: string;
}

export default function SnapshotPage() {
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [loadingCreditCards, setLoadingCreditCards] = useState(true);
  const [loadingInvestments, setLoadingInvestments] = useState(true);
  const [additionalBudgetItems, setAdditionalBudgetItems] = useState<{id: string, amount: string, description: string}[]>([]);
  
  const [investmentData, setInvestmentData] = useState<{
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    dayChange: number;
    dayChangePercent: number;
    lastUpdated: string | null;
    investments: any[];
  }>({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    lastUpdated: null,
    investments: [],
  });

  const router = useRouter();

  // Load additional budget items from localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem('additionalBudgetItems');
    if (savedItems) {
      try {
        setAdditionalBudgetItems(JSON.parse(savedItems));
      } catch (error) {
        console.error('Error parsing saved budget items:', error);
      }
    }
  }, []);

  // Fetch assets
  useEffect(() => {
    async function fetchLatestAssets() {
      try {
        const response = await fetch('/api/assets');
        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        setAssetData(data);
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLatestAssets();
  }, []);

  // Fetch budget data
  useEffect(() => {
    async function fetchBudgetData() {
      try {
        setLoadingBudget(true);
        const response = await fetch(`/api/budget-analysis?periodType=biweekly`);
        if (!response.ok) throw new Error('Failed to fetch budget');
        const data = await response.json();
        setBudgetSummary(data.summary || null);
      } catch (err) {
        console.error('Error fetching budget:', err);
      } finally {
        setLoadingBudget(false);
      }
    }
    fetchBudgetData();
  }, []);

  // Fetch credit cards
  useEffect(() => {
    async function fetchCreditCards() {
      try {
        setLoadingCreditCards(true);
        const response = await fetch('/api/credit-cards');
        if (!response.ok) throw new Error('Failed to fetch credit cards');
        const data = await response.json();
        setCreditCards(data);
      } catch (err) {
        console.error('Error fetching credit cards:', err);
      } finally {
        setLoadingCreditCards(false);
      }
    }
    fetchCreditCards();
  }, []);

  // Fetch investments
  useEffect(() => {
    async function fetchInvestmentData() {
      try {
        setLoadingInvestments(true);
        const response = await fetch('/api/investments');
        if (!response.ok) throw new Error('Failed to fetch investments');
        const data = await response.json();
        const investments = data.investments || [];
        
        let initialTotalValue = 0;
        let initialTotalCost = 0;
        
        for (const investment of investments) {
          const currentPrice = investment.currentPrice || investment.avgPrice;
          const investmentValue = investment.shares * currentPrice;
          const investmentCost = investment.shares * investment.avgPrice;
          
          initialTotalValue += investmentValue;
          initialTotalCost += investmentCost;
        }
        
        const initialGainLoss = initialTotalValue - initialTotalCost;
        const initialGainLossPercent = initialTotalCost > 0 ? (initialGainLoss / initialTotalCost) * 100 : 0;
        
        setInvestmentData({
          totalValue: data.totalValue || initialTotalValue,
          totalCost: initialTotalCost,
          totalGainLoss: data.totalGainLoss || initialGainLoss,
          totalGainLossPercent: initialGainLossPercent,
          dayChange: data.dayChange || 0,
          dayChangePercent: data.dayChangePercent || 0,
          lastUpdated: data.lastUpdated || null,
          investments: investments
        });
      } catch (error) {
        console.error('Error fetching investments:', error);
      } finally {
        setLoadingInvestments(false);
      }
    }
    fetchInvestmentData();
  }, []);

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const calculateTotalCreditCardDebt = () => {
    return creditCards.reduce((sum, card) => sum + card.balance, 0);
  };

  const calculateNetWorth = () => {
    if (!assetData) return 0;
    const cashAssets = assetData.cash + assetData.interest;
    const investmentsTotal = assetData.retirement401k + (loadingInvestments ? 0 : investmentData.totalValue);
    return cashAssets + investmentsTotal;
  };

  const calculateBudgetWithoutPendingCashback = () => {
    if (!budgetSummary) return 0;
    const allocated = budgetSummary.totalAllocated;
    const spent = budgetSummary.totalSpent + (budgetSummary.totalPendingTipAmount || 0);
    return allocated - spent;
  };

  const calculateTotalBudgetWithAdditional = () => {
    const baseBudget = calculateBudgetWithoutPendingCashback();
    const totalAdditional = additionalBudgetItems.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
    return baseBudget + totalAdditional;
  };

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Financial Snapshot" 
        description="Quick overview of your financial status"
      />

      {/* Quick Financial Snapshot */}
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Overview
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Budget */}
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase mb-2">Budget</div>
            {loadingBudget ? (
              <div className="animate-pulse h-8 bg-gray-100 rounded w-24"></div>
            ) : budgetSummary ? (
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(calculateTotalBudgetWithAdditional())}
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-300">$0.00</div>
            )}
            <div className="text-xs text-gray-500 mt-2">Biweekly</div>
          </div>

          {/* Savings (Stocks + Cash) */}
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase mb-2">Savings</div>
            {loading || loadingInvestments ? (
              <div className="animate-pulse h-8 bg-gray-100 rounded w-24"></div>
            ) : assetData ? (
              <>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(assetData.cash + (loadingInvestments ? 0 : investmentData.totalValue) + assetData.interest)}
                </div>
                <div className="flex flex-col gap-1 text-xs text-gray-500 mt-2">
                  <div>Stocks: {formatCurrency(investmentData.totalValue)}</div>
                  <div>Cash: {formatCurrency(assetData.cash + assetData.interest)}</div>
                </div>
              </>
            ) : (
              <div className="text-3xl font-bold text-gray-300">$0.00</div>
            )}
          </div>

          {/* 401k */}
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase mb-2">401k</div>
            {loading ? (
              <div className="animate-pulse h-8 bg-gray-100 rounded w-24"></div>
            ) : assetData ? (
              <div className="text-3xl font-bold text-indigo-600">
                {formatCurrency(assetData.retirement401k)}
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-300">$0.00</div>
            )}
            <div className="text-xs text-gray-500 mt-2">Retirement</div>
          </div>

          {/* Debt */}
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase mb-2">Debt</div>
            {loadingCreditCards ? (
              <div className="animate-pulse h-8 bg-gray-100 rounded w-24"></div>
            ) : (
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(calculateTotalCreditCardDebt())}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">Credit Cards</div>
          </div>

          {/* Net Worth */}
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-blue-300">
            <div className="text-sm font-medium text-blue-700 uppercase mb-2">Net Worth</div>
            {loading || loadingInvestments ? (
              <div className="animate-pulse h-8 bg-gray-100 rounded w-24"></div>
            ) : assetData ? (
              <div className="text-3xl font-bold text-blue-700">
                {formatCurrency(calculateNetWorth())}
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-300">$0.00</div>
            )}
            <div className="text-xs text-blue-600 mt-2">Cash + Investments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
