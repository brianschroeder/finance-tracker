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
  iconBg = 'bg-slate-950'
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="mb-1 text-sm text-slate-500">{title}</p>
          <h3 className="text-2xl font-semibold text-slate-950">{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change > 0 ? (
                <>
                  <span className="text-green-500 text-xs font-medium flex items-center">
                    +{change}% <ArrowUpRight className="h-3 w-3 ml-1" />
                  </span>
                  <span className="ml-1 text-xs text-slate-500">since last month</span>
                </>
              ) : (
                <>
                  <span className="text-red-500 text-xs font-medium flex items-center">
                    {change}% <ArrowDownRight className="h-3 w-3 ml-1" />
                  </span>
                  <span className="ml-1 text-xs text-slate-500">since last month</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`${iconBg} rounded-lg p-3 text-white`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
} 
