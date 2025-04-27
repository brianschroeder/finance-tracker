import RecurringCategoryList from '@/components/RecurringCategoryList';
import { ArrowLeftIcon } from '@/components/ui/icons';
import Link from 'next/link';

export default function RecurringCategoriesPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/recurring-transactions" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Recurring Transactions
          </Link>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Recurring Transaction Categories</h1>
              <p className="text-gray-500 mt-1.5">
                Create and manage categories for organizing your recurring transactions
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <RecurringCategoryList />
        </div>
      </div>
    </div>
  );
} 