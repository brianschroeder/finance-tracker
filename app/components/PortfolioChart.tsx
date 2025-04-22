'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Investment {
  id?: number;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  lastUpdated?: string;
  createdAt?: string;
}

interface PortfolioChartProps {
  investments: Investment[];
  type?: 'pie' | 'doughnut' | 'bar' | 'line';
  title?: string;
  height?: number;
}

// Generate a visually pleasing color based on an index
function generateColor(index: number, alpha = 1): string {
  const hue = (index * 137.5) % 360; // Golden angle approximation for nice distribution
  return `hsla(${hue}, 70%, 60%, ${alpha})`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PortfolioChart({ 
  investments, 
  type = 'doughnut', 
  title = 'Portfolio Allocation',
  height = 300
}: PortfolioChartProps) {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    if (!investments || investments.length === 0) return;
    
    // Calculate the current value of each investment
    const investmentValues = investments.map(investment => {
      const currentPrice = investment.currentPrice || investment.avgPrice;
      return {
        symbol: investment.symbol,
        name: investment.name,
        value: investment.shares * currentPrice,
      };
    });
    
    // Sort by value (largest first)
    investmentValues.sort((a, b) => b.value - a.value);
    
    const labels = investmentValues.map(inv => inv.symbol);
    const values = investmentValues.map(inv => inv.value);
    const colors = investmentValues.map((_, index) => generateColor(index));
    const borderColors = colors.map(color => color.replace('0.8', '1'));
    
    let newChartData;
    
    if (type === 'pie' || type === 'doughnut') {
      newChartData = {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      };
    } else if (type === 'bar') {
      newChartData = {
        labels,
        datasets: [
          {
            label: 'Investment Value',
            data: values,
            backgroundColor: colors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      };
    } else if (type === 'line') {
      // For line charts we need time series data
      // Since we don't have historical data in this view, we'll just use the current values
      newChartData = {
        labels,
        datasets: [
          {
            label: 'Current Value',
            data: values,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
    
    setChartData(newChartData);
  }, [investments, type]);
  
  // Calculate portfolio total
  const portfolioTotal = investments.reduce((sum, inv) => {
    const currentPrice = inv.currentPrice || inv.avgPrice;
    return sum + (inv.shares * currentPrice);
  }, 0);

  // Options for the chart
  const options: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: {
            parsed: { y: number } | number;
            raw: { y: number } | number;
            label: string;
          }) {
            const value = context.parsed || context.raw;
            const formattedValue = formatCurrency(typeof value === 'number' ? value : value.y);
            const percentage = ((typeof value === 'number' ? value : value.y) / portfolioTotal * 100).toFixed(1);
            
            if (type === 'pie' || type === 'doughnut') {
              return `${context.label}: ${formattedValue} (${percentage}%)`;
            } else {
              return `${formattedValue} (${percentage}%)`;
            }
          }
        }
      }
    },
  };
  
  if (type === 'bar') {
    options.scales = {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: number) {
            return formatCurrency(value as number);
          }
        }
      }
    };
  }

  if (!investments || investments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-400">No investment data available</p>
      </div>
    );
  }

  let ChartComponent;
  switch (type) {
    case 'pie':
      ChartComponent = Pie;
      break;
    case 'bar':
      ChartComponent = Bar;
      break;
    case 'line':
      ChartComponent = Line;
      break;
    case 'doughnut':
    default:
      ChartComponent = Doughnut;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div style={{ height: `${height}px` }}>
        <ChartComponent data={chartData} options={options} />
      </div>
      <div className="text-center mt-4 text-sm text-gray-600">
        Total Portfolio Value: <span className="font-semibold">{formatCurrency(portfolioTotal)}</span>
      </div>
    </div>
  );
} 