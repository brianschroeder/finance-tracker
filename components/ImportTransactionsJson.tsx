'use client';

import { useState } from 'react';
import { RecurringTransaction } from '@/lib/db';

interface ImportTransactionsJsonProps {
  onImportSuccess: (transactions: RecurringTransaction[]) => void;
  onCancel: () => void;
}

export default function ImportTransactionsJson({ onImportSuccess, onCancel }: ImportTransactionsJsonProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<RecurringTransaction[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonContent(e.target.value);
    setError('');
    setShowPreview(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonContent(content);
        setError('');
        setShowPreview(false);
      } catch (err) {
        setError('Failed to read file');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const validateJson = () => {
    try {
      // Parse JSON
      const parsed = JSON.parse(jsonContent);
      
      // Check if it's an array
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of transactions');
        return null;
      }
      
      // Validate each transaction
      const validTransactions = parsed.filter((item) => {
        return (
          item.name && 
          typeof item.name === 'string' && 
          !isNaN(Number(item.amount)) && 
          !isNaN(Number(item.dueDate)) && 
          Number(item.dueDate) >= 1 && 
          Number(item.dueDate) <= 31
        );
      });
      
      if (validTransactions.length === 0) {
        setError('No valid transactions found in JSON');
        return null;
      }
      
      if (validTransactions.length !== parsed.length) {
        setError(`Warning: ${parsed.length - validTransactions.length} transactions were invalid and will be skipped`);
      }
      
      // Format transactions correctly
      return validTransactions.map((item: any) => ({
        name: item.name,
        amount: Number(item.amount),
        dueDate: Number(item.dueDate),
        isEssential: Boolean(item.isEssential)
      }));
      
    } catch (err) {
      setError('Invalid JSON format');
      return null;
    }
  };

  const handlePreview = () => {
    const validTransactions = validateJson();
    if (validTransactions) {
      setPreview(validTransactions);
      setShowPreview(true);
    }
  };

  const handleImport = async () => {
    const validTransactions = validateJson();
    if (!validTransactions) return;
    
    setIsLoading(true);
    
    try {
      // Import each transaction
      const importPromises = validTransactions.map(async (transaction) => {
        const response = await fetch('/api/recurring-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to import transaction: ${transaction.name}`);
        }
        
        return response.json();
      });
      
      const results = await Promise.all(importPromises);
      const importedTransactions = results.map(r => r.transaction);
      
      onImportSuccess(importedTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Import Recurring Transactions from JSON</h2>
        <p className="text-sm text-gray-600">
          Upload a JSON file or paste JSON data to import recurring transactions.
          The JSON should be an array of objects with name, amount, dueDate, and optional isEssential properties.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="json-file" className="block text-sm font-medium text-gray-700 mb-2">
            Upload JSON File
          </label>
          <input
            type="file"
            id="json-file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
        
        <div>
          <label htmlFor="json-content" className="block text-sm font-medium text-gray-700 mb-2">
            Or Paste JSON Data
          </label>
          <textarea
            id="json-content"
            rows={8}
            value={jsonContent}
            onChange={handleTextChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder='[
  {
    "name": "Netflix",
    "amount": 15.99,
    "dueDate": 15,
    "isEssential": false
  }
]'
          />
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {showPreview && preview.length > 0 && (
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Preview ({preview.length} transactions)</h3>
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((transaction, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {transaction.dueDate}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.isEssential ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.isEssential ? 'Essential' : 'Non-essential'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 border-t pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handlePreview}
            disabled={!jsonContent || isLoading}
            className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Preview
          </button>
          
          <button
            type="button"
            onClick={handleImport}
            disabled={!jsonContent || isLoading || !showPreview}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isLoading || !showPreview ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isLoading ? 'Importing...' : 'Import Transactions'}
          </button>
        </div>
      </div>
    </div>
  );
} 