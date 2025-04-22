import React from 'react';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ 
  className = '', 
  orientation = 'horizontal' 
}: SeparatorProps) {
  return (
    <div 
      className={`
        ${orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'} 
        bg-gray-200 
        ${className}
      `}
    />
  );
}

export default Separator; 