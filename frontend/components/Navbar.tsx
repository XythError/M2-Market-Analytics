import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-500">
          <BarChart3 size={24} />
          <span className="text-xl font-bold text-white tracking-wider">METIN2 ANALYTICS</span>
        </div>
        <div className="text-slate-400 text-sm">
          Market Data Dashboard
        </div>
      </div>
    </nav>
  );
}
