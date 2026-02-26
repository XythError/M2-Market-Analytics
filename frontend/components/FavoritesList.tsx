import React from 'react';
import { Star, LineChart, Trash2 } from 'lucide-react';

interface FavoritesListProps {
  favorites: string[];
  onSelectItem: (itemName: string) => void;
  onRemoveFavorite: (itemName: string) => void;
  selectedItem: string | null;
}

export default function FavoritesList({ favorites, onSelectItem, onRemoveFavorite, selectedItem }: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-4">
        Keine Favoriten — markiere Items mit dem <Star size={14} className="inline text-yellow-500" /> Symbol.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {favorites.map((name) => (
        <li
          key={name}
          className={`flex items-center justify-between gap-2 p-2 rounded transition-colors cursor-pointer group ${
            selectedItem === name
              ? 'bg-yellow-600/20 border border-yellow-500/30'
              : 'hover:bg-slate-700/50 border border-transparent'
          }`}
        >
          <button
            onClick={() => onSelectItem(name)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
            title={`Chart für "${name}" anzeigen`}
          >
            <LineChart size={14} className={selectedItem === name ? 'text-yellow-400' : 'text-slate-500 group-hover:text-blue-400'} />
            <span className={`truncate text-sm font-medium ${selectedItem === name ? 'text-yellow-300' : 'text-slate-300'}`}>
              {name}
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveFavorite(name); }}
            className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
            title="Favorit entfernen"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
