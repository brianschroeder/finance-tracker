import PaySettingsForm from '@/components/PaySettingsForm';
import { ArrowLeftIcon } from '@/components/ui/icons';
import Link from 'next/link';

export default function PaySettingsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Pay Schedule Settings</h1>
          <p className="text-gray-500">Configure your pay frequency and dates to better track your financial timeline</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <PaySettingsForm />
        </div>
      </div>
    </div>
  );
} 