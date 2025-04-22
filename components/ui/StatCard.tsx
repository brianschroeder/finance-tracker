import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  change?: number;
  subtitle?: string;
  iconBg?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  change, 
  subtitle,
  iconBg = 'bg-blue-500'
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change > 0 ? (
                <>
                  <span className="text-green-500 text-xs font-medium flex items-center">
                    +{change}% <ArrowUpRight className="h-3 w-3 ml-1" />
                  </span>
                  <span className="text-xs text-gray-500 ml-1">since last month</span>
                </>
              ) : (
                <>
                  <span className="text-red-500 text-xs font-medium flex items-center">
                    {change}% <ArrowDownRight className="h-3 w-3 ml-1" />
                  </span>
                  <span className="text-xs text-gray-500 ml-1">since last month</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`${iconBg} p-3 rounded-full text-white`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
} 