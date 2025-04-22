import PendingTransactionsList from '@/components/PendingTransactionsList';
import { ArrowLeftIcon, CalendarIcon } from '@/components/ui/icons';
import Link from 'next/link';

export default function PendingTransactionsPage() {
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pending Transactions</h1>
              <p className="text-gray-500 mt-1.5 max-w-2xl">
                Shows transactions that are due during your current pay period (from your last pay date to your next upcoming payday).
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center bg-blue-50 text-blue-600 px-4 py-2 rounded-lg">
              <CalendarIcon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Current Pay Period</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <PendingTransactionsList />
        </div>
      </div>
    </div>
  );
} 