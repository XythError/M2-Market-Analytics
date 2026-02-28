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
import { Bell, Trash2, BellOff, Plus } from 'lucide-react';

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

interface PercentageAlert {
  id: number;
  watchlist_id: number;
  metric_a: string;
  metric_b: string;
  threshold_pct: number;
  is_active: number;
  last_triggered_at: string | null;
  created_at: string | null;
}

interface PriceChartProps {
  itemName: string;
  data: PricePoint[];
  watchlistId?: number | null;
  percentageAlerts?: PercentageAlert[];
  onCreatePercentageAlert?: (watchlistId: number, metricA: string, metricB: string, thresholdPct: number) => void;
  onDeletePercentageAlert?: (alertId: number) => void;
  onTogglePercentageAlert?: (alertId: number) => void;
  overrideVisibleSeries?: Record<string, boolean> | null;
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

const METRIC_OPTIONS = [
  { value: 'min', label: 'Minimum' },
  { value: 'avg_bottom20', label: 'Ø Günstigste 20%' },
  { value: 'avg', label: 'Ø Preis (alle)' },
];

export default function PriceChart({
  itemName,
  data,
  watchlistId,
  percentageAlerts = [],
  onCreatePercentageAlert,
  onDeletePercentageAlert,
  onTogglePercentageAlert,
  overrideVisibleSeries,
}: PriceChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    avg: true,
    bottom20: true,
    min: true,
  });

  // Alert creation form state
  const [newMetricA, setNewMetricA] = useState('min');
  const [newMetricB, setNewMetricB] = useState('avg_bottom20');
  const [newThreshold, setNewThreshold] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const labels = data.map(d => {
    try {
      // API returns SQLite UTC timestamps like "2026-02-01 15:53:20". 
      // Force it to be parsed as UTC by changing space to T and appending Z
      const safeIsoString = d.timestamp.replace(' ', 'T') + (d.timestamp.endsWith('Z') ? '' : 'Z');
      const date = new Date(safeIsoString);
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

  // Use override if provided (auto mode), otherwise use local state
  const effectiveSeries = overrideVisibleSeries
    ? overrideVisibleSeries as Record<SeriesKey, boolean>
    : visibleSeries;

  const chartData = {
    labels,
    datasets: allDatasets.filter(ds => effectiveSeries[ds._seriesKey as SeriesKey]),
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

  const handleCreateAlert = () => {
    if (!watchlistId || !onCreatePercentageAlert || !newThreshold) return;
    const pct = parseFloat(newThreshold);
    if (isNaN(pct) || pct <= 0) return;
    if (newMetricA === newMetricB) return;
    onCreatePercentageAlert(watchlistId, newMetricA, newMetricB, pct);
    setNewThreshold('');
    setShowAlertForm(false);
  };

  const getMetricLabel = (metric: string) => {
    return METRIC_OPTIONS.find(m => m.value === metric)?.label || metric;
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

      {/* Percentage Alert Configuration – below the chart */}
      {watchlistId && onCreatePercentageAlert && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Bell size={14} className="text-purple-400" />
              Abweichungs-Alerts
              {percentageAlerts.length > 0 && (
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400">
                  {percentageAlerts.filter(a => a.is_active).length} aktiv
                </span>
              )}
            </h4>
            <button
              onClick={() => setShowAlertForm(!showAlertForm)}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Plus size={12} />
              {showAlertForm ? 'Abbrechen' : 'Neuer Alert'}
            </button>
          </div>

          {/* Alert creation form */}
          {showAlertForm && (
            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-3">
              <p className="text-xs text-slate-500">
                Benachrichtigung wenn die Abweichung zwischen zwei Metriken einen Schwellenwert überschreitet.
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[11px] text-slate-500 block mb-1">Metrik A</label>
                  <select
                    value={newMetricA}
                    onChange={e => setNewMetricA(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {METRIC_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="text-slate-500 text-sm pb-1.5">weicht</div>
                <div className="w-24">
                  <label className="text-[11px] text-slate-500 block mb-1">Schwelle %</label>
                  <input
                    type="number"
                    placeholder="z.B. 15"
                    value={newThreshold}
                    onChange={e => setNewThreshold(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div className="text-slate-500 text-sm pb-1.5">% von</div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[11px] text-slate-500 block mb-1">Metrik B</label>
                  <select
                    value={newMetricB}
                    onChange={e => setNewMetricB(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {METRIC_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCreateAlert}
                  disabled={!newThreshold || parseFloat(newThreshold) <= 0 || newMetricA === newMetricB}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <Bell size={14} />
                  Erstellen
                </button>
              </div>
              {newMetricA === newMetricB && (
                <p className="text-xs text-red-400">Metrik A und B müssen unterschiedlich sein.</p>
              )}
            </div>
          )}

          {/* Active percentage alerts list */}
          {percentageAlerts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {percentageAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${alert.is_active
                    ? 'border-purple-600/40 bg-purple-600/10 text-purple-300'
                    : 'border-slate-700 bg-slate-800 text-slate-500'
                    }`}
                >
                  📐
                  <span className="font-medium">{getMetricLabel(alert.metric_a)}</span>
                  <span className="text-[10px] opacity-60">↔</span>
                  <span className="font-medium">{getMetricLabel(alert.metric_b)}</span>
                  <span className="text-purple-400 font-bold">{alert.threshold_pct}%</span>
                  {onTogglePercentageAlert && (
                    <button
                      onClick={() => onTogglePercentageAlert(alert.id)}
                      className="ml-1 hover:text-white transition-colors"
                      title={alert.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {alert.is_active ? <Bell size={12} /> : <BellOff size={12} />}
                    </button>
                  )}
                  {onDeletePercentageAlert && (
                    <button
                      onClick={() => onDeletePercentageAlert(alert.id)}
                      className="hover:text-red-400 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  {alert.last_triggered_at && (
                    <span className="text-[10px] text-slate-500 ml-1">
                      Letzter: {new Date(alert.last_triggered_at.replace(' ', 'T') + (alert.last_triggered_at.endsWith('Z') ? '' : 'Z')).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
