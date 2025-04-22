'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';

interface IncomeEntry {
  id?: number;
  source: string;
  amount: number;
  date: string;
  is_recurring: boolean;
  frequency?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export default function IncomeEntries() {
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncomeEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/income-entries');
      if (!response.ok) {
        throw new Error('Failed to fetch income entries');
      }
      
      const data = await response.json();
      setIncomeEntries(data.entries);
      setTotalIncome(data.total);
    } catch (error) {
      console.error('Error fetching income entries:', error);
      setError('Failed to load income entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeEntries();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Income Entries</CardTitle>
          <CardDescription>View and manage your income sources</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchIncomeEntries}>
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Income
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">Loading income entries...</div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : incomeEntries.length === 0 ? (
          <div className="text-center p-4">
            <p className="text-muted-foreground">No income entries found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Import data or add income entries manually
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-green-800 dark:text-green-200">
                Total Income: <span className="font-bold">{formatCurrency(totalIncome)}</span>
              </p>
            </div>
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeEntries.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-3">{formatDate(entry.date)}</td>
                      <td className="p-3 font-medium">{entry.source}</td>
                      <td className="p-3">{formatCurrency(entry.amount)}</td>
                      <td className="p-3">
                        {entry.is_recurring ? 
                          `Recurring (${entry.frequency || 'Not specified'})` : 
                          'One-time'}
                      </td>
                      <td className="p-3 max-w-[200px] truncate">{entry.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 