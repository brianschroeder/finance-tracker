'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { format, addWeeks, differenceInDays } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import GroupedTransactions from './GroupedTransactions';

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
  pending?: boolean;
  pendingTipAmount?: number;
  cashBack?: number;
  cashbackPosted?: boolean;
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
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [checkingBalance, setCheckingBalance] = useState<number | undefined>(undefined);
  
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

  // Define variables to track different types of pending amounts
  const [pendingTransactionAmount, setPendingTransactionAmount] = useState(0);
  const [pendingTipAmount, setPendingTipAmount] = useState(0);
  const [pendingCashbackAmount, setPendingCashbackAmount] = useState(0);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);

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

  // Fetch latest assets and set checking balance
  useEffect(() => {
    async function fetchLatestAssets() {
      try {
        setLoadingAccounts(true);
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
        
        // Calculate checking balance minus all pending amounts
        setCheckingBalance((data.checking || 0) - totalPendingAmount);
        
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
        setLoadingAccounts(false);
      }
    }
    
    fetchLatestAssets();
  }, [totalPendingAmount]);

  // Update total pending amount whenever any pending amount changes
  useEffect(() => {
    // Sum of pending transaction tips and recurring pending transactions, minus pending cashback
    // because cashback is money coming back to the account
    const total = pendingTipAmount + pendingTransactionAmount - pendingCashbackAmount;
    setTotalPendingAmount(total);
    setPendingOnlyAmount(total); // Keep this for backward compatibility
  }, [pendingTipAmount, pendingTransactionAmount, pendingCashbackAmount]);
  
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

  // Fetch pending transactions (recurring expenses)
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
          
          // Calculate the pending-only total from recurring transactions
          const pendingOnlyTotal = pendingOnly.reduce((sum: number, t: PendingTransaction) => sum + t.amount, 0);
          
          setPendingTransactions(data.transactions || []);
          setPendingTotal(data.totalAmount || 0);
          setPendingTransactionAmount(pendingOnlyTotal);
          
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
  
  // Fetch recent transactions
  useEffect(() => {
    fetchRecentTransactions();
  }, [assetData]);
  
  // Updated function to fetch recent transactions and calculate pending amount
  async function fetchRecentTransactions() {
    try {
      setLoadingTransactions(true);
      const response = await fetch('/api/transactions?limit=5');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent transactions');
      }
      
      const data = await response.json();
      
      if (data.transactions) {
        setRecentTransactions(data.transactions);
        
        // Calculate only pending tip amounts from regular transactions
        const pendingTips = data.transactions
          .filter((transaction: Transaction) => transaction.pending)
          .reduce((sum: number, transaction: Transaction) => 
            sum + (transaction.pendingTipAmount || 0), 0);
        
        // Calculate pending cashback amounts (cashback that has not been posted yet)
        const pendingCashback = data.transactions
          .filter((transaction: Transaction) => 
            (transaction.cashBack || 0) > 0 && transaction.cashbackPosted === false)
          .reduce((sum: number, transaction: Transaction) => 
            sum + (transaction.cashBack || 0), 0);
        
        // Update the pending amount states
        setPendingTipAmount(pendingTips);
        setPendingCashbackAmount(pendingCashback);
      }
    } catch (err) {
      console.error('Error fetching recent transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }
  
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
          totalAdjustedSpent: 0,
          totalRemaining: 0,
          totalPendingTipAmount: 0,
          totalPendingCashbackAmount: 0,
          startDate: '',
          endDate: '',
          daysInPeriod: 0,
          periodType: 'biweekly'
        });
      } finally {
        setLoadingBudget(false);
      }
    }
    
    // Initial fetch
    fetchBudgetData();
    
    // Set up event listener for transaction updates
    const handleTransactionsChanged = () => {
      fetchBudgetData();
    };
    
    // Add event listener
    window.addEventListener('transactionsChanged', handleTransactionsChanged);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('transactionsChanged', handleTransactionsChanged);
    };
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
    // Use the budget without pending cashback adjustments
    return calculateBudgetWithoutPendingCashback() / daysRemaining;
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

  // Calculate remaining budget (checking balance minus all pending amounts)
  const calculateRemainingBudget = () => {
    if (!assetData) return 0;
    return assetData.checking - totalPendingAmount;
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
    
    // Calculate cash assets (excluding checking)
    const cashAssets = assetData.cash + assetData.interest;
    
    // Calculate investments (retirement + investment portfolio)
    const investmentsTotal = assetData.retirement401k + (loadingInvestments ? 0 : investmentData.totalValue);
    
    // Total net worth is cash + investments (excluding checking)
    return cashAssets + investmentsTotal;
  };

  // Calculate the budget remaining without considering pending cashback
  const calculateBudgetWithoutPendingCashback = () => {
    if (!budgetSummary) return 0;
    // Start with the allocated amount
    const allocated = budgetSummary.totalAllocated;
    // Use totalSpent (which doesn't include cashback adjustment) plus any pending tips
    const spent = budgetSummary.totalSpent + (budgetSummary.totalPendingTipAmount || 0);
    // Return allocated minus spent (without cashback adjustment)
    return allocated - spent;
  };

  // Add a function to calculate net worth (savings minus debt)
  const calculateNetWorthWithDebt = () => {
    if (!assetData) return { netWorth: 0, totalSavings: 0, totalDebt: 0 };
    
    // Calculate total savings (cash + interest + investments)
    const totalSavings = calculateActualTotalAssets();
    
    // Calculate total debt (credit card debt)
    const totalDebt = calculateTotalCreditCardDebt();
    
    // Net worth is savings minus debt
    const netWorth = totalSavings - totalDebt;
    
    return { netWorth, totalSavings, totalDebt };
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
      
      {/* Financial Overview Section */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Biweekly Budget Status */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-400"></div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800">Biweekly Budget</span>
              </div>
              {loadingBudget ? (
                <div className="animate-pulse h-8 bg-gray-100 rounded w-3/4"></div>
              ) : budgetSummary ? (
                <p className={`text-2xl font-bold ${calculateBudgetWithoutPendingCashback() >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {calculateBudgetWithoutPendingCashback() >= 0 ? '' : '-'}{formatCurrency(Math.abs(calculateBudgetWithoutPendingCashback()))}
                </p>
              ) : (
                <p className="text-2xl font-bold text-gray-300">No data</p>
              )}
              {budgetSummary && (
                <p className="text-xs text-gray-500 mt-2">
                  {`${formatCurrency(budgetSummary.totalSpent + (budgetSummary.totalPendingTipAmount || 0))} / ${formatCurrency(budgetSummary.totalAllocated)} spent`}
                </p>
              )}
              {/* Note about pending cashback removed */}
            </div>
          </div>
          
          {/* Checking Balance */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-500"></div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800">Checking Balance</span>
              </div>
              {loadingAccounts ? (
                <div className="animate-pulse h-8 bg-gray-100 rounded w-3/4"></div>
              ) : checkingBalance !== undefined ? (
                <>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(checkingBalance)}</p>
                  {totalPendingAmount > 0 && (
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-600 flex items-center">
                          <span className="mr-1 w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                          Pending total:
                        </span>
                        <span className="font-medium text-blue-600">{formatCurrency(totalPendingAmount)}</span>
                      </div>
                      
                      {/* Show the breakdown of pending amounts */}
                      {pendingTransactionAmount > 0 && (
                        <div className="flex items-center justify-between pl-4 mt-1">
                          <span className="text-gray-600">Recurring pending:</span>
                          <span className="text-gray-600">{formatCurrency(pendingTransactionAmount)}</span>
                        </div>
                      )}
                      {pendingTipAmount > 0 && (
                        <div className="flex items-center justify-between pl-4 mt-1">
                          <span className="text-gray-600">Checking pending:</span>
                          <span className="text-gray-600">{formatCurrency(pendingTipAmount)}</span>
                        </div>
                      )}
                      {pendingCashbackAmount > 0 && (
                        <div className="flex items-center justify-between pl-4 mt-1">
                          <span className="text-gray-600">Pending cashback:</span>
                          <span className="text-gray-600">+{formatCurrency(pendingCashbackAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-2xl font-bold text-gray-300">No data</p>
              )}
            </div>
          </div>
          
          {/* Net Worth Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-700 to-blue-600"></div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 text-blue-800 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800">Total Savings </span>
              </div>
              {loading || loadingInvestments || loadingCreditCards ? (
                <div className="animate-pulse h-8 bg-gray-100 rounded w-3/4"></div>
              ) : assetData ? (
                <>
                  <p className={`text-2xl font-bold mb-1 ${calculateNetWorthWithDebt().netWorth >= 0 ? 'text-blue-800' : 'text-purple-600'}`}>
                    {formatCurrency(calculateNetWorthWithDebt().netWorth)}
                  </p>
                  
                  {/* Breakdown similar to checking balance */}
                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 flex items-center">
                        <span className="mr-1 w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        Total Savings:
                      </span>
                      <span className="font-medium text-blue-600">{formatCurrency(calculateNetWorthWithDebt().totalSavings)}</span>
                    </div>
                    
                    {/* Show debt if it exists */}
                    {calculateNetWorthWithDebt().totalDebt > 0 && (
                      <div className="flex items-center justify-between pl-4 mt-1">
                        <span className="text-purple-600">Total Debt:</span>
                        <span className="text-purple-600">-{formatCurrency(calculateNetWorthWithDebt().totalDebt)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-2xl font-bold text-gray-300 mb-1">No data</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Investment Portfolio Section */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Investment Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-600 to-green-500"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-700 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-800">Portfolio Value</span>
                </div>
                <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                  investmentData.totalGainLossPercent >= 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {investmentData.totalGainLossPercent >= 0 ? '+' : ''}
                  {investmentData.totalGainLossPercent.toFixed(1)}%
                </span>
              </div>
              {loadingInvestments ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
              ) : (
                <p className="text-2xl font-bold text-green-700 mb-3">
                  {formatCurrency(investmentData.totalValue)}
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Total gain/loss</span>
                  <span className={`text-base font-semibold ${
                    investmentData.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(investmentData.totalGainLoss)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Today's change</span>
                  <span className={`text-base font-semibold ${
                    investmentData.dayChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(investmentData.dayChange)}
                    <span className="text-xs ml-1">
                      ({investmentData.dayChange >= 0 ? '+' : ''}
                      {investmentData.dayChangePercent.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Investing Funds Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-500 to-green-400"></div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800">Investing Funds</span>
              </div>
              
              {loading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
              ) : (
                <p className="text-2xl font-bold text-green-600 mb-3">
                  {formatCurrency(calculateInvestmentFundsRemaining())}
                </p>
              )}
              
              <p className="text-xs text-gray-500 mt-2">Available funds for investing</p>
            </div>
          </div>
          
          {/* Next Pay Day Info */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-green-300"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-500 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-800">Next Pay Day</span>
                </div>
                {nextPayDate && daysRemaining !== null && (
                  <div className="text-sm font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {format(nextPayDate, 'MMM d')} 
                    <span className="text-xs ml-1">
                      ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'})
                    </span>
                  </div>
                )}
              </div>
              
              {loading || loadingInvestments || loadingIncome || loadingBudget || loadingNextPayPeriodTransactions ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
              ) : (
                <>
                  <p className={`text-2xl font-bold ${calculateProjectedTotalSavings() >= 0 ? 'text-green-500' : 'text-gray-600'} mb-3`}>
                    {formatCurrency(calculateProjectedTotalSavings())}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">Projected total after next pay</p>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Next Pay Savings:</span>
                    <span className={`text-sm font-medium ${nextSavings && nextSavings >= 0 ? 'text-green-500' : 'text-gray-600'}`}>
                      {formatCurrency(nextSavings || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Account Summaries Section */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Account Totals</h2>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="animate-pulse h-6 bg-gray-200 rounded w-2/3"></div>
          </div>
        ) : assetData ? (
          <div className="space-y-5">
            {/* Net Worth Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="space-y-1 mb-4">
                <h3 className="text-sm font-medium text-gray-500">Net Worth</h3>
                {loading || loadingInvestments ? (
                  <div className="animate-pulse h-8 bg-gray-100 rounded w-40"></div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(calculateNetWorth())}
                    </span>
                    <span className="text-sm text-gray-500">total</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Cash & Interest</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">401k & Investments</span>
                </div>
              </div>
            </div>
            
            {/* Account Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  name: 'Stocks',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ),
                  amount: loadingInvestments ? 0 : investmentData.totalValue,
                  color: 'from-blue-500 to-blue-400',
                  bgLight: 'bg-blue-100',
                  textColor: 'text-blue-600',
                  loading: loadingInvestments
                },
                {
                  name: 'Cash',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ),
                  amount: assetData.cash,
                  color: 'from-green-500 to-green-400',
                  bgLight: 'bg-green-100',
                  textColor: 'text-green-600',
                  loading: false
                },
                {
                  name: '401k',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  amount: assetData.retirement401k,
                  color: 'from-indigo-500 to-indigo-400',
                  bgLight: 'bg-indigo-100',
                  textColor: 'text-indigo-600',
                  loading: false
                },
                {
                  name: 'Interest',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  amount: assetData.interest,
                  color: 'from-purple-500 to-purple-400',
                  bgLight: 'bg-purple-100', 
                  textColor: 'text-purple-600',
                  loading: false
                }
              ]
                .sort((a, b) => b.amount - a.amount)
                .map((account) => (
                  <div key={account.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${account.color}`}></div>
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-full ${account.bgLight} ${account.textColor}`}>
                          {account.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{account.name}</span>
                      </div>
                      
                      {account.loading ? (
                        <div className="animate-pulse h-7 bg-gray-200 rounded w-28"></div>
                      ) : (
                        <span className={`text-2xl font-bold block ${account.textColor}`}>
                          {formatCurrency(account.amount)}
                        </span>
                      )}
                      
                      <div className="mt-4 pt-2 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {calculateNetWorth() > 0 
                            ? `${(account.amount / calculateNetWorth() * 100).toFixed(1)}%` 
                            : '0%'}
                        </span>
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full bg-gradient-to-r ${account.color}`} 
                            style={{ width: `${Math.min(100, (account.amount / calculateNetWorth() * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          <p className="text-base text-gray-400">No asset data available</p>
        )}
      </div>
      
      {/* Credit Card & Funds Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credit Card Summary */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Credit Card Debt</h2>
          {loadingCreditCards ? (
            <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4"></div>
          ) : (
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <p className="text-2xl font-bold text-blue-600 mb-3">
                {formatCurrency(calculateTotalCreditCardDebt())}
              </p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {creditCards.filter(card => card.balance > 0).length} active cards
                </p>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCreditUtilizationColor(calculateCreditUtilization(calculateTotalCreditCardDebt(), calculateTotalCreditLimit())) }}></div>
                  <p className="text-sm text-gray-600">
                    {calculateCreditUtilization(calculateTotalCreditCardDebt(), calculateTotalCreditLimit()).toFixed(0)}% used
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Fund Accounts */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Fund Accounts</h2>
            <Link 
              href="/assets" 
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium"
            >
              Update
            </Link>
          </div>
          
          {loading ? (
            <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>
          ) : assetData ? (
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  name: "House Fund",
                  amount: assetData.houseFund || 0,
                  icon: (
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )
                },
                {
                  name: "Vacation Fund",
                  amount: assetData.vacationFund || 0,
                  icon: (
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  name: "Emergency Fund",
                  amount: assetData.emergencyFund || 0,
                  icon: (
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                }
              ].map((fund) => (
                <div key={fund.name} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      {fund.icon}
                    </div>
                    <h3 className="text-sm font-medium text-gray-700">{fund.name}</h3>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(fund.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base text-gray-400">No data available</p>
          )}
        </div>
      </div>
      
      {/* Spending by Vendor - Keep as is */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Spending By Vendor</h2>
        </div>
        <GroupedTransactions />
      </div>
      
      {/* Recent Transactions - Keep as is */}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3 mb-6">
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