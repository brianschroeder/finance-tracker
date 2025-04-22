'use client';

import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Investment {
  id?: number;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  lastUpdated?: string;
  change?: number;
  changePercent?: number;
}

interface InvestmentWithPerformance extends Investment {
  dayChange: number;
  dayChangePercent: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface InvestmentPerformanceProps {
  investments: Investment[];
}

// Format currency values
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format percentage values
function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value / 100);
}

// Define proper chart data type outside of the component
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

export default function InvestmentPerformance({ investments }: InvestmentPerformanceProps) {
  const [performanceData, setPerformanceData] = useState<InvestmentWithPerformance[]>([]);
  const [totals, setTotals] = useState({
    totalValue: 0,
    totalCost: 0,
    totalDayChange: 0,
    totalGainLoss: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] });

  // Process investment data to calculate performance metrics
  useEffect(() => {
    if (!investments || investments.length === 0) return;

    // Process investments data to include performance metrics
    const processedData: InvestmentWithPerformance[] = investments.map(inv => {
      const dayChange = (inv.currentPrice || 0) * inv.shares - inv.shares * inv.avgPrice;
      const dayChangePercent = (((inv.currentPrice || 0) - inv.avgPrice) / inv.avgPrice) * 100;
      const totalValue = (inv.currentPrice || 0) * inv.shares;
      const gainLoss = totalValue - (inv.avgPrice * inv.shares);
      const gainLossPercent = (gainLoss / (inv.avgPrice * inv.shares)) * 100;
      
      return {
        ...inv,
        dayChange,
        dayChangePercent,
        totalValue,
        gainLoss,
        gainLossPercent
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    const newTotals = processedData.reduce(
      (acc, inv) => {
        return {
          totalValue: acc.totalValue + inv.totalValue,
          totalCost: acc.totalCost + inv.shares * inv.avgPrice,
          totalDayChange: acc.totalDayChange + inv.dayChange,
          totalGainLoss: acc.totalGainLoss + inv.gainLoss,
        };
      },
      { totalValue: 0, totalCost: 0, totalDayChange: 0, totalGainLoss: 0 }
    );

    setPerformanceData(processedData);
    setTotals(newTotals);

    // Prepare chart data
    const maxItemsToShow = 10; // Limit chart to top investments
    const chartInvestments = processedData.slice(0, maxItemsToShow);
    
    const chartDataObject: ChartData = {
      labels: chartInvestments.map(inv => inv.symbol),
      datasets: [
        {
          label: 'Day Change ($)',
          data: chartInvestments.map(inv => inv.dayChange),
          backgroundColor: chartInvestments.map(inv => 
            inv.dayChange >= 0 ? 'rgba(75, 192, 75, 0.7)' : 'rgba(255, 99, 132, 0.7)'
          ),
          borderColor: chartInvestments.map(inv => 
            inv.dayChange >= 0 ? 'rgba(75, 192, 75, 1)' : 'rgba(255, 99, 132, 1)'
          ),
          borderWidth: 1,
        },
      ],
    };
    
    setChartData(chartDataObject);
  }, [investments]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Daily Performance by Stock',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return `Day Change: ${formatCurrency(value)}`;
          },
          afterLabel: function(context: any) {
            const index = context.dataIndex;
            const inv = performanceData[index];
            if (inv) {
              return [
                `Change %: ${formatPercentage(inv.dayChangePercent)}`,
                `Total Value: ${formatCurrency(inv.totalValue)}`,
              ];
            }
            return '';
          },
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Day Change ($)',
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  if (!investments || investments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-400">No investment data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall performance summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Portfolio Value</div>
          <div className="text-2xl font-bold">{formatCurrency(totals.totalValue)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Gain/Loss</div>
          <div className={`text-2xl font-bold ${totals.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.totalGainLoss)} 
            <span className="text-lg ml-1">
              ({formatPercentage((totals.totalGainLoss / totals.totalCost) * 100)})
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Day Change</div>
          <div className={`text-2xl font-bold ${totals.totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.totalDayChange)}
            <span className="text-lg ml-1">
              ({formatPercentage((totals.totalDayChange / totals.totalValue) * 100)})
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Cost Basis</div>
          <div className="text-2xl font-bold">{formatCurrency(totals.totalCost)}</div>
        </div>
      </div>

      {/* Daily performance chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div style={{ height: '300px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>

      {/* Performance table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Investments Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Today's Change</th>
                <th className="px-4 py-3 text-right">% Change</th>
                <th className="px-4 py-3 text-right">Total Gain/Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {performanceData.map(inv => (
                <tr key={inv.id || inv.symbol} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.symbol}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(inv.totalValue)}</td>
                  <td className={`px-4 py-3 text-right ${inv.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(inv.dayChange)}
                  </td>
                  <td className={`px-4 py-3 text-right ${inv.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(inv.dayChangePercent)}
                  </td>
                  <td className={`px-4 py-3 text-right ${inv.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(inv.gainLoss)} ({formatPercentage(inv.gainLossPercent)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 