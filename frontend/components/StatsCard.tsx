import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export default function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 font-medium">{title}</h3>
        <Icon className="text-blue-500" size={20} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {trend && (
        <div className="text-green-500 text-sm mt-1">
          {trend}
        </div>
      )}
    </div>
  );
}
