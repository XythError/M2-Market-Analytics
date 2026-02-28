"use client";

import React, { useState } from 'react';
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

type SeriesKey = 'avg' | 'bottom20' | 'min';

const SERIES_CONFIG: { key: SeriesKey; label: string; color: string; bgColor: string; pointColor: string; dash?: number[] }[] = [
  {
    key: 'avg',
    label: 'Ø Preis (alle)',
    color: 'rgb(59, 130, 246)',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    pointColor: 'rgb(96, 165, 250)',
  },
  {
    key: 'bottom20',
    label: 'Ø Günstigste 20%',
    color: 'rgb(16, 185, 129)',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    pointColor: 'rgb(52, 211, 153)',
  },
  {
    key: 'min',
    label: 'Minimum',
    color: 'rgb(251, 191, 36)',
    bgColor: 'rgba(251, 191, 36, 0.05)',
    pointColor: 'rgb(252, 211, 77)',
    dash: [5, 5],
  },
];

export default function PriceChart({ itemName, data }: PriceChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    avg: true,
    bottom20: true,
    min: true,
  });

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const labels = data.map(d => {
    try {
      const date = new Date(d.timestamp);
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return d.timestamp;
    }
  });

  const dataByKey: Record<SeriesKey, number[]> = {
    avg: data.map(d => d.avg_unit_price),
    bottom20: data.map(d => d.avg_bottom20_price ?? d.min_unit_price),
    min: data.map(d => d.min_unit_price),
  };

  const allDatasets = SERIES_CONFIG.map(s => ({
    label: s.label,
    data: dataByKey[s.key],
    borderColor: s.color,
    backgroundColor: s.bgColor,
    tension: 0.3,
    pointRadius: 3,
    pointBackgroundColor: s.pointColor,
    borderWidth: 2,
    ...(s.dash ? { borderDash: s.dash } : {}),
    _seriesKey: s.key,
  }));

  const chartData = {
    labels,
    datasets: allDatasets.filter(ds => visibleSeries[ds._seriesKey as SeriesKey]),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
          callback: function (value) {
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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-bold text-white">{itemName} - Price History</h3>
        {/* Series Toggle Controls */}
        <div className="flex flex-wrap gap-2">
          {SERIES_CONFIG.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${visibleSeries[s.key]
                  ? 'border-slate-600 bg-slate-700 text-white shadow-sm'
                  : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:text-slate-400'
                }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                style={{
                  backgroundColor: s.color,
                  opacity: visibleSeries[s.key] ? 1 : 0.3,
                }}
              />
              {s.label}
            </button>
          ))}
        </div>
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
