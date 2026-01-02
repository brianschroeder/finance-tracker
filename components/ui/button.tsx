"use client"

import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  isFullWidth?: boolean;
  children: React.ReactNode;
}

interface LinkButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  isFullWidth?: boolean;
  children: React.ReactNode;
  href: string;
  className?: string;
}

const getVariantClasses = (variant: ButtonVariant = 'primary') => {
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_2px_6px_rgba(59,130,246,0.15)]';
    case 'secondary':
      return 'bg-gray-100 hover:bg-gray-200 text-gray-700';
    case 'outline':
      return 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]';
    case 'danger':
      return 'bg-red-500 hover:bg-red-600 text-white shadow-[0_2px_6px_rgba(239,68,68,0.15)]';
    case 'success':
      return 'bg-green-500 hover:bg-green-600 text-white shadow-[0_2px_6px_rgba(34,197,94,0.15)]';
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 text-gray-700';
    default:
      return 'bg-blue-600 hover:bg-blue-700 text-white';
  }
};

const getSizeClasses = (size: ButtonSize = 'md') => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm';
    case 'md':
      return 'px-4 py-2 text-sm';
    case 'lg':
      return 'px-5 py-2.5 text-base';
    default:
      return 'px-4 py-2 text-sm';
  }
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  isFullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${getVariantClasses(variant)}
        ${getSizeClasses(size)}
        ${isFullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon,
  isFullWidth = false,
  children,
  href,
  className = '',
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${getVariantClasses(variant)}
        ${getSizeClasses(size)}
        ${isFullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Link>
  );
} 