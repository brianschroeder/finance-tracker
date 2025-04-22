'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noAutoRedirect = searchParams.get('noAutoRedirect') === 'true';
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState({
    assets: false,
    paySettings: false,
    income: false,
    budget: false,
    userSettings: false
  });

  // Check which data already exists
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        setLoading(true);
        
        // Check user settings
        const userSettingsResponse = await fetch('/api/user-settings');
        const userSettingsData = await userSettingsResponse.json();
        const hasUserSettings = !!userSettingsData?.name && userSettingsData.name !== 'User';
        
        // Check assets
        const assetsResponse = await fetch('/api/assets');
        const assetsData = await assetsResponse.json();
        const hasAssets = !!assetsData?.id;
        
        // Check pay settings
        const paySettingsResponse = await fetch('/api/pay-settings');
        const paySettingsData = await paySettingsResponse.json();
        const hasPaySettings = !!paySettingsData?.id;
        
        // Check income
        const incomeResponse = await fetch('/api/income');
        const incomeData = await incomeResponse.json();
        const hasIncome = !!incomeData?.id;
        
        // Check budget categories
        const budgetResponse = await fetch('/api/budget-categories');
        const budgetData = await budgetResponse.json();
        const hasBudget = budgetData && budgetData.categories && Array.isArray(budgetData.categories) && budgetData.categories.length > 0;
        
        setHasData({
          assets: hasAssets,
          paySettings: hasPaySettings,
          income: hasIncome,
          budget: hasBudget,
          userSettings: hasUserSettings
        });
        
        // Determine completed steps
        const completed = [];
        if (hasUserSettings) completed.push(1);
        if (hasPaySettings) completed.push(2);
        if (hasIncome) completed.push(3);
        if (hasAssets) completed.push(4);
        if (hasBudget) completed.push(5);
        
        setCompletedSteps(completed);
        
        // If everything is already set up, just redirect to the dashboard
        // But only if noAutoRedirect is false
        if (!noAutoRedirect && hasUserSettings && hasPaySettings && hasIncome && hasAssets && hasBudget) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkSetupStatus();
  }, [router, noAutoRedirect]);

  // Calculate completion percentage
  const calculateCompletion = () => {
    return (completedSteps.length / 5) * 100;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Setting up your finance tracker...</h2>
          <Progress value={50} className="w-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-blue-800">Welcome to Your Finance Tracker</CardTitle>
          <CardDescription className="text-blue-600">
            Let's set up your financial profile to get the most out of your dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Setup Progress</span>
              <span className="text-sm font-medium">{Math.round(calculateCompletion())}%</span>
            </div>
            <Progress value={calculateCompletion()} className="h-2" />
          </div>
          
          <div className="space-y-4">
            {/* Step 1: Personal Information */}
            <StepCard
              number={1}
              title="Personal Information"
              description="Tell us your name for a personalized experience"
              isCompleted={completedSteps.includes(1)}
              isActive={step === 1}
              onClick={() => setStep(1)}
            />
            
            {/* Step 2: Pay Schedule */}
            <StepCard
              number={2}
              title="Pay Schedule"
              description="Configure when you get paid and how frequently"
              isCompleted={completedSteps.includes(2)}
              isActive={step === 2}
              onClick={() => setStep(2)}
            />
            
            {/* Step 3: Income */}
            <StepCard
              number={3}
              title="Income Details"
              description="Add information about your income and work schedule"
              isCompleted={completedSteps.includes(3)}
              isActive={step === 3}
              onClick={() => setStep(3)}
            />
            
            {/* Step 4: Assets */}
            <StepCard
              number={4}
              title="Your Assets"
              description="Add details about your savings, checking, and investments"
              isCompleted={completedSteps.includes(4)}
              isActive={step === 4}
              onClick={() => setStep(4)}
            />
            
            {/* Step 5: Budget Categories */}
            <StepCard
              number={5}
              title="Budget Categories"
              description="Create categories to track your spending"
              isCompleted={completedSteps.includes(5)}
              isActive={step === 5}
              onClick={() => setStep(5)}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="text-sm text-gray-500">
            {completedSteps.length === 5 ? (
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                All steps completed!
              </span>
            ) : (
              <span className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Complete all steps for best results
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next Step
              </Button>
            ) : (
              <Button
                className={`flex items-center ${completedSteps.length < 5 ? 'bg-blue-400' : 'bg-blue-600'}`}
                onClick={() => router.push('/dashboard')}
              >
                {completedSteps.length === 5 ? 'Go to Dashboard' : 'Skip Remaining Steps'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {/* Step Content */}
      <div className="mt-8">
        {step === 1 && <PersonalInfoStep isCompleted={completedSteps.includes(1)} />}
        {step === 2 && <PayScheduleStep isCompleted={completedSteps.includes(2)} />}
        {step === 3 && <IncomeStep isCompleted={completedSteps.includes(3)} />}
        {step === 4 && <AssetsStep isCompleted={completedSteps.includes(4)} />}
        {step === 5 && <BudgetStep isCompleted={completedSteps.includes(5)} />}
      </div>
    </div>
  );
}

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  onClick: () => void;
}

function StepCard({ number, title, description, isCompleted, isActive, onClick }: StepCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : isCompleted
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full mr-4 ${
            isCompleted
              ? 'bg-green-500 text-white'
              : isActive
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {isCompleted ? <CheckCircle className="w-5 h-5" /> : number}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        {isCompleted && (
          <div className="ml-auto">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StepProps {
  isCompleted: boolean;
}

function PersonalInfoStep({ isCompleted }: StepProps) {
  const [userName, setUserName] = useState('');
  const [nameLoading, setNameLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [saveNameSuccess, setSaveNameSuccess] = useState(false);
  const [saveNameError, setSaveNameError] = useState<string | null>(null);

  // Fetch current user name
  useEffect(() => {
    async function fetchUserName() {
      try {
        const response = await fetch('/api/user-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.name && data.name !== 'User') {
            setUserName(data.name);
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      } finally {
        setNameLoading(false);
      }
    }
    
    fetchUserName();
  }, []);

  // Save user name
  const handleSaveName = async () => {
    if (!userName.trim()) return;
    
    try {
      setSavingName(true);
      setSaveNameSuccess(false);
      setSaveNameError(null);
      
      const response = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: userName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save name');
      }
      
      // Update localStorage
      localStorage.setItem('finance_tracker_username', userName);
      
      // Dispatch event to update components that use the user name
      const event = new CustomEvent('user-settings-updated', {
        detail: { name: userName }
      });
      window.dispatchEvent(event);
      
      setSaveNameSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveNameSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving user name:', error);
      setSaveNameError('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Tell us your name for a personalized experience</CardDescription>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <p>You've already set up your personal information. You can update it anytime.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              <p className="text-gray-600">
                Let's personalize your experience. What should we call you?
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    disabled={nameLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-sm"
                  />
                  
                  <Button 
                    disabled={!userName.trim() || savingName} 
                    onClick={handleSaveName}
                    className="whitespace-nowrap"
                  >
                    {savingName ? 'Saving...' : 'Save Name'}
                  </Button>
                </div>
                
                {saveNameSuccess && (
                  <p className="text-sm text-green-600">Name saved successfully!</p>
                )}
                
                {saveNameError && (
                  <p className="text-sm text-red-600">{saveNameError}</p>
                )}
              </div>
              
              <hr className="my-6 border-gray-200" />
              
              <p className="text-gray-600">
                Setting up your personal information helps us tailor your experience.
              </p>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/settings" passHref className="w-full">
          <Button className="w-full">{isCompleted ? 'Update Personal Information' : 'View Settings'}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function PayScheduleStep({ isCompleted }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay Schedule</CardTitle>
        <CardDescription>Configure when you get paid and how frequently</CardDescription>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <p>You've already set up your pay schedule. You can update it anytime.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Setting up your pay schedule helps track your finances between paychecks.
            </p>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-blue-800">Why this matters</h3>
              </div>
              <p className="text-sm text-blue-700">
                Knowing when you get paid helps us show you relevant information about upcoming bills, cash flow projections, and savings opportunities.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/pay-settings" passHref className="w-full">
          <Button className="w-full">{isCompleted ? 'Update Pay Schedule' : 'Set Up Pay Schedule'}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function IncomeStep({ isCompleted }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Details</CardTitle>
        <CardDescription>Add information about your income sources</CardDescription>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <p>You've already set up your income details. You can update them anytime.</p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">
            Adding your income information helps project future savings and budgeting.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/income" passHref className="w-full">
          <Button className="w-full">{isCompleted ? 'Update Income Details' : 'Set Up Income Details'}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function AssetsStep({ isCompleted }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
        <CardDescription>Add your current financial assets</CardDescription>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <p>You've already set up your assets. You can update them anytime.</p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">
            Adding your current assets helps track your net worth and financial growth over time.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/assets" passHref className="w-full">
          <Button className="w-full">{isCompleted ? 'Update Assets' : 'Set Up Assets'}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function BudgetStep({ isCompleted }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Categories</CardTitle>
        <CardDescription>Create categories for tracking your spending</CardDescription>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <p>You've already set up your budget categories. You can update them anytime.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Creating budget categories helps you allocate and track spending across different areas.
            </p>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-blue-800">Why budget categories matter</h3>
              </div>
              <p className="text-sm text-blue-700">
                Budget categories let you allocate specific amounts for different expenses like groceries, entertainment, and utilities. This helps you set spending limits and track where your money is going each month.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/budget" passHref className="w-full">
          <Button className="w-full">{isCompleted ? 'Update Budget Categories' : 'Set Up Budget Categories'}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 