'use client';

import { useState, useEffect } from 'react';
import { FaChartLine, FaHome, FaPlane, FaUniversity, FaCar, FaGraduationCap, FaHeart, FaShoppingCart } from 'react-icons/fa';

interface FundAccount {
  id: number;
  name: string;
  amount: number;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  isInvesting?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

const iconMap = {
  FaChartLine,
  FaHome,
  FaPlane,
  FaUniversity,
  FaCar,
  FaGraduationCap,
  FaHeart,
  FaShoppingCart,
};

export default function FundAccountsSummary() {
  const [fundAccounts, setFundAccounts] = useState<FundAccount[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFundAccounts() {
      try {
        const response = await fetch('/api/fund-accounts');
        
        if (!response.ok) {
          throw new Error('Failed to fetch fund accounts');
        }
        
        const data = await response.json();
        console.log('Fetched fund accounts data:', data); // Debug log
        setFundAccounts(data.fundAccounts || []);
        setTotalAmount(data.totalAmount || 0);
      } catch (error) {
        console.error('Error fetching fund accounts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFundAccounts();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || FaChartLine;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (fundAccounts.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <FaChartLine className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">No fund accounts yet</p>
        <p className="text-xs text-gray-500">Create fund accounts to track your savings goals</p>
      </div>
    );
  }

  // Show top 3 fund accounts
  const displayFunds = fundAccounts.slice(0, 3);
  const hasMore = fundAccounts.length > 3;

  return (
    <div className="space-y-3">
      {displayFunds.map((fund) => {
        console.log('Rendering fund:', fund); // Debug log
        const IconComponent = getIconComponent(fund.icon || 'FaChartLine');
        return (
          <div key={fund.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white"
                style={{ backgroundColor: fund.color || '#3B82F6' }}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-700">{fund.name}</h3>
                  {fund.isInvesting ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                            Investing
                          </span>
                  ): null}
                </div>
                {fund.description && (
                  <p className="text-xs text-gray-500">{fund.description}</p>
                )}
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(fund.amount)}</p>
          </div>
        );
      })}
      
      {hasMore && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500">
            +{fundAccounts.length - 3} more fund{fundAccounts.length - 3 !== 1 ? 's' : ''}
          </p>
        </div>
      )}
      
      {totalAmount > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total Allocated:</span>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
} 