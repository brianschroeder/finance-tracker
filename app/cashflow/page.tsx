'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BudgetAlignmentPanel from '@/components/BudgetAlignmentPanel';
import CompensationForm from '@/components/CompensationForm';
import PaySettingsForm from '@/components/PaySettingsForm';
import PendingTransactionsList from '@/components/PendingTransactionsList';
import RecurringBillsChart from '@/components/RecurringBillsChart';
import RecurringTransactionList from '@/components/RecurringTransactionList';
import { PageHeader, PagePanel, PageShell } from '@/components/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RecurringTransaction } from '@/lib/db';
import { AddTransactionButton } from '@/components/ui/add-transaction-button';
import { CalendarClock, ReceiptText } from 'lucide-react';

export default function CashflowPage() {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(true);
  const [recurringError, setRecurringError] = useState('');

  const fetchRecurringTransactions = async () => {
    try {
      setLoadingRecurring(true);
      setRecurringError('');
      const response = await fetch('/api/recurring-transactions');
      if (!response.ok) throw new Error('Failed to fetch recurring transactions');
      setRecurringTransactions(await response.json());
    } catch (error) {
      setRecurringError(error instanceof Error ? error.message : 'Failed to load recurring transactions');
    } finally {
      setLoadingRecurring(false);
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, []);

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        eyebrow="Cashflow"
        title="Reconcile Checking"
        description="Keep checking, bills, tips, cashback, and the spendable budget aligned."
        icon={<CalendarClock className="h-5 w-5" />}
        actions={(
          <>
            <AddTransactionButton />
            <Link
              href="/transactions"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ReceiptText className="mr-1.5 h-4 w-4" />
              Transactions
            </Link>
          </>
        )}
      />

      <BudgetAlignmentPanel />

      <PagePanel>
        <Tabs defaultValue="pending" className="w-full">
          <div className="border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-lg bg-slate-100 p-1 lg:inline-flex lg:w-auto">
              <TabsTrigger value="pending">Bills</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="pay">Pay Schedule</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending" className="p-0">
            <PendingTransactionsList />
          </TabsContent>

          <TabsContent value="recurring" className="space-y-5 p-5 sm:p-6">
            {recurringError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {recurringError}
              </div>
            )}
            {loadingRecurring ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-slate-500" />
              </div>
            ) : (
              <>
                <RecurringBillsChart
                  transactions={recurringTransactions}
                  onTransactionsUpdate={fetchRecurringTransactions}
                />
                <RecurringTransactionList
                  initialTransactions={recurringTransactions}
                  onTransactionsUpdate={fetchRecurringTransactions}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="pay" className="p-0">
            <PaySettingsForm />
          </TabsContent>

          <TabsContent value="compensation" className="p-0">
            <CompensationForm />
          </TabsContent>
        </Tabs>
      </PagePanel>
    </PageShell>
  );
}
