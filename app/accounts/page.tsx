'use client';

import Link from 'next/link';
import AssetForm from '@/components/AssetForm';
import FundAccountsManagement from '@/components/FundAccountsManagement';
import InvestmentsList from '@/components/InvestmentsList';
import { PageHeader, PagePanel, PageShell } from '@/components/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Plus, WalletCards } from 'lucide-react';

export default function AccountsPage() {
  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        eyebrow="Accounts"
        title="Accounts"
        description="Update balances, savings buckets, investments, and card debt from one place."
        icon={<WalletCards className="h-5 w-5" />}
        actions={(
          <>
            <Link
              href="/investments/new"
              className="inline-flex items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Investment
            </Link>
            <Link
              href="/credit-cards"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <CreditCard className="mr-1.5 h-4 w-4" />
              Cards
            </Link>
          </>
        )}
      />

      <PagePanel>
        <Tabs defaultValue="balances" className="w-full">
          <div className="border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex sm:w-auto">
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="funds">Funds</TabsTrigger>
              <TabsTrigger value="investments">Investments</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="balances" className="p-5 sm:p-6">
            <AssetForm />
          </TabsContent>

          <TabsContent value="funds" className="p-5 sm:p-6">
            <FundAccountsManagement />
          </TabsContent>

          <TabsContent value="investments" className="p-0">
            <InvestmentsList />
          </TabsContent>

          <TabsContent value="cards" className="p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">Credit Cards</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Card balances and utilization still use their dedicated editor, but they live under accounts now.
                </p>
                <Link
                  href="/credit-cards"
                  className="mt-4 inline-flex items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  Open cards
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PagePanel>

    </PageShell>
  );
}
