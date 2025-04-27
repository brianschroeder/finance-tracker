import { createTransaction, Transaction } from '@/lib/db';

export function addTestTransactions() {
  const transactions: Transaction[] = [
    {
      date: '2025-04-15',
      name: 'Groceries at Kroger',
      amount: -85.42,
      categoryId: null,
      notes: 'Weekly grocery shopping'
    },
    {
      date: '2025-04-16',
      name: 'Gas Station',
      amount: -45.25,
      categoryId: null,
      notes: 'Filled up the car'
    },
    {
      date: '2025-04-17',
      name: 'Amazon',
      amount: -32.99,
      categoryId: null,
      notes: 'Books'
    },
    {
      date: '2025-04-18',
      name: 'Netflix',
      amount: -14.99,
      categoryId: null,
      notes: 'Monthly subscription'
    },
    {
      date: '2025-04-20',
      name: 'Restaurant',
      amount: -65.82,
      categoryId: null,
      notes: 'Dinner with friends'
    }
  ];

  try {
    const ids = transactions.map(transaction => createTransaction(transaction));
    console.log(`Successfully added ${ids.length} test transactions`);
    return { success: true, count: ids.length, ids };
  } catch (error) {
    console.error('Error adding test transactions:', error);
    return { success: false, error: String(error) };
  }
} 