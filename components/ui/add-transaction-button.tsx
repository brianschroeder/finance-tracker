'use client';

import { PlusIcon } from './icons';

export function AddTransactionButton() {
  return (
    <button 
      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium inline-flex items-center hover:bg-blue-700 transition-colors"
      id="add-transaction-button"
      onClick={() => {
        const event = new CustomEvent('showAddForm');
        window.dispatchEvent(event);
      }}
    >
      <PlusIcon className="w-4 h-4 mr-1.5" />
      Add Transaction
    </button>
  );
} 