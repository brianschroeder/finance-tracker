import BudgetManagement from '@/components/BudgetManagement';
import BudgetAnalysis from '@/components/BudgetAnalysis';
import { PageHeader, PagePanel, PageShell } from '@/components/PageShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calculator } from 'lucide-react';

export default function BudgetPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Planning"
        title="Budget"
        description="Review spendable budget and maintain the category plan."
        icon={<Calculator className="h-5 w-5" />}
      />

        <PagePanel>
          <Tabs defaultValue="analysis" className="w-full">
            <div className="border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6">
              <TabsList className="inline-flex rounded-lg bg-slate-100 p-1">
                <TabsTrigger
                  value="analysis"
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Categories
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analysis" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="p-5 sm:p-6">
                <BudgetAnalysis />
              </div>
            </TabsContent>

            <TabsContent value="categories" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="p-5 sm:p-6">
                <BudgetManagement />
              </div>
            </TabsContent>
          </Tabs>
        </PagePanel>
    </PageShell>
  );
}
