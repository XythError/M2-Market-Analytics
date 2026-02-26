import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PricePoint {
  timestamp: string;
  avg_unit_price: number;
  min_unit_price: number;
  avg_bottom20_price: number | null;
  total_listings: number;
}

interface PriceChartProps {
  itemName: string;
  data: PricePoint[];
}

function formatYang(val: number): string {
  if (val >= 100_000_000) return (val / 100_000_000).toFixed(2) + ' Won';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' M';
  if (val >= 1_000) return (val / 1_000).toFixed(0) + ' K';
  return val.toLocaleString() + ' Yang';
}

function formatAxisLabel(val: number): string {
  if (val >= 100_000_000) return (val / 100_000_000).toFixed(1) + ' W';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' M';
  if (val >= 1_000) return (val / 1_000).toFixed(0) + ' K';
  return String(val);
}

export default function PriceChart({ itemName, data }: PriceChartProps) {
  const labels = data.map(d => {
    try {
      const date = new Date(d.timestamp);
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) 
        + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return d.timestamp;
    }
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ø Preis (alle)',
        data: data.map(d => d.avg_unit_price),
        borderColor: 'rgb(59, 130, 246)',        // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(96, 165, 250)',
        borderWidth: 2,
      },
      {
        label: 'Ø Günstigste 20%',
        data: data.map(d => d.avg_bottom20_price ?? d.min_unit_price),
        borderColor: 'rgb(16, 185, 129)',         // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(52, 211, 153)',
        borderWidth: 2,
      },
      {
        label: 'Minimum',
        data: data.map(d => d.min_unit_price),
        borderColor: 'rgb(251, 191, 36)',         // Amber
        backgroundColor: 'rgba(251, 191, 36, 0.05)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(252, 211, 77)',
        borderWidth: 2,
        borderDash: [5, 5],
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          padding: 20,
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            if (val == null) return label;
            return `${label}: ${formatYang(val)}`;
          },
          afterBody: (tooltipItems) => {
            const idx = tooltipItems[0]?.dataIndex;
            if (idx == null || !data[idx]) return '';
            return `Listings: ${data[idx].total_listings}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { color: '#334155' },
        ticks: {
          color: '#94a3b8',
          maxRotation: 45,
          maxTicksLimit: 12,
        }
      },
      y: {
        grid: { color: '#334155' },
        ticks: {
          color: '#94a3b8',
          callback: function(value) {
            return formatAxisLabel(Number(value));
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="w-full h-full p-4 bg-slate-800 rounded-lg border border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{itemName} - Price History</h3>
      </div>
      <div className="h-[300px]">
        {data.length > 0 ? (
           <Line options={options} data={chartData} />
        ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
                No historical data available.
            </div>
        )}
      </div>
    </div>
  );
}
