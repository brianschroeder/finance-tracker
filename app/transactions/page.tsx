'use client';

import TransactionsList from '@/components/TransactionsList';
import CopyPasteTransactions from '@/components/CopyPasteTransactions';
import { PageHeader, PagePanel, PageShell } from '@/components/PageShell';
import { AddTransactionButton } from '@/components/ui/add-transaction-button';
import { Button } from '@/components/ui/button';
import { ClipboardIcon } from '@/components/ui/icons';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';

export default function TransactionsPage() {
  const [showCopyPaste, setShowCopyPaste] = useState(false);

  const handleTransactionsAdded = () => {
    // Refresh the transactions list (or trigger a re-fetch)
    window.location.reload(); // Simple approach for now
  };
  return (
    <PageShell>
      <PageHeader
        eyebrow="Transactions"
        title="Transactions"
        description="Review spending, edit tips and cashback, and keep categories clean."
        icon={<ReceiptText className="h-5 w-5" />}
        actions={(
          <>
              <AddTransactionButton />
              <Button
                onClick={() => setShowCopyPaste(!showCopyPaste)}
                variant={showCopyPaste ? "primary" : "outline"}
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium"
              >
                <ClipboardIcon className="w-4 h-4 mr-1.5" />
                Paste
              </Button>
          </>
        )}
      />

        {showCopyPaste && (
          <PagePanel>
            <CopyPasteTransactions onTransactionsAdded={handleTransactionsAdded} />
          </PagePanel>
        )}

        <TransactionsList />
    </PageShell>
  );
}
