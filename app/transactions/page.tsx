import PageTitle from '@/components/PageTitle';
import TransactionsList from '@/components/TransactionsList';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { PlusIcon, CreditCardIcon } from '@/components/ui/icons';
import Link from 'next/link';

export default function TransactionsPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-gray-500 mt-1.5">View and manage all your financial transactions</p>
            </div>
            <div className="flex gap-2">
              <Link 
                href="/transactions/new" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium inline-flex items-center hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" />
                New Transaction
              </Link>
              <Link 
                href="/budget" 
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium inline-flex items-center hover:bg-blue-100 transition-colors"
              >
                <CreditCardIcon className="w-4 h-4 mr-1.5" />
                Budget
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <TransactionsList />
        </div>
      </div>
    </div>
  );
} 