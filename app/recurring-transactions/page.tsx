import RecurringTransactionList from '@/components/RecurringTransactionList';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { AddTransactionButton } from '@/components/ui/add-transaction-button';
import Link from 'next/link';

export default function RecurringTransactionsPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Recurring Transactions</h1>
              <p className="text-gray-500 mt-1.5">
                Manage your monthly recurring bills, subscriptions, and other regular expenses
              </p>
            </div>
            <div className="flex gap-2">
              <AddTransactionButton />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <RecurringTransactionList />
        </div>
      </div>
    </div>
  );
} 