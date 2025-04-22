'use client';

import { useState, useEffect } from 'react';
import { format, addDays, addWeeks, differenceInDays } from 'date-fns';

interface PaySettingsInputs {
  lastPayDate: string;
  frequency: 'weekly' | 'biweekly';
}

// Helper function to format dates consistently in YYYY-MM-DD format (timezone neutral)
const formatDateToYYYYMMDD = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper function to consistently format dates for display
const formatDisplayDate = (date: Date) => {
  return format(date, 'MMMM d, yyyy');
};

export default function PaySettingsForm() {
  const [paySettings, setPaySettings] = useState<PaySettingsInputs>({
    lastPayDate: formatDateToYYYYMMDD(new Date()),
    frequency: 'biweekly'
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [advancePayDate, setAdvancePayDate] = useState(false);
  
  // Calculated fields
  const [nextPayDate, setNextPayDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [missedPayday, setMissedPayday] = useState(false);
  
  // Helper function to parse YYYY-MM-DD string to Date without timezone issues
  const parseYYYYMMDD = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Fetch current pay settings on component mount
  useEffect(() => {
    async function fetchPaySettings() {
      try {
        const response = await fetch('/api/pay-settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch pay settings');
        }
        
        const data = await response.json();
        
        // Only update if we have data
        if (data && data.id) {
          setPaySettings({
            lastPayDate: data.lastPayDate,
            frequency: data.frequency
          });
        }
      } catch (err) {
        console.error('Error fetching pay settings:', err);
        // We don't show an error for initial fetch
      } finally {
        setLoading(false);
      }
    }
    
    fetchPaySettings();
  }, []);
  
  // Calculate next pay date and days remaining whenever pay settings change
  useEffect(() => {
    if (!paySettings.lastPayDate) return;
    
    // Parse date using our helper to avoid timezone issues
    const lastPayDate = parseYYYYMMDD(paySettings.lastPayDate);
    
    // Calculate next pay date based on frequency
    let nextDate: Date;
    
    // Get current date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Initial calculation of next pay date
    if (paySettings.frequency === 'weekly') {
      nextDate = addWeeks(lastPayDate, 1);
    } else {
      nextDate = addWeeks(lastPayDate, 2); // biweekly
    }

    // Check if we missed a payday (next calculated date is in the past)
    const missedPaymentDetected = nextDate <= today;
    setMissedPayday(missedPaymentDetected);
    
    // If next date is in the past, keep adding pay periods until we get a future date
    while (nextDate <= today) {
      if (paySettings.frequency === 'weekly') {
        nextDate = addWeeks(nextDate, 1);
      } else {
        nextDate = addWeeks(nextDate, 2);
      }
    }
    
    // If the user is indicating they want to advance the pay date
    // because they got paid but didn't update the system
    if (advancePayDate && missedPaymentDetected) {
      // Find the most recent pay date that would have occurred
      let updatedLastPayDate = lastPayDate;
      let nextPaymentDate;
      
      if (paySettings.frequency === 'weekly') {
        nextPaymentDate = addWeeks(updatedLastPayDate, 1);
      } else {
        nextPaymentDate = addWeeks(updatedLastPayDate, 2);
      }
      
      // Find the most recent pay date before today
      while (nextPaymentDate <= today) {
        updatedLastPayDate = new Date(nextPaymentDate);
        if (paySettings.frequency === 'weekly') {
          nextPaymentDate = addWeeks(updatedLastPayDate, 1);
        } else {
          nextPaymentDate = addWeeks(updatedLastPayDate, 2);
        }
      }
      
      // Update last pay date to the most recent one
      setPaySettings(prev => ({
        ...prev,
        lastPayDate: formatDateToYYYYMMDD(updatedLastPayDate)
      }));
      
      // Reset the flag after applying the update
      setAdvancePayDate(false);
      
      // Update the next pay date for display
      nextDate = nextPaymentDate;
    }
    
    setNextPayDate(nextDate);
    setDaysRemaining(differenceInDays(nextDate, today));
  }, [paySettings.lastPayDate, paySettings.frequency, advancePayDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setPaySettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdvancePayDate = () => {
    setAdvancePayDate(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/pay-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paySettings),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save pay settings');
      }
      
      // Show success message immediately
      setSubmitted(true);
      
      // Create and dispatch a custom event to notify the dashboard that pay settings changed
      const paySettingsEvent = new CustomEvent('paySettingsChanged', { 
        detail: paySettings 
      });
      window.dispatchEvent(paySettingsEvent);
      
      // More thorough refresh approach - trigger multiple endpoints to ensure all data is refreshed
      // Add a unique timestamp to bypass caching completely
      const timestamp = new Date().getTime();
      await Promise.all([
        fetch(`/api/pending-transactions?t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`/api/recurring-transactions?t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`/api/income?t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      ]);
      
      // Force hard reload after a short delay to ensure the server has time to update
      setTimeout(() => {
        // Use location.href with a cache-busting query parameter
        window.location.href = window.location.pathname + '?refresh=' + timestamp;
      }, 500);
      
    } catch (err) {
      console.error('Error submitting pay settings:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6">
        {submitted && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-5 py-4 rounded-lg shadow-sm mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-1.5">
                <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Your pay settings have been saved successfully!</p>
              </div>
            </div>
          </div>
        )}
      
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 px-5 py-4 rounded-lg shadow-sm mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-1.5">
                <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Pay Schedule Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Configure your pay frequency and dates to better track your financial timeline</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="relative">
              <label htmlFor="lastPayDate" className="block text-sm font-medium text-gray-700 mb-1">
                Last Pay Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="date"
                  id="lastPayDate"
                  name="lastPayDate"
                  value={paySettings.lastPayDate}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                  required
                />
              </div>
            </div>
            
            <div className="relative">
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Pay Frequency
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <select
                  id="frequency"
                  name="frequency"
                  value={paySettings.frequency}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                </select>
              </div>
            </div>
          </div>
          
          {missedPayday && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg overflow-hidden shadow-sm">
              <div className="p-5">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5">
                    <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-md font-semibold text-gray-800 mb-1">Payment Update Available</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      It looks like you may have received a payment since your last update.
                      Would you like to sync your payment schedule?
                    </p>
                    <button
                      type="button"
                      onClick={handleAdvancePayDate}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent 
                                text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r 
                                from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                transition-all duration-200"
                    >
                      <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Update Payment Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {nextPayDate && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Next Pay Date</h3>
                    <p className="text-xl font-semibold text-gray-800 mt-1">
                      {formatDisplayDate(nextPayDate)}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Days Remaining</h3>
                    <div className="flex items-center mt-1">
                      <div className="bg-blue-100 h-8 w-8 rounded-full flex items-center justify-center mr-2">
                        <span className="text-blue-800 font-bold">{daysRemaining}</span>
                      </div>
                      <span className="text-gray-800">{daysRemaining === 1 ? 'day' : 'days'} until next payment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md 
                        shadow-sm text-white transition-all duration-200 ${
                submitting ? 'bg-blue-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Pay Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 