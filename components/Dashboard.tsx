'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { format, addWeeks, differenceInDays } from 'date-fns';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

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

interface PaySettings {
  id: number;
  lastPayDate: string;
  frequency: 'weekly' | 'biweekly';
}

interface PendingTransaction {
  id: number;
  name: string;
  amount: number;
  dueDate: number;
  isEssential: boolean;
  formattedDate: string;
  daysUntilDue: number;
  payPeriodStart: string;
  payPeriodEnd: string;
}

interface Transaction {
  id: number;
  date: string;
  categoryId: number | null;
  name: string;
  amount: number;
  notes?: string;
  createdAt?: string;
  category?: {
    id: number;
    name: string;
    color: string;
    allocatedAmount: number;
    isActive: boolean;
  };
}

interface BudgetCategory {
  id: number;
  name: string;
  allocatedAmount: number;
  fullMonthAmount?: number;
  color: string;
  spent: number;
  cashBack?: number;
  rawSpent?: number;
  remaining: number;
}

interface BudgetSummary {
  totalAllocated: number;
  totalMonthlyAllocated: number;
  totalSpent: number;
  totalCashBack: number;
  totalRawSpent: number;
  totalRemaining: number;
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

interface IncomeData {
  payAmount?: number;
  payFrequency?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
}

interface RecurringTransaction {
  id: number;
  name: string;
  amount: number;
  dueDate: number;
  isEssential: boolean;
  formattedDate?: string;
  daysUntilDue?: number;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  calculatedDueDate?: Date;
}

export default function Dashboard() {
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [paySettings, setPaySettings] = useState<PaySettings | null>(null);
  const [nextPayDate, setNextPayDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingOnlyAmount, setPendingOnlyAmount] = useState(0);
  const [payPeriodStart, setPayPeriodStart] = useState<string | null>(null);
  const [payPeriodEnd, setPayPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loadingCreditCards, setLoadingCreditCards] = useState(true);
  
  // Budget category state
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(true);

  const [incomeData, setIncomeData] = useState<IncomeData>({
    payAmount: 0,
    payFrequency: 'biweekly'
  });
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [nextSavings, setNextSavings] = useState<number | null>(null);
  const [recurringTransactionsTotal, setRecurringTransactionsTotal] = useState(0);
  const [nextPayPeriodTransactions, setNextPayPeriodTransactions] = useState<RecurringTransaction[]>([]);
  const [loadingNextPayPeriodTransactions, setLoadingNextPayPeriodTransactions] = useState(true);

  // Track the individual components for displaying the breakdown
  const [savingsBreakdown, setSavingsBreakdown] = useState({
    biweeklyPay: 0, 
    recurringExpenses: 0, 
    budgetAllocation: 0
  });

  // Add a state to store investment data
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
  const [loadingInvestments, setLoadingInvestments] = useState(true);

  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [accountTotals, setAccountTotals] = useState([]);
  
  // State to track when prices were last fetched
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const router = useRouter();

  // Add redirect to onboarding if necessary data is missing
  useEffect(() => {
    async function checkRequiredData() {
      try {
        // Check if we have basic data needed for the dashboard
        const assetResponse = await fetch('/api/assets');
        const assetData = await assetResponse.json();
        
        const paySettingsResponse = await fetch('/api/pay-settings');
        const paySettingsData = await paySettingsResponse.json();
        
        // If we're missing critical data, redirect to onboarding
        if (!assetData?.id || !paySettingsData?.id) {
          router.push('/onboarding');
        }
      } catch (error) {
        console.error('Error checking required data:', error);
        router.push('/onboarding');
      }
    }
    
    checkRequiredData();
  }, [router]);

  useEffect(() => {
    async function fetchLatestAssets() {
      try {
        const response = await fetch('/api/assets');
        
        if (!response.ok) {
          throw new Error('Failed to fetch latest assets');
        }
        
        const data = await response.json();
        
        // Check if data has an error property
        if (data.error) {
          console.error('API error:', data.error, data.details || '');
          throw new Error(data.error);
        }
        
        // Set asset data even if id is null (empty defaults from API)
        setAssetData(data);
        
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLatestAssets();
  }, []);

  // Fetch pay settings
  useEffect(() => {
    async function fetchPaySettings() {
      try {
        const response = await fetch('/api/pay-settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch pay settings');
        }
        
        const data = await response.json();
        if (data && data.id) {
          setPaySettings(data);
        }
      } catch (err) {
        console.error('Error fetching pay settings:', err);
      }
    }
    
    fetchPaySettings();
  }, []);

  // Fetch pending transactions
  useEffect(() => {
    async function fetchPendingTransactions() {
      try {
        const response = await fetch('/api/pending-transactions', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch pending transactions');
        }
        
        const data = await response.json();
        if (data) {
          // Filter to get only non-completed transactions
          const allTransactions = data.transactions || [];
          const pendingOnly = allTransactions.filter((t: PendingTransaction & { isCompleted?: boolean }) => !t.isCompleted);
          
          // Calculate the pending-only total
          const pendingOnlyTotal = pendingOnly.reduce((sum: number, t: PendingTransaction) => sum + t.amount, 0);
          
          setPendingTransactions(data.transactions || []);
          setPendingTotal(data.totalAmount || 0);
          setPendingOnlyAmount(pendingOnlyTotal);
          
          // Extract pay period dates from the first transaction (if available)
          if (data.transactions && data.transactions.length > 0) {
            setPayPeriodStart(data.transactions[0].payPeriodStart);
            setPayPeriodEnd(data.transactions[0].payPeriodEnd);
          }
        }
      } catch (err) {
        console.error('Error fetching pending transactions:', err);
      }
    }
    
    fetchPendingTransactions();
  }, []);

  // Calculate next pay date whenever pay settings change
  useEffect(() => {
    if (!paySettings?.lastPayDate) return;
    
    // Parse date string manually to avoid timezone issues
    const [year, month, day] = paySettings.lastPayDate.split('-').map(num => parseInt(num, 10));
    const lastPayDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    lastPayDate.setHours(0, 0, 0, 0);
    
    // Calculate next pay date based on frequency
    let nextDate: Date;
    if (paySettings.frequency === 'weekly') {
      nextDate = addWeeks(lastPayDate, 1);
    } else {
      nextDate = addWeeks(lastPayDate, 2); // biweekly
    }
    
    // If next date is in the past, keep adding until we get a future date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    while (nextDate < today) {
      if (paySettings.frequency === 'weekly') {
        nextDate = addWeeks(nextDate, 1);
      } else {
        nextDate = addWeeks(nextDate, 2);
      }
    }
    
    setNextPayDate(nextDate);
    setDaysRemaining(differenceInDays(nextDate, today));
  }, [paySettings]);

  // Fetch recent transactions
  useEffect(() => {
    async function fetchRecentTransactions() {
      try {
        setLoadingTransactions(true);
        const response = await fetch('/api/transactions');
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        const transactions = data.transactions || [];
        setRecentTransactions(transactions.slice(0, 5)); // Get 5 most recent
      } catch (err) {
        console.error('Error fetching recent transactions:', err);
      } finally {
        setLoadingTransactions(false);
      }
    }
    
    fetchRecentTransactions();
  }, []);
  
  // Fetch budget categories and spending
  useEffect(() => {
    async function fetchBudgetData() {
      try {
        setLoadingBudget(true);
        
        // Use biweekly period type
        const response = await fetch(`/api/budget-analysis?periodType=biweekly`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch budget analysis');
        }
        
        const data = await response.json();
        setBudgetCategories(data.categories || []);
        setBudgetSummary(data.summary || null);
      } catch (err) {
        console.error('Error fetching budget analysis:', err);
        // Set empty arrays/objects on error to prevent null reference errors
        setBudgetCategories([]);
        setBudgetSummary({
          totalAllocated: 0,
          totalMonthlyAllocated: 0,
          totalSpent: 0,
          totalCashBack: 0,
          totalRawSpent: 0,
          totalRemaining: 0,
          startDate: '',
          endDate: '',
          daysInPeriod: 0,
          periodType: 'biweekly'
        });
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
        
        if (!response.ok) {
          throw new Error('Failed to fetch credit cards');
        }
        
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

  // Add a new useEffect to fetch income data
  useEffect(() => {
    async function fetchIncomeData() {
      try {
        setLoadingIncome(true);
        const response = await fetch('/api/income');
        
        if (!response.ok) {
          throw new Error('Failed to fetch income data');
        }
        
        const data = await response.json();
        if (data) {
          setIncomeData({
            payAmount: data.payAmount || 0,
            payFrequency: data.payFrequency || 'biweekly'
          });
        }
      } catch (err) {
        // Silently handle errors
      } finally {
        setLoadingIncome(false);
      }
    }
    
    fetchIncomeData();
  }, []);

  // Add a new useEffect to fetch recurring transactions
  useEffect(() => {
    async function fetchRecurringTransactions() {
      try {
        // Add a cache-busting timestamp for maximum cache invalidation
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/recurring-transactions?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recurring transactions');
        }
        
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Calculate the total monthly recurring payments
          const total = data.reduce((sum: number, transaction: any) => sum + transaction.amount, 0);
          setRecurringTransactionsTotal(total);
        } else {
          setRecurringTransactionsTotal(0);
        }
      } catch (err) {
        setRecurringTransactionsTotal(0);
      }
    }
    
    // Initial fetch
    fetchRecurringTransactions();
    
    // Set up listener for pay settings changes
    const handlePaySettingsChanged = () => {
      fetchRecurringTransactions();
    };
    
    // Add event listener
    window.addEventListener('paySettingsChanged', handlePaySettingsChanged);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('paySettingsChanged', handlePaySettingsChanged);
    };
  }, []);  // Remove paySettings dependency as we'll use the event system instead

  // Calculate next savings whenever we have all the required data
  useEffect(() => {
    // Always calculate even if we're missing some data
    const biweeklyPay = incomeData?.payAmount || 0;
    
    // Calculate the recurring expenses for the next pay period based on actual transactions
    // that fall within the next pay date to next pay date + 14 days range
    const nextPayPeriodRecurringAmount = nextPayPeriodTransactions.length > 0 
      ? nextPayPeriodTransactions.reduce((total, transaction) => total + transaction.amount, 0)
      : recurringTransactionsTotal / 2; // Fallback to half the monthly recurring amount if no specific transactions
    
    // Calculate biweekly budget allocation (default to 0 if not available)
    const biweeklyBudget = budgetSummary?.totalAllocated || 0;
    
    // Calculate projected savings
    const projectedSavings = biweeklyPay - nextPayPeriodRecurringAmount - biweeklyBudget;
    setNextSavings(projectedSavings);
    
    // Store breakdown for display
    setSavingsBreakdown({
      biweeklyPay,
      recurringExpenses: nextPayPeriodRecurringAmount,
      budgetAllocation: biweeklyBudget
    });
  }, [incomeData, budgetSummary, nextPayPeriodTransactions, recurringTransactionsTotal]);

  // Fetch next pay period transactions whenever the next pay date or pay settings change
  useEffect(() => {
    async function fetchNextPayPeriodTransactions() {
      if (!nextPayDate || !paySettings) {
        setNextPayPeriodTransactions([]);
        return;
      }
      
      try {
        setLoadingNextPayPeriodTransactions(true);
        
        // Calculate the next pay period window - from next pay date to the pay date after that
        const nextPayPeriodStart = new Date(nextPayDate);
        const nextPayPeriodEnd = new Date(nextPayDate);
        
        if (paySettings.frequency === 'weekly') {
          nextPayPeriodEnd.setDate(nextPayPeriodEnd.getDate() + 7);
        } else {
          nextPayPeriodEnd.setDate(nextPayPeriodEnd.getDate() + 14);
        }
        
        // Call the API to get all recurring transactions with cache busting
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/recurring-transactions?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recurring transactions');
        }
        
        const allTransactions = await response.json();
        
        // Filter transactions that fall within the next pay period
        const transactionsInPeriod = [];
        
        for (const transaction of allTransactions) {
          // Calculate all potential due dates (current month and next month)
          const currentMonth = nextPayPeriodStart.getMonth();
          const currentYear = nextPayPeriodStart.getFullYear();
          const nextMonth = (currentMonth + 1) % 12;
          const nextMonthYear = nextMonth === 0 ? currentYear + 1 : currentYear;
          
          // Current month due date
          const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          const adjustedDueDate = Math.min(transaction.dueDate, daysInCurrentMonth);
          const currentMonthDueDate = new Date(currentYear, currentMonth, adjustedDueDate);
          currentMonthDueDate.setHours(0, 0, 0, 0);
          
          // Next month due date
          const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
          const nextMonthAdjustedDueDate = Math.min(transaction.dueDate, daysInNextMonth);
          const nextMonthDueDate = new Date(nextMonthYear, nextMonth, nextMonthAdjustedDueDate);
          nextMonthDueDate.setHours(0, 0, 0, 0);
          
          // Check if either date falls within the pay period
          if ((currentMonthDueDate >= nextPayPeriodStart && currentMonthDueDate < nextPayPeriodEnd) ||
              (nextMonthDueDate >= nextPayPeriodStart && nextMonthDueDate < nextPayPeriodEnd)) {
            
            // Add calculated due date to the transaction for display purposes
            const dueDateToUse = currentMonthDueDate >= nextPayPeriodStart && currentMonthDueDate < nextPayPeriodEnd
              ? currentMonthDueDate
              : nextMonthDueDate;
              
            transactionsInPeriod.push({
              ...transaction,
              calculatedDueDate: dueDateToUse
            });
          }
        }
        
        setNextPayPeriodTransactions(transactionsInPeriod);
      } catch (err) {
        setNextPayPeriodTransactions([]);
      } finally {
        setLoadingNextPayPeriodTransactions(false);
      }
    }
    
    // Initial fetch
    fetchNextPayPeriodTransactions();
    
    // Set up listener for pay settings changes
    const handlePaySettingsChanged = () => {
      fetchNextPayPeriodTransactions();
    };
    
    // Add event listener 
    window.addEventListener('paySettingsChanged', handlePaySettingsChanged);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('paySettingsChanged', handlePaySettingsChanged);
    };
  }, [nextPayDate, paySettings]);  // Keep these dependencies for the initial calculation

  // Calculate daily investment growth (assume 7% annual growth spread over 365 days)
  const calculateDailyInvestmentGrowth = () => {
    if (!assetData) return 0;
    const totalInvestments = calculateTotalInvestments();
    // 7% annual growth rate, divided by 365 days
    return (totalInvestments * 0.07) / 365;
  };

  // Calculate yearly investment growth (7% annual growth)
  const calculateYearlyInvestmentGrowth = () => {
    if (!assetData) return 0;
    const totalInvestments = calculateTotalInvestments();
    return totalInvestments * 0.07;
  };

  // Calculate yearly investment growth percentage
  const calculateYearlyInvestmentGrowthPercentage = () => {
    return 7; // 7% is the default growth rate
  };

  // Calculate daily budget remaining until next pay date
  const calculateDailyBudgetRemaining = () => {
    if (!budgetSummary || !daysRemaining || daysRemaining <= 0) return 0;
    return budgetSummary.totalRemaining / daysRemaining;
  };

  // Helper function to format dates consistently in YYYY-MM-DD format
  const formatDateToYYYYMMDD = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Calculate projected total savings by adding next savings to current assets
  const calculateProjectedTotalSavings = () => {
    if (!assetData) return 0;
    
    const currentSavings = assetData.cash + (loadingInvestments ? 0 : investmentData.totalValue) + assetData.interest;
    
    // If we don't have next savings, just return current
    if (nextSavings === null) return currentSavings;
    
    return currentSavings + nextSavings;
  };

  const formatCurrency = (value: number) => {
    // Handle NaN, undefined, and null values
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPayDate = (dateString: string) => {
    // Parse the date string manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    // Create a date with the specific year, month, and day (month is 0-indexed)
    return format(new Date(year, month - 1, day), 'MMM d');
  };

  // Helper function to consistently format dates for display
  const formatDisplayDate = (date: Date) => {
    return format(date, 'MMMM d, yyyy');
  };

  // Calculate investment funds remaining
  const calculateInvestmentFundsRemaining = () => {
    if (!assetData) return 0;
    const cash = assetData.cash || 0;
    const interest = assetData.interest || 0;
    const houseFund = assetData.houseFund || 0;
    const vacationFund = assetData.vacationFund || 0;
    const emergencyFund = assetData.emergencyFund || 0;
    const available = cash + interest - houseFund - vacationFund - emergencyFund;
    // Return 0 if the value would be negative
    return available > 0 ? available : 0;
  };

  // Calculate remaining budget (checking balance minus PENDING transactions only)
  const calculateRemainingBudget = () => {
    if (!assetData) return 0;
    return assetData.checking - pendingOnlyAmount;
  };

  const formatTransactionDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return format(new Date(year, month - 1, day), 'MMM d, yyyy');
  };

  // Calculate total cash available
  const calculateTotalCash = () => {
    if (!assetData) return 0;
    return assetData.cash + assetData.interest + assetData.checking;
  };

  // Calculate total investments
  const calculateTotalInvestments = () => {
    if (!assetData) return 0;
    return assetData.retirement401k + (loadingInvestments ? 0 : investmentData.totalValue);
  };
  
  // Calculate total assets
  const calculateActualTotalAssets = () => {
    if (!assetData) return 0;
    return assetData.cash + (loadingInvestments ? 0 : investmentData.totalValue) + assetData.interest;
  };
  
  // Calculate funds (which come from cash)
  const calculateTotalFunds = () => {
    if (!assetData) return 0;
    return (
      assetData.vacationFund +
      assetData.emergencyFund +
      assetData.houseFund
    );
  };

  // Calculate spending progress percentage for budget categories
  const calculatePercentage = (spent: number, allocated: number) => {
    if (allocated === 0) return 0;
    // Cap at 100% for the progress bar
    return Math.min((spent / allocated) * 100, 100);
  };

  // Calculate total potential investments (current stocks + available funds)
  const calculatePotentialInvestments = () => {
    if (!assetData) return 0;
    const availableFunds = calculateInvestmentFundsRemaining();
    return assetData.stocks + availableFunds;
  };

  // Calculate total credit card debt
  const calculateTotalCreditCardDebt = () => {
    return creditCards.reduce((sum, card) => sum + card.balance, 0);
  };

  // Calculate total credit limit
  const calculateTotalCreditLimit = () => {
    return creditCards.reduce((sum, card) => sum + card.limit, 0);
  };

  // Calculate credit utilization
  const calculateCreditUtilization = (balance: number, limit: number) => {
    if (limit === 0) return 0;
    return (balance / limit) * 100;
  };

  // Get credit utilization color
  const getCreditUtilizationColor = (utilizationPercentage: number) => {
    if (utilizationPercentage < 10) return 'bg-blue-400';
    if (utilizationPercentage < 30) return 'bg-blue-500';
    if (utilizationPercentage < 50) return 'bg-blue-600';
    if (utilizationPercentage < 75) return 'bg-blue-700';
    return 'bg-blue-800';
  };

  // Calculate projected savings for next pay period
  const calculateProjectedSavings = useCallback(() => {
    try {
      // Get pay period income based on frequency
      let payPeriodIncome = 0;
      
      if (incomeData.payFrequency === 'biweekly') {
        payPeriodIncome = incomeData.payAmount || 0;
      } else if (incomeData.payFrequency === 'monthly') {
        // Convert monthly pay to biweekly (monthly * 12 / 26)
        payPeriodIncome = ((incomeData.payAmount || 0) * 12) / 26;
      } else if (incomeData.payFrequency === 'weekly') {
        // Convert weekly pay to biweekly (weekly * 2)
        payPeriodIncome = (incomeData.payAmount || 0) * 2;
      } else if (incomeData.payFrequency === 'semimonthly') {
        // Convert semi-monthly (twice a month) to biweekly (semi-monthly * 24 / 26)
        payPeriodIncome = ((incomeData.payAmount || 0) * 24) / 26;
      } else {
        // Default to using the biweekly pay directly
        payPeriodIncome = incomeData.payAmount || 0;
      }
      
      // Calculate projected savings for next pay period
      const projectedSavings = payPeriodIncome - savingsBreakdown.recurringExpenses - savingsBreakdown.budgetAllocation;
      
      setNextSavings(projectedSavings);
      
      return projectedSavings;
    } catch (error) {
      return 0;
    }
  }, [incomeData, savingsBreakdown]);

  // Calculate total investment return (assume 7% annual growth for the year)
  const calculateTotalInvestmentReturn = () => {
    if (!assetData) return 0;
    const totalInvestments = calculateTotalInvestments();
    // Calculate yearly return
    return totalInvestments * 0.07;
  };

  // Add a new useEffect to fetch investment data
  useEffect(() => {
    fetchInvestmentData();
  }, []); // Empty dependency array ensures this runs once when component mounts

  async function fetchInvestmentData() {
    try {
      setLoadingInvestments(true);
      
      const response = await fetch('/api/investments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch investment data');
      }
      
      const data = await response.json();
      const investments = data.investments || [];
      
      // Calculate initial values from the investments
      let initialTotalValue = 0;
      let initialTotalCost = 0;
      
      for (const investment of investments) {
        // Use current price if available, otherwise use average price
        const currentPrice = investment.currentPrice || investment.avgPrice;
        const investmentValue = investment.shares * currentPrice;
        const investmentCost = investment.shares * investment.avgPrice;
        
        initialTotalValue += investmentValue;
        initialTotalCost += investmentCost;
      }
      
      const initialGainLoss = initialTotalValue - initialTotalCost;
      const initialGainLossPercent = initialTotalCost > 0 ? (initialGainLoss / initialTotalCost) * 100 : 0;
      
      // Set the investment data with calculated values first, including day change from API
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
      
      // After setting the initial data, update the prices with a delay
      // to prevent conflicts with the initial data loading
      if (investments.length > 0) {
        // Don't set loading to false until after updating prices
        setTimeout(async () => {
          try {
            await updateInvestmentPrices(investments);
          } catch (error) {
            console.error('Error updating investment prices:', error);
          } finally {
            // Only set loading to false after prices are updated
            setLoadingInvestments(false);
          }
        }, 1500);
      } else {
        setLoadingInvestments(false);
      }
    } catch (error) {
      console.error('Error fetching investment data:', error);
      // Set default values to prevent null reference errors
      setInvestmentData({
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        lastUpdated: null,
        investments: []
      });
      setLoadingInvestments(false);
      
      toast({
        title: 'Error',
        description: 'Failed to load investment data. You may need to setup your investments.',
        variant: 'default'
      });
    }
  }
  
  // Function to calculate today's change using the stock-price API
  async function calculateTodaysChange(investments: any[]) {
    let totalDailyChange = 0;
    let totalDailyChangePercent = 0;
    let totalInvestmentValue = 0;
    
    try {
      // Calculate total investment value first
      for (const investment of investments) {
        const currentPrice = investment.currentPrice || investment.avgPrice;
        const investmentValue = investment.shares * currentPrice;
        totalInvestmentValue += investmentValue;
      }
      
      // Fetch the latest daily changes for each investment
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
    }
    
    return { dayChange: totalDailyChange, dayChangePercent: totalDailyChangePercent };
  }

  // Function to update investment prices
  async function updateInvestmentPrices(investments: any[]) {
    try {
      // Import the getStockPriceOnly function which returns just the price
      const { getStockPriceOnly } = await import('@/lib/stock-api');
      
      // Update each investment with current market price
      let updatedInvestments = [...investments];
      let totalValue = 0;
      let totalCost = 0;
      
      for (const investment of updatedInvestments) {
        if (!investment.id || !investment.symbol) continue;
        
        try {
          // Get the current price from the stock API
          const currentPrice = await getStockPriceOnly(investment.symbol);
          
          if (currentPrice === null) continue;
          
          // Update the price in the database
          await fetch('/api/investments', {
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
          
          // Update the investment in our local state
          investment.currentPrice = currentPrice;
        } catch (err) {
          console.error(`Error updating price for ${investment.symbol}:`, err);
        }
        
        // Calculate values for this investment
        const investmentValue = investment.shares * investment.currentPrice;
        const investmentCost = investment.shares * investment.avgPrice;
        
        totalValue += investmentValue;
        totalCost += investmentCost;
      }
      
      // Calculate the portfolio performance
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      
      // Get the day change using the stock-price API
      const { dayChange, dayChangePercent } = await calculateTodaysChange(updatedInvestments);
      
      // Update the investment data state with fresh calculations
      setInvestmentData({
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        dayChange,
        dayChangePercent,
        lastUpdated: new Date().toISOString(),
        investments: updatedInvestments
      });
      
      // Update the fetched time
      setLastFetched(new Date());
    } catch (error) {
      // Silently handle errors in the background refresh
      console.error('Error updating investment prices:', error);
    }
  }

  // Add a helper function to format the last updated time in a relative format
  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Not available';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // First, add a new function to calculate total net worth (including retirement and stocks)
  const calculateNetWorth = () => {
    if (!assetData) return 0;
    
    // Calculate cash assets
    const cashAssets = assetData.cash + assetData.interest + assetData.checking;
    
    // Calculate investments (retirement + investment portfolio)
    const investmentsTotal = assetData.retirement401k + (loadingInvestments ? 0 : investmentData.totalValue);
    
    // Total net worth is cash + investments
    return cashAssets + investmentsTotal;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex flex-row gap-2">
          <Button
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Financial Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Biweekly Budget Status */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Biweekly Budget</h2>
            {loadingBudget ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
            ) : budgetSummary ? (
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(budgetSummary.totalRemaining)}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-300 mb-1">No data</p>
            )}
            {budgetSummary && (
              <p className="text-sm text-gray-500 mt-2">
                {`${formatCurrency(budgetSummary.totalSpent)} / ${formatCurrency(budgetSummary.totalAllocated)} spent`}
              </p>
            )}
          </div>
          
          {/* 2. Checking Balance */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Checking Balance</h2>
            {loading ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
            ) : assetData ? (
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(calculateRemainingBudget())}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-300 mb-1">No data</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Checking - Pending</p>
          </div>
          
          {/* 3. Investment Portfolio */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Investment Portfolio</h2>
            {loadingInvestments ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(investmentData.totalValue)}
                  </p>
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                    investmentData.totalGainLossPercent >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {investmentData.totalGainLossPercent >= 0 ? '+' : ''}
                    {investmentData.totalGainLossPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Total investment value
                </p>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total gain/loss:</span>
                    <span className={`text-base font-medium ${
                      investmentData.totalGainLoss >= 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(investmentData.totalGainLoss)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Today's change:</span>
                    <span className={`text-base font-medium ${
                      investmentData.dayChange >= 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(investmentData.dayChange)}
                      <span className="text-xs ml-1">
                        ({investmentData.dayChange >= 0 ? '+' : ''}
                        {investmentData.dayChangePercent.toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* 4. Next Pay Day (renamed from Projected Savings) */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-gray-500">Next Pay Day</h2>
              {nextPayDate && daysRemaining !== null && (
                <div className="text-sm text-blue-600 font-medium">
                  {format(nextPayDate, 'MMM d')} 
                  <span className="text-xs ml-1 text-gray-500">
                    ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'})
                  </span>
                </div>
              )}
            </div>
            
            {loading || loadingInvestments || loadingIncome || loadingBudget || loadingNextPayPeriodTransactions ? (
              <div className="space-y-3">
                <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="animate-pulse h-4 bg-gray-100 rounded w-1/2 mt-1"></div>
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className={`text-2xl font-bold ${calculateProjectedTotalSavings() >= 0 ? 'text-blue-600' : 'text-gray-600'} mb-1`}>
                  {formatCurrency(calculateProjectedTotalSavings())}
                </p>
                <p className="text-sm text-gray-500">Projected total after next pay</p>
                
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="text-sm text-gray-600">Next Pay Savings:</span>
                  <span className={`text-sm font-medium ${nextSavings && nextSavings >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                    {formatCurrency(nextSavings || 0)}
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* 5. Net Worth Card */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Net Worth</h2>
            {loading || loadingInvestments ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
            ) : assetData ? (
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(calculateNetWorth())}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-300 mb-1">No data</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Cash + 401k + Investments</p>
          </div>
          
          {/* 6. Credit Card Debt */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Credit Card Debt</h2>
            {loadingCreditCards ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {formatCurrency(calculateTotalCreditCardDebt())}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    {creditCards.filter(card => card.balance > 0).length} active cards
                  </p>
                  <p className="text-sm text-gray-500">
                    {calculateCreditUtilization(calculateTotalCreditCardDebt(), calculateTotalCreditLimit()).toFixed(0)}% used
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Asset Summary Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Totals</h2>
          
          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="animate-pulse h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="animate-pulse h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : assetData ? (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-medium text-gray-700">Savings</span>
                  {loading || loadingInvestments ? (
                    <div className="animate-pulse h-6 bg-gray-200 rounded w-28"></div>
                  ) : (
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(calculateActualTotalAssets())}
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mt-1">
                  {loading || loadingInvestments ? (
                    <div className="animate-pulse bg-gray-200 h-2.5 rounded-full w-full"></div>
                  ) : (
                    <div className="bg-blue-600 h-2.5 rounded-full w-full"></div>
                  )}
                </div>
              </div>
              
              {/* Sort accounts by amount in descending order */}
              {[
                {
                  name: 'Stocks',
                  amount: loadingInvestments ? 0 : investmentData.totalValue,
                  color: 'bg-blue-500',
                  loading: loadingInvestments,
                  order: 1
                },
                {
                  name: 'Cash',
                  amount: assetData.cash,
                  color: 'bg-blue-400',
                  loading: false,
                  order: 2
                },
                {
                  name: '401k',
                  amount: assetData.retirement401k,
                  color: 'bg-blue-600',
                  loading: false,
                  order: 3
                },
                {
                  name: 'Interest',
                  amount: assetData.interest,
                  color: 'bg-purple-400',
                  loading: false,
                  order: 4
                }
              ]
                .sort((a, b) => a.order - b.order)
                .map((account) => (
                  <div key={account.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base font-medium text-gray-700">{account.name}</span>
                      {account.loading ? (
                        <div className="animate-pulse h-6 bg-gray-200 rounded w-20"></div>
                      ) : (
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(account.amount)}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-1">
                      {account.loading ? (
                        <div className="animate-pulse bg-gray-200 h-2.5 rounded-full w-full"></div>
                      ) : (
                        <div 
                          className={`${account.color} h-2.5 rounded-full`} 
                          style={{ width: `${Math.min(100, (account.amount / calculateActualTotalAssets() * 100))}%` }}
                        ></div>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          ) : (
            <p className="text-base text-gray-400">No asset data available</p>
          )}
        </div>
      </div>
      
      {/* Account Details - Full Width */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Fund Accounts</h2>
          <Link 
            href="/assets" 
            className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            Update
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-40"></div>
            ))}
          </div>
        ) : assetData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Investing Funds */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-700">Available for Investing</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-3">
                {formatCurrency(calculateInvestmentFundsRemaining())}
              </p>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-1.5 bg-blue-500 rounded-full" 
                  style={{ 
                    width: `${calculateTotalFunds() > 0 ? 
                      Math.max(0, Math.min(100, (calculateInvestmentFundsRemaining() / (calculateInvestmentFundsRemaining() + calculateTotalFunds()) * 100))) : 0
                    }%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* House Fund */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-700">House Fund</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(assetData.houseFund || 0)}</p>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-1.5 bg-blue-500 rounded-full" 
                  style={{ 
                    width: `${calculateTotalFunds() > 0 ? 
                      Math.max(0, Math.min(100, ((assetData.houseFund || 0) / calculateTotalFunds() * 100))) : 0
                    }%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* Vacation Fund */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-700">Vacation Fund</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(assetData.vacationFund || 0)}</p>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-1.5 bg-blue-500 rounded-full" 
                  style={{ 
                    width: `${calculateTotalFunds() > 0 ? 
                      Math.max(0, Math.min(100, ((assetData.vacationFund || 0) / calculateTotalFunds() * 100))) : 0
                    }%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* Emergency Fund */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-700">Emergency Fund</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(assetData.emergencyFund || 0)}</p>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-1.5 bg-blue-500 rounded-full" 
                  style={{ 
                    width: `${calculateTotalFunds() > 0 ? 
                      Math.max(0, Math.min(100, ((assetData.emergencyFund || 0) / calculateTotalFunds() * 100))) : 0
                    }%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-6 text-gray-500">No data available</p>
        )}
      </div>
      
      {/* Credit Cards Section - REPLACE THIS ENTIRE SECTION */}
      {creditCards.filter(card => card.balance > 0).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Active Credit Cards</h2>
            <Link 
              href="/credit-cards" 
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium"
            >
              Manage All
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {creditCards
              .filter(card => card.balance > 0)
              .map(card => (
                <div 
                  key={card.id} 
                  className="flex items-center p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center mr-3" 
                    style={{ backgroundColor: card.color || '#CBD5E0' }}
                  >
                    <svg 
                      className="w-3 h-3 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-700">{card.name}</h3>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(card.balance)}</p>
                      <p className="text-xs text-gray-500">{calculateCreditUtilization(card.balance, card.limit).toFixed(1)}% used</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Budget Categories Section - With Biweekly Data */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Biweekly Budget by Category</h2>
          <Link 
            href="/budget" 
            className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            Manage Budget
          </Link>
        </div>
        
        {loadingBudget ? (
          <div className="space-y-3">
            <div className="animate-pulse h-16 bg-gray-100 rounded-lg w-full"></div>
            <div className="animate-pulse h-16 bg-gray-100 rounded-lg w-full"></div>
            <div className="animate-pulse h-16 bg-gray-100 rounded-lg w-full"></div>
          </div>
        ) : budgetCategories.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">No budget categories available</p>
            <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
              Set Up Budget Categories
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetCategories.map(category => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ backgroundColor: `${category.color}20` }}  
                  >
                    <span 
                      className="inline-block w-4 h-4 rounded-full" 
                      style={{ 
                        backgroundColor: category.color 
                      }}
                    ></span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-700">{category.name}</h3>
                </div>
                
                <p className="text-2xl font-bold text-blue-600 mb-3">
                  {formatCurrency(category.remaining)}
                </p>
                
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-2">
                  <div 
                    className="h-1.5 rounded-full" 
                    style={{ 
                      width: `${calculatePercentage(category.spent, category.allocatedAmount)}%`,
                      backgroundColor: category.color 
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{formatCurrency(category.spent)} spent</span>
                  <span>{formatCurrency(category.allocatedAmount)} budget</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Transactions moved to bottom */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
          <Link 
            href="/transactions" 
            className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            View All
          </Link>
        </div>
        
        {loadingTransactions ? (
          <div className="space-y-3">
            <div className="animate-pulse h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="animate-pulse h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="animate-pulse h-12 bg-gray-100 rounded-lg w-full"></div>
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">No recent transactions found</p>
            <Link href="/transactions/new" className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
              Record a Transaction
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recentTransactions.map(transaction => (
              <div key={transaction.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                      style={{ backgroundColor: transaction.category ? `${transaction.category.color}20` : '#CBD5E020' }}  
                    >
                      <span 
                        className="inline-block w-4 h-4 rounded-full" 
                        style={{ 
                          backgroundColor: transaction.category ? transaction.category.color : '#CBD5E0' 
                        }}
                      ></span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">{transaction.name}</h3>
                      <p className="text-xs text-gray-500">{formatTransactionDate(transaction.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(transaction.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.category ? transaction.category.name : 'Uncategorized'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6">
        <Link 
          href="/assets" 
          className="flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 hover:border-blue-100 hover:shadow-sm"
        >
          Update Assets
        </Link>
        <Link 
          href="/pay-settings" 
          className="flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 hover:border-blue-100 hover:shadow-sm"
        >
          Pay Schedule
        </Link>
        <Link 
          href="/budget" 
          className="flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 hover:border-blue-100 hover:shadow-sm"
        >
          Budget Categories
        </Link>
        <Link 
          href="/transactions" 
          className="flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 hover:border-blue-100 hover:shadow-sm"
        >
          Transactions
        </Link>
        <Link 
          href="/credit-cards" 
          className="flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 hover:border-blue-100 hover:shadow-sm"
        >
          Credit Cards
        </Link>
        <Link 
          href="/savings-plan" 
          className="flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 hover:border-blue-100 hover:shadow-sm"
        >
          Savings Plan
        </Link>
      </div>
    </div>
  );
} 