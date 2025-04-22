/**
 * Utility functions for formatting values
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Format a number as a currency string in USD format
 */
export function formatCurrency(value: number, loading?: boolean): string {
  // Show loading placeholder
  if (loading) {
    return '—';
  }
  
  // Handle NaN, undefined, and null values
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

/**
 * Format a number as a percentage with 2 decimal places
 */
export function formatPercent(value: number, loading?: boolean): string {
  // Show loading placeholder
  if (loading) {
    return '—';
  }
  
  // Handle NaN, undefined, and null values
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  }).format(value / 100);
}

// Function to merge tailwind classes with clsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 