'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard as CreditCardIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  EmptyState,
  FinanceCard,
  FinanceCardBody,
  FinanceCardHeader,
  inputClass,
  labelClass,
  MetricCard,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/FinanceUI';
import { PageHeader, PageShell } from '@/components/PageShell';

interface CreditCard {
  id: number;
  name: string;
  balance: number;
  limit: number;
  color?: string;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function money(value: number) {
  return currency.format(value || 0);
}

function utilization(balance: number, limit: number) {
  return limit > 0 ? (balance / limit) * 100 : 0;
}

function utilizationTone(percent: number) {
  if (percent < 30) return 'bg-emerald-500';
  if (percent < 70) return 'bg-amber-500';
  return 'bg-rose-500';
}

const blankCard: Omit<CreditCard, 'id'> = {
  name: '',
  balance: 0,
  limit: 0,
  color: '#0f172a',
};

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [newCard, setNewCard] = useState<Omit<CreditCard, 'id'>>(blankCard);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/credit-cards');
      if (!response.ok) throw new Error('Failed to fetch credit cards');
      setCreditCards(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const totals = useMemo(() => {
    const balance = creditCards.reduce((sum, card) => sum + card.balance, 0);
    const limit = creditCards.reduce((sum, card) => sum + card.limit, 0);
    return {
      balance,
      limit,
      available: Math.max(limit - balance, 0),
      utilization: utilization(balance, limit),
    };
  }, [creditCards]);

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    try {
      setError(null);
      const response = await fetch(`/api/credit-cards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCard),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update credit card');
      }

      await fetchCreditCards();
      setEditingCard(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credit card');
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!window.confirm('Delete this credit card?')) return;

    try {
      setError(null);
      const response = await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete credit card');
      }
      setCreditCards((current) => current.filter((card) => card.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credit card');
    }
  };

  const handleAddNewCard = async () => {
    try {
      setError(null);
      const response = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add credit card');
      }

      await fetchCreditCards();
      setNewCard(blankCard);
      setShowNewCardForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credit card');
    }
  };

  const cardForm = (card: CreditCard | Omit<CreditCard, 'id'>, setCard: (card: any) => void) => (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className={labelClass}>Card Name</label>
        <input
          type="text"
          value={card.name}
          onChange={(event) => setCard({ ...card, name: event.target.value })}
          className={inputClass}
          placeholder="Chase Sapphire"
        />
      </div>
      <div>
        <label className={labelClass}>Card Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={card.color || '#0f172a'}
            onChange={(event) => setCard({ ...card, color: event.target.value })}
            className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
          />
          <input
            type="text"
            value={card.color || '#0f172a'}
            onChange={(event) => setCard({ ...card, color: event.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Current Balance</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={card.balance}
          onChange={(event) => setCard({ ...card, balance: parseFloat(event.target.value) || 0 })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Credit Limit</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={card.limit}
          onChange={(event) => setCard({ ...card, limit: parseFloat(event.target.value) || 0 })}
          className={inputClass}
        />
      </div>
    </div>
  );

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        eyebrow="Accounts"
        title="Credit Cards"
        description="Monitor balances, limits, utilization, and debt pressure alongside the checking alignment view."
        icon={<CreditCardIcon className="h-5 w-5" />}
        actions={(
          <button
            onClick={() => {
              setShowNewCardForm(true);
              setEditingCard(null);
              setError(null);
            }}
            className={primaryButtonClass}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Card
          </button>
        )}
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Card Debt" value={money(totals.balance)} detail="Total active card balance" icon={<CreditCardIcon className="h-4 w-4" />} tone="rose" />
        <MetricCard label="Credit Limit" value={money(totals.limit)} detail={`${money(totals.available)} available`} icon={<CreditCardIcon className="h-4 w-4" />} tone="slate" />
        <MetricCard label="Utilization" value={`${totals.utilization.toFixed(1)}%`} detail="Across all cards" icon={<CreditCardIcon className="h-4 w-4" />} tone={totals.utilization > 70 ? 'rose' : totals.utilization > 30 ? 'amber' : 'emerald'} />
      </div>

      {editingCard && (
        <FinanceCard>
          <FinanceCardHeader title="Edit Card" description="Update balance, limit, and visual label." />
          <FinanceCardBody>
            {cardForm(editingCard, setEditingCard)}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditingCard(null)} className={secondaryButtonClass}>Cancel</button>
              <button onClick={handleUpdateCard} className={primaryButtonClass} disabled={!editingCard.name || editingCard.limit <= 0}>Save</button>
            </div>
          </FinanceCardBody>
        </FinanceCard>
      )}

      {showNewCardForm && (
        <FinanceCard>
          <FinanceCardHeader title="Add Card" description="Create a new card record for utilization tracking." />
          <FinanceCardBody>
            {cardForm(newCard, setNewCard)}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowNewCardForm(false)} className={secondaryButtonClass}>Cancel</button>
              <button onClick={handleAddNewCard} className={primaryButtonClass} disabled={!newCard.name || newCard.limit <= 0}>Add Card</button>
            </div>
          </FinanceCardBody>
        </FinanceCard>
      )}

      <FinanceCard>
        <FinanceCardHeader title="Cards" description="Balances should stay current so net worth and debt pressure are accurate." />
        <FinanceCardBody>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          ) : creditCards.length === 0 ? (
            <EmptyState
              title="No cards yet"
              description="Add cards here to track credit limits, balances, utilization, and debt pressure."
              action={<button onClick={() => setShowNewCardForm(true)} className={primaryButtonClass}>Add first card</button>}
            />
          ) : (
            <div className="space-y-3">
              {creditCards.map((card) => {
                const percent = utilization(card.balance, card.limit);
                return (
                  <div key={card.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                          style={{ color: card.color || '#0f172a' }}
                        >
                          <CreditCardIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">{card.name}</p>
                          <p className="text-sm text-slate-500">{percent.toFixed(1)}% used</p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 md:max-w-sm">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${utilizationTone(percent)}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                        </div>
                        <div className="mt-2 flex justify-between text-sm text-slate-500">
                          <span>{money(card.balance)}</span>
                          <span>{money(card.limit)}</span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingCard(card)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Edit card">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteCard(card.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Delete card">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FinanceCardBody>
      </FinanceCard>
    </PageShell>
  );
}
