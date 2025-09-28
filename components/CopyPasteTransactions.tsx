'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';

interface ParsedTransaction {
  name: string;
  date: string;
  amount: number;
  notes?: string;
  pending: boolean;
}

interface BudgetCategory {
  id: number;
  name: string;
  color: string;
  allocatedAmount: number;
  isActive: boolean;
}

interface EditableTransaction extends ParsedTransaction {
  id: string; // temporary ID for editing
  categoryId: number | null;
  suggestedCategoryId?: number | null; // Smart suggestion
}

interface NewCategoryForm {
  name: string;
  color: string;
  allocatedAmount: number;
}

export default function CopyPasteTransactions({ onTransactionsAdded }: { onTransactionsAdded?: () => void }) {
  const [pastedText, setPastedText] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState<EditableTransaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showParsed, setShowParsed] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState<string | null>(null); // transaction ID
  const [newCategoryForm, setNewCategoryForm] = useState<NewCategoryForm>({
    name: '',
    color: '#3B82F6',
    allocatedAmount: 0
  });
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [markAsCreditCardPending, setMarkAsCreditCardPending] = useState(false);

  // Fetch categories for dropdown
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await fetch('/api/budget-categories?allActive=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  function transformName(name: string): string {
    const lowerName = name.toLowerCase().trim();
    
    // Transform Tesla to Tesla Supercharging
    if (lowerName === 'tesla') {
      return 'Tesla Supercharging';
    }
    
    // Add more transformations here as needed
    
    return name.trim(); // Return original name with trimmed whitespace
  }

  function suggestCategory(transactionName: string): number | null {
    const lowerName = transactionName.toLowerCase().trim();
    
    // Smart category matching rules
    const categoryRules = [
      // Gas/Charging
      {
        keywords: ['tesla', 'shell', 'bp', 'exxon', 'chevron', 'mobil', 'wawa', 'supercharging', 'charging', 'gas'],
        categoryNames: ['charging', 'gas', 'fuel', 'transportation']
      },
      // Food & Dining
      {
        keywords: ['cava', 'chipotle', 'mcdonalds', 'subway', 'starbucks', 'dunkin', 'restaurant', 'cafe', 'pizza'],
        categoryNames: ['dining', 'food', 'restaurants', 'dining out']
      },
      // Groceries
      {
        keywords: ['walmart', 'target', 'kroger', 'safeway', 'whole foods', 'trader joe', 'grocery'],
        categoryNames: ['groceries', 'grocery', 'food shopping']
      },
      // Transportation
      {
        keywords: ['uber', 'lyft', 'taxi', 'e-zpass', 'ezpass', 'toll', 'parking', 'metro', 'transit'],
        categoryNames: ['transportation', 'transport', 'travel']
      },
      // Shopping
      {
        keywords: ['amazon', 'ebay', 'shopping', 'store', 'retail'],
        categoryNames: ['shopping', 'retail', 'online shopping']
      },
      // Utilities
      {
        keywords: ['electric', 'water', 'gas bill', 'internet', 'phone', 'utility'],
        categoryNames: ['utilities', 'bills']
      }
    ];

    // Check each rule
    for (const rule of categoryRules) {
      const matchesKeyword = rule.keywords.some(keyword => lowerName.includes(keyword));
      if (matchesKeyword) {
        // Find matching category
        const matchingCategory = categories.find(cat => 
          rule.categoryNames.some(catName => 
            cat.name.toLowerCase().includes(catName) || catName.includes(cat.name.toLowerCase())
          )
        );
        if (matchingCategory) {
          return matchingCategory.id!;
        }
      }
    }

    return null; // No match found
  }

  function parseTransactionText(text: string): EditableTransaction[] {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line);
    const transactions: EditableTransaction[] = [];
    
    // Process lines in groups (transaction blocks)
    let i = 0;
    while (i < lines.length) {
      const transaction = parseTransactionBlock(lines, i);
      if (transaction) {
        const suggestedCategoryId = suggestCategory(transaction.name);
        transactions.push({
          ...transaction,
          id: Math.random().toString(36).substr(2, 9), // temporary ID
          categoryId: suggestedCategoryId, // Auto-assign suggested category
          suggestedCategoryId: suggestedCategoryId
        });
        i = transaction.nextIndex;
      } else {
        i++;
      }
    }
    
    return transactions;
  }

  function parseTransactionBlock(lines: string[], startIndex: number): (ParsedTransaction & { nextIndex: number }) | null {
    if (startIndex >= lines.length) return null;
    
    let currentIndex = startIndex;
    let name = '';
    let dateStr = '';
    let amountStr = '';
    let notes = '';
    let pending = false;
    
    // First line should be the transaction name
    if (currentIndex < lines.length) {
      name = lines[currentIndex].trim();
      currentIndex++;
    }
    
    // Second line should be date/time
    if (currentIndex < lines.length) {
      dateStr = lines[currentIndex].trim();
      currentIndex++;
    }
    
    // Third line should be amount
    if (currentIndex < lines.length) {
      amountStr = lines[currentIndex].trim();
      currentIndex++;
    }
    
    // Fourth line might be status like "Pending"
    if (currentIndex < lines.length && lines[currentIndex].toLowerCase() === 'pending') {
      pending = true;
      currentIndex++;
    }
    
    // Parse date
    const parsedDate = parseDate(dateStr);
    if (!parsedDate) {
      return { name, date: new Date().toISOString().split('T')[0], amount: 0, pending: true, nextIndex: currentIndex };
    }
    
    // Parse amount
    const parsedAmount = parseAmount(amountStr);
    
    if (!name || parsedAmount === null) {
      return null;
    }
    
    return {
      name: transformName(name),
      date: parsedDate,
      amount: parsedAmount,
      notes,
      pending: false, // Mark as final transactions
      nextIndex: currentIndex
    };
  }

  function parseDate(dateStr: string): string | null {
    // Handle relative time like "2h"
    if (dateStr.match(/^\d+[hm]$/)) {
      return new Date().toISOString().split('T')[0]; // Use today's date
    }
    
    // Handle format like "Jul 21, 2025 • 2:22 PM"
    const dateMatch = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const monthNum = monthMap[month];
      if (monthNum) {
        return `${year}-${monthNum}-${day.padStart(2, '0')}`;
      }
    }
    
    // Default to today if can't parse
    return new Date().toISOString().split('T')[0];
  }

  function parseAmount(amountStr: string): number | null {
    // Remove currency symbols, whitespace, and negative signs
    const cleanAmount = amountStr.replace(/[$,\s-]/g, '');
    
    const amount = parseFloat(cleanAmount);
    if (isNaN(amount)) return null;
    
    // Always return positive amount (webapp doesn't use negative format)
    return Math.abs(amount);
  }

  function handleParse() {
    if (!pastedText.trim()) {
      toast({
        title: "Error",
        description: "Please paste some transaction data first",
        variant: "error"
      });
      return;
    }
    
    const parsed = parseTransactionText(pastedText);
    if (parsed.length === 0) {
      toast({
        title: "Error",
        description: "No valid transactions found in the pasted text",
        variant: "error"
      });
      return;
    }
    
    setParsedTransactions(parsed);
    setShowParsed(true);
    
    const suggestedCount = parsed.filter(t => t.suggestedCategoryId).length;
    
    toast({
      title: "Success", 
      description: `Parsed ${parsed.length} transaction${parsed.length === 1 ? '' : 's'}${suggestedCount > 0 ? ` with ${suggestedCount} smart category suggestion${suggestedCount === 1 ? '' : 's'}` : ''}`,
    });
  }

  function updateTransaction(id: string, field: keyof EditableTransaction, value: any) {
    setParsedTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  }

  function removeTransaction(id: string) {
    setParsedTransactions(prev => prev.filter(t => t.id !== id));
  }

  async function createNewCategory(transactionId: string) {
    if (!newCategoryForm.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "error"
      });
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await fetch('/api/budget-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryForm.name.trim(),
          color: newCategoryForm.color,
          allocatedAmount: newCategoryForm.allocatedAmount,
          isActive: true,
          isBudgetCategory: newCategoryForm.allocatedAmount > 0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const data = await response.json();
      const newCategory: BudgetCategory = {
        id: data.id,
        name: newCategoryForm.name.trim(),
        color: newCategoryForm.color,
        allocatedAmount: newCategoryForm.allocatedAmount,
        isActive: true
      };

      // Add to categories list
      setCategories(prev => [...prev, newCategory]);

      // Assign to transaction
      updateTransaction(transactionId, 'categoryId', data.id);

      // Reset form and hide
      setNewCategoryForm({
        name: '',
        color: '#3B82F6',
        allocatedAmount: 0
      });
      setShowNewCategoryForm(null);

      toast({
        title: "Success",
        description: `Category "${newCategory.name}" created and assigned`,
      });

    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "error"
      });
    } finally {
      setCreatingCategory(false);
    }
  }

  function handleCategoryChange(transactionId: string, value: string) {
    if (value === 'CREATE_NEW') {
      setShowNewCategoryForm(transactionId);
      // Pre-fill the form with the transaction name as suggestion
      const transaction = parsedTransactions.find(t => t.id === transactionId);
      if (transaction) {
        setNewCategoryForm(prev => ({
          ...prev,
          name: transaction.name
        }));
      }
    } else {
      updateTransaction(transactionId, 'categoryId', value ? parseInt(value) : null);
    }
  }

  async function saveTransactions() {
    if (parsedTransactions.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: parsedTransactions.map(t => ({
            date: t.date,
            name: t.name,
            amount: t.amount,
            categoryId: t.categoryId,
            notes: t.notes,
            pending: false, // Always save as final transactions
            creditCardPending: markAsCreditCardPending
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save transactions');
      }
      
      toast({
        title: "Success",
        description: `Successfully added ${parsedTransactions.length} transaction${parsedTransactions.length === 1 ? '' : 's'}`,
      });
      
      // Reset form
      setPastedText('');
      setParsedTransactions([]);
      setShowParsed(false);
      
      // Notify parent component
      if (onTransactionsAdded) {
        onTransactionsAdded();
      }
      
    } catch (error) {
      console.error('Error saving transactions:', error);
      toast({
        title: "Error",
        description: "Failed to save transactions",
        variant: "error"
      });
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Copy & Paste Transactions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Paste transaction data from your bank or financial app. Features smart category suggestions and allows creating new categories. Transactions will be saved as final (not pending). Expected format:
          </p>
          <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-700 mb-4">
            Tesla<br/>
            Jul 21, 2025 • 2:22 PM<br/>
            -$10.98<br/>
            Pending<br/>
            <br/>
            Cava<br/>
            Jul 21, 2025 • 2:14 PM<br/>
            -$9.52<br/>
            Pending
          </div>
        </div>

        {!showParsed ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="transaction-text" className="block text-sm font-medium text-gray-700 mb-2">
                Paste Transaction Data
              </label>
              <textarea
                id="transaction-text"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Paste your transaction data here..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!pastedText.trim()}>
                Parse Transactions
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPastedText('')}
                disabled={!pastedText.trim()}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">
                Review Parsed Transactions ({parsedTransactions.length})
              </h4>
              <Button 
                variant="outline" 
                onClick={() => setShowParsed(false)}
              >
                Back to Edit
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parsedTransactions.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={transaction.name}
                        onChange={(e) => updateTransaction(transaction.id, 'name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={transaction.date}
                        onChange={(e) => updateTransaction(transaction.id, 'date', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={transaction.amount}
                        onChange={(e) => updateTransaction(transaction.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Category
                        {transaction.suggestedCategoryId && (
                          <span className="ml-1 text-xs text-green-600">(✓ Smart suggestion)</span>
                        )}
                      </label>
                      <select
                        value={transaction.categoryId || ''}
                        onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                            {transaction.suggestedCategoryId === category.id && " (Suggested)"}
                          </option>
                        ))}
                        <option value="CREATE_NEW" className="font-bold text-blue-600">
                          + Create New Category
                        </option>
                      </select>
                      
                      {/* New Category Form */}
                      {showNewCategoryForm === transaction.id && (
                        <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50 space-y-2">
                          <h5 className="text-sm font-medium text-blue-800">Create New Category</h5>
                          <div>
                            <input
                              type="text"
                              placeholder="Category name"
                              value={newCategoryForm.name}
                              onChange={(e) => setNewCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="color"
                                value={newCategoryForm.color}
                                onChange={(e) => setNewCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                                className="w-full h-8 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                placeholder="Budget amount"
                                value={newCategoryForm.allocatedAmount}
                                onChange={(e) => setNewCategoryForm(prev => ({ ...prev, allocatedAmount: parseFloat(e.target.value) || 0 }))}
                                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => createNewCategory(transaction.id)}
                              disabled={creatingCategory}
                              size="sm"
                              className="flex-1"
                            >
                              {creatingCategory ? 'Creating...' : 'Create'}
                            </Button>
                            <Button
                              onClick={() => setShowNewCategoryForm(null)}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(transaction.amount)} • Final Transaction
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="creditCardPending"
                  checked={markAsCreditCardPending}
                  onChange={(e) => setMarkAsCreditCardPending(e.target.checked)}
                  className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="creditCardPending" className="ml-2 block text-sm text-gray-700">
                  Mark all as credit card transactions (not yet paid from checking)
                </label>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={saveTransactions} 
                  disabled={parsedTransactions.length === 0 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Saving...' : `Add ${parsedTransactions.length} Transaction${parsedTransactions.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 