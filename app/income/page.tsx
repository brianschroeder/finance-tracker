'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarIcon, ClockIcon, CurrencyDollarIcon, DocumentCheckIcon, DocumentChartBarIcon, PresentationChartLineIcon, LightBulbIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface IncomeData {
  payAmount: number;
  payFrequency: PayFrequency;
  workHoursPerWeek: number;
  workDaysPerWeek: number;
  bonusPercentage: number;
}

// Define pay frequency types
type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

interface IncomeCalculations {
  hourlyRate: number;
  dailyPay: number;
  weeklyPay: number;
  monthlyIncome: number;
  yearlyIncome: number;
  yearlyBonus: number;
  totalYearlyCompensation: number;
}

interface RecurringTransaction {
  id: number;
  name: string;
  amount: number;
  dueDate: number;
  isEssential: boolean;
}

interface BudgetCategory {
  id: number;
  name: string;
  allocatedAmount: number;
  color: string;
  isActive: boolean;
}

export default function IncomePage() {
  // Form state
  const [payAmount, setPayAmount] = useState<number>(2500);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
  const [workHoursPerWeek, setWorkHoursPerWeek] = useState<number>(40);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState<number>(5);
  const [bonusPercentage, setBonusPercentage] = useState<number>(10);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Expense state
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState<number>(0);
  const [totalYearlyExpenses, setTotalYearlyExpenses] = useState<number>(0);
  const [yearlyRecurring, setYearlyRecurring] = useState<number>(0);
  const [yearlyBudget, setYearlyBudget] = useState<number>(0);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(true);
  
  // Calculation state
  const [calculations, setCalculations] = useState<IncomeCalculations>({
    hourlyRate: 0,
    dailyPay: 0,
    weeklyPay: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    yearlyBonus: 0,
    totalYearlyCompensation: 0
  });

  // Payment frequency mapping for calculations
  const paymentFrequencyMultipliers = {
    weekly: {
      weeksPerYear: 52,
      paymentsPerYear: 52,
      label: 'Weekly Pay'
    },
    biweekly: {
      weeksPerYear: 52,
      paymentsPerYear: 26,
      label: 'Biweekly Pay'
    },
    semimonthly: {
      weeksPerYear: 52,
      paymentsPerYear: 24,
      label: 'Semimonthly Pay'
    },
    monthly: {
      weeksPerYear: 52,
      paymentsPerYear: 12,
      label: 'Monthly Pay'
    }
  };

  // Fetch recurring transactions
  const fetchRecurringTransactions = async () => {
    try {
      const response = await fetch('/api/recurring-transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions');
      }
      const data = await response.json();
      setRecurringTransactions(data);
      
      // Calculate total monthly recurring expenses
      const totalRecurring = data.reduce((sum: number, transaction: RecurringTransaction) => 
        sum + transaction.amount, 0);
      
      return totalRecurring;
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      return 0;
    }
  };

  // Fetch budget categories
  const fetchBudgetCategories = async () => {
    try {
      const response = await fetch('/api/budget-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch budget categories');
      }
      const data = await response.json();
      setBudgetCategories(data.categories || []);
      
      // Return the total allocated amount
      return data.totalAllocated || 0;
    } catch (error) {
      console.error('Error loading budget categories:', error);
      return 0;
    }
  };

  // Load all expense data
  const loadExpenseData = async () => {
    setLoadingExpenses(true);
    try {
      const recurringTotal = await fetchRecurringTransactions();
      const budgetTotal = await fetchBudgetCategories();
      
      const monthlyTotal = recurringTotal + budgetTotal;
      setTotalMonthlyExpenses(monthlyTotal);
      setTotalYearlyExpenses(monthlyTotal * 12);
      
      // Set yearly amounts for individual categories
      setYearlyRecurring(recurringTotal * 12);
      setYearlyBudget(budgetTotal * 12);
    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Load saved data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch income data
        const response = await fetch('/api/income');
        
        if (!response.ok) {
          throw new Error('Failed to fetch saved data');
        }
        
        const data: IncomeData = await response.json();
        
        // Update state with saved values
        setPayAmount(data.payAmount || 2500);
        setPayFrequency(data.payFrequency || 'biweekly');
        setWorkHoursPerWeek(data.workHoursPerWeek);
        setWorkDaysPerWeek(data.workDaysPerWeek);
        setBonusPercentage(data.bonusPercentage);
        
        // Load expense data
        await loadExpenseData();
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate income metrics
  useEffect(() => {
    // Protect against division by zero
    if (workHoursPerWeek <= 0 || workDaysPerWeek <= 0) return;
    
    const { paymentsPerYear, weeksPerYear } = paymentFrequencyMultipliers[payFrequency];
    
    // Calculate yearly income based on payment frequency
    const yearlyIncome = payAmount * paymentsPerYear;
    
    // Calculate weekly pay
    const weeklyPay = yearlyIncome / weeksPerYear;
    
    // Calculate hourly and daily rates
    const hourlyRate = weeklyPay / workHoursPerWeek;
    const dailyPay = weeklyPay / workDaysPerWeek;
    
    // Extended calculations
    // For biweekly pay, calculate monthly as biweekly × 24/12 (2 payments per month)
    let monthlyIncome;
    if (payFrequency === 'biweekly') {
      monthlyIncome = payAmount * 2; // Simply 2 payments per month (24/12)
    } else if (payFrequency === 'weekly') {
      monthlyIncome = payAmount * (4); // Approximating 4 weeks per month
    } else {
      // For monthly and semimonthly, continue using the original calculation
      monthlyIncome = yearlyIncome / 12;
    }
    
    const yearlyBonus = yearlyIncome * (bonusPercentage / 100);
    const totalYearlyCompensation = yearlyIncome + yearlyBonus;
    
    setCalculations({
      hourlyRate,
      dailyPay,
      weeklyPay,
      monthlyIncome,
      yearlyIncome,
      yearlyBonus,
      totalYearlyCompensation
    });
  }, [payAmount, payFrequency, workHoursPerWeek, workDaysPerWeek, bonusPercentage]);

  // Save income data
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      const incomeData: IncomeData = {
        payAmount,
        payFrequency,
        workHoursPerWeek,
        workDaysPerWeek,
        bonusPercentage
      };
      
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomeData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save income data');
      }
      
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving income data:', error);
      setSaveError((error as Error).message || 'Failed to save income data');
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      {/* Header with navigation */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <span className="text-blue-600">Income Dashboard</span>
        </h1>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Info callout */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 mb-8 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <DocumentChartBarIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Income Analysis</h2>
            <p className="text-gray-700 text-sm">
              All calculations are based on post-tax income. For accurate results, enter your take-home pay after deductions and taxes.
            </p>
            {payFrequency === 'biweekly' && (
              <p className="text-gray-700 text-sm mt-2 border-t border-blue-100 pt-2">
                <span className="font-medium">Biweekly payment note:</span> Monthly calculations show 2 payments per month (24/year), while annual calculations account for all 26 payments received during the year.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Horizontal Income Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BanknotesIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Income Settings</h2>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 ${
              saving 
                ? 'bg-gray-200 text-gray-500' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } rounded-lg transition-all shadow-sm font-medium text-sm`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fadeIn">
            <div className="p-1 bg-green-100 rounded-full">
              <DocumentCheckIcon className="h-4 w-4 text-green-600" />
            </div>
            <span>Settings saved successfully!</span>
          </div>
        )}
        
        {saveError && (
          <div className="mb-6 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <div className="p-1 bg-blue-100 rounded-full">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>{saveError}</span>
          </div>
        )}
        
        {loading ? (
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-500" />
                <span>{paymentFrequencyMultipliers[payFrequency].label}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="pl-7 w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-900"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span>Pay Frequency</span>
              </label>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-900 appearance-none"
              >
                <option value="weekly">Weekly (52/year)</option>
                <option value="biweekly">Biweekly (26/year)</option>
                <option value="semimonthly">Semimonthly (24/year)</option>
                <option value="monthly">Monthly (12/year)</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="h-4 w-4 text-gray-500" />
                <span>Hours/Week</span>
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={workHoursPerWeek}
                onChange={(e) => setWorkHoursPerWeek(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-900"
                placeholder="40"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span>Days/Week</span>
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={workDaysPerWeek}
                onChange={(e) => setWorkDaysPerWeek(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-900"
                placeholder="5"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-gray-500" />
                <span>Bonus %</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={bonusPercentage}
                  onChange={(e) => setBonusPercentage(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-900"
                  placeholder="10"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Combined Income and Budget Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <PresentationChartLineIcon className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Income & Budget Analysis</h2>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {/* Hourly Rate */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <ClockIcon className="h-24 w-24 text-gray-500" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Hourly</span>
            <p className="mt-3 text-3xl font-bold text-gray-800">{formatCurrency(calculations.hourlyRate)}</p>
            <p className="mt-1 text-sm text-gray-600">per hour worked</p>
          </div>
          
          {/* Weekly Pay */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <CalendarIcon className="h-24 w-24 text-gray-500" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Weekly</span>
            <p className="mt-3 text-3xl font-bold text-gray-800">{formatCurrency(calculations.weeklyPay)}</p>
            <p className="mt-1 text-sm text-gray-600">per week</p>
          </div>
          
          {/* Monthly Income */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <BanknotesIcon className="h-24 w-24 text-gray-500" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Monthly</span>
            <p className="mt-3 text-3xl font-bold text-gray-800">{formatCurrency(calculations.monthlyIncome)}</p>
            <p className="mt-1 text-sm text-gray-600">per month</p>
            {payFrequency === 'biweekly' && (
              <p className="mt-1 text-xs text-blue-600">(based on 2 payments/month)</p>
            )}
          </div>
          
          {/* Required Hourly Rate */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <ClockIcon className="h-24 w-24 text-gray-500" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Required Hourly</span>
            <p className="mt-3 text-3xl font-bold text-gray-800">
              {loadingExpenses || workHoursPerWeek <= 0 
                ? "Loading..." 
                : formatCurrency((totalMonthlyExpenses * 12) / (workHoursPerWeek * 52))}
            </p>
            <p className="mt-1 text-sm text-gray-600">min to cover expenses</p>
          </div>
        </div>
        
        {/* Monthly Budget Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {/* Monthly Expenses */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">Monthly Expenses</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses ? "Loading..." : formatCurrency(totalMonthlyExpenses)}
            </p>
            <p className="mt-1 text-sm text-gray-600">combined costs</p>
          </div>
          
          {/* Monthly Savings */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Monthly Savings</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses 
                ? "Loading..." 
                : formatCurrency(calculations.monthlyIncome - totalMonthlyExpenses)}
            </p>
            <p className="mt-1 text-sm text-gray-600">after expenses</p>
          </div>
          
          {/* Recurring Expenses */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Recurring</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses ? "Loading..." : formatCurrency(yearlyRecurring / 12)}
            </p>
            <p className="mt-1 text-sm text-gray-600">fixed monthly costs</p>
          </div>
          
          {/* Budget Categories */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Budget</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses ? "Loading..." : formatCurrency(yearlyBudget / 12)}
            </p>
            <p className="mt-1 text-sm text-gray-600">variable spending</p>
          </div>
        </div>
        
        {/* Annual Compensation */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Base Salary</span>
                {payFrequency === 'biweekly' && (
                  <span className="text-xs text-blue-600">(26 payments/year)</span>
                )}
              </div>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(calculations.yearlyIncome)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-blue-400 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Annual Bonus ({bonusPercentage}%)</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(calculations.yearlyBonus)}</span>
            </div>
            
            <div className="h-px bg-gray-200 my-1"></div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-800">Total Compensation</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(calculations.totalYearlyCompensation)}</span>
            </div>
          </div>
        </div>
        
        {/* Annual metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Annual Expenses */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">Annual Expenses</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses ? "Loading..." : formatCurrency(totalYearlyExpenses)}
            </p>
            <p className="mt-1 text-sm text-gray-600">all expenses / year</p>
          </div>
          
          {/* Annual Savings */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Annual Savings</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses ? "Loading..." : formatCurrency(calculations.totalYearlyCompensation - totalYearlyExpenses)}
            </p>
            <p className="mt-1 text-sm text-gray-600">projected savings</p>
          </div>
          
          {/* Savings Rate */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5">
              <svg className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Savings Rate</span>
            <p className="mt-3 text-2xl font-bold text-gray-800">
              {loadingExpenses || calculations.totalYearlyCompensation === 0 
                ? "Loading..." 
                : `${Math.round(((calculations.totalYearlyCompensation - totalYearlyExpenses) / calculations.totalYearlyCompensation) * 100)}%`}
            </p>
            <p className="mt-1 text-sm text-gray-600">of total income</p>
          </div>
        </div>
      </div>
    </div>
  );
} 