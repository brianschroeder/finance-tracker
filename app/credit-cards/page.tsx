'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CreditCard {
  id: number;
  name: string;
  balance: number;
  limit: number;
  color?: string;
}

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [newCard, setNewCard] = useState<Omit<CreditCard, 'id'>>({
    name: '',
    balance: 0,
    limit: 0,
    color: '#000000'
  });
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit cards
  useEffect(() => {
    async function fetchCreditCards() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/credit-cards');
        
        if (!response.ok) {
          throw new Error('Failed to fetch credit cards');
        }
        
        const data = await response.json();
        setCreditCards(data);
      } catch (err) {
        console.error('Error fetching credit cards:', err);
        setError('Failed to load credit cards. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCreditCards();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Calculate credit utilization
  const calculateCreditUtilization = (balance: number, limit: number) => {
    if (limit === 0) return 0;
    return (balance / limit) * 100;
  };

  // Get credit utilization color
  const getCreditUtilizationColor = (utilizationPercentage: number) => {
    if (utilizationPercentage < 10) return 'bg-green-500';
    if (utilizationPercentage < 30) return 'bg-blue-500';
    if (utilizationPercentage < 50) return 'bg-blue-400';
    if (utilizationPercentage < 75) return 'bg-blue-600';
    return 'bg-blue-700';
  };

  // Calculate total credit card debt
  const calculateTotalCreditCardDebt = () => {
    return creditCards.reduce((sum, card) => sum + card.balance, 0);
  };

  // Calculate total credit limit
  const calculateTotalCreditLimit = () => {
    return creditCards.reduce((sum, card) => sum + card.limit, 0);
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setShowNewCardForm(false);
    setError(null);
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/credit-cards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCard)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update credit card');
      }
      
      const updatedCard = await response.json();
      
      setCreditCards(prev => 
        prev.map(card => 
          card.id === updatedCard.id ? updatedCard : card
        )
      );
      
      setEditingCard(null);
    } catch (err) {
      console.error('Error updating credit card:', err);
      setError(err instanceof Error ? err.message : 'Failed to update credit card');
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this credit card?')) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/credit-cards/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete credit card');
      }
      
      setCreditCards(prev => prev.filter(card => card.id !== id));
    } catch (err) {
      console.error('Error deleting credit card:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete credit card');
    }
  };

  const handleAddNewCard = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add credit card');
      }
      
      const createdCard = await response.json();
      
      setCreditCards(prev => [...prev, createdCard]);
      
      setNewCard({
        name: '',
        balance: 0,
        limit: 0,
        color: '#000000'
      });
      
      setShowNewCardForm(false);
    } catch (err) {
      console.error('Error adding credit card:', err);
      setError(err instanceof Error ? err.message : 'Failed to add credit card');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Credit Cards</h1>
        <div className="flex gap-2">
          <Link
            href="/"
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={() => {
              setShowNewCardForm(true);
              setEditingCard(null);
              setError(null);
            }}
            className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            Add New Card
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Credit Card Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Credit Card Summary</h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded-md w-2/3"></div>
            <div className="h-8 bg-gray-200 rounded-md w-1/2"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Total Credit Card Debt</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(calculateTotalCreditCardDebt())}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Total Credit Limit</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(calculateTotalCreditLimit())}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Overall Utilization</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-800">
                  {calculateCreditUtilization(calculateTotalCreditCardDebt(), calculateTotalCreditLimit()).toFixed(1)}%
                </p>
                <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2 self-center">
                  <div 
                    className={`h-2 rounded-full ${getCreditUtilizationColor(calculateCreditUtilization(calculateTotalCreditCardDebt(), calculateTotalCreditLimit()))}`}
                    style={{ width: `${Math.min(calculateCreditUtilization(calculateTotalCreditCardDebt(), calculateTotalCreditLimit()), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form for editing a card */}
      {editingCard && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Credit Card</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
              <input 
                type="text"
                value={editingCard.name}
                onChange={(e) => setEditingCard({...editingCard, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Color</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={editingCard.color || '#000000'}
                  onChange={(e) => setEditingCard({...editingCard, color: e.target.value})}
                  className="border border-gray-300 rounded-md h-10 w-10"
                />
                <input 
                  type="text"
                  value={editingCard.color || '#000000'}
                  onChange={(e) => setEditingCard({...editingCard, color: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance ($)</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                value={editingCard.balance}
                onChange={(e) => setEditingCard({...editingCard, balance: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit ($)</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                value={editingCard.limit}
                onChange={(e) => setEditingCard({...editingCard, limit: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => setEditingCard(null)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateCard}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={!editingCard.name || editingCard.limit <= 0}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Form for adding a new card */}
      {showNewCardForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Credit Card</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
              <input 
                type="text"
                value={newCard.name}
                onChange={(e) => setNewCard({...newCard, name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Chase Sapphire"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Color</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={newCard.color || '#000000'}
                  onChange={(e) => setNewCard({...newCard, color: e.target.value})}
                  className="border border-gray-300 rounded-md h-10 w-10"
                />
                <input 
                  type="text"
                  value={newCard.color || '#000000'}
                  onChange={(e) => setNewCard({...newCard, color: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#000000"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance ($)</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                value={newCard.balance}
                onChange={(e) => setNewCard({...newCard, balance: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit ($)</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                value={newCard.limit}
                onChange={(e) => setNewCard({...newCard, limit: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => setShowNewCardForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddNewCard}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={!newCard.name || newCard.limit <= 0}
            >
              Add Card
            </button>
          </div>
        </div>
      )}

      {/* Credit Cards List */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Credit Cards</h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded-md w-full"></div>
            <div className="h-16 bg-gray-200 rounded-md w-full"></div>
            <div className="h-16 bg-gray-200 rounded-md w-full"></div>
          </div>
        ) : creditCards.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">No credit cards added yet</p>
            <button 
              onClick={() => setShowNewCardForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Add your first credit card →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {creditCards.map(card => (
              <div 
                key={card.id} 
                className="flex flex-col md:flex-row justify-between border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center mb-4 md:mb-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center mr-4" 
                    style={{ backgroundColor: card.color ? card.color + '20' : '#CBD5E0' }}
                  >
                    <svg 
                      className="w-5 h-5" 
                      style={{ color: card.color }}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{card.name}</h3>
                    <div className="mt-1 flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full ${getCreditUtilizationColor(calculateCreditUtilization(card.balance, card.limit))}`}
                          style={{ width: `${Math.min(calculateCreditUtilization(card.balance, card.limit), 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {calculateCreditUtilization(card.balance, card.limit).toFixed(1)}% used
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-right md:mr-6">
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(card.balance)}</p>
                    <p className="text-xs text-gray-500">of {formatCurrency(card.limit)} limit</p>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => handleEditCard(card)}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteCard(card.id)}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 