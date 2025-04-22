import BudgetManagement from '@/components/BudgetManagement';
import BudgetAnalysis from '@/components/BudgetAnalysis';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChartIcon } from '@/components/ui/icons';
import Link from 'next/link';

export default function BudgetPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-800">Budget Management</h1>
              <p className="text-gray-500 mt-1.5">Create and manage your budget categories and analyze spending patterns</p>
            </div>
            <div className="flex gap-2">
              <Link 
                href="/transactions" 
                className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium flex items-center"
              >
                <ChartIcon className="w-4 h-4 mr-1.5" />
                View Transactions
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Tabs defaultValue="analysis" className="w-full">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <TabsList className="inline-flex bg-gray-100 rounded-lg p-1 space-x-1">
                <TabsTrigger 
                  value="analysis" 
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Budget Analysis
                </TabsTrigger>
                <TabsTrigger 
                  value="categories" 
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Budget Categories
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="analysis" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="p-6">
                <BudgetAnalysis />
              </div>
            </TabsContent>
            
            <TabsContent value="categories" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="p-6">
                <BudgetManagement />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 