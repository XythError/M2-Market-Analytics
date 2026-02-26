import React from 'react';
import { Listing } from '@/lib/api';
import { UserX, Star } from 'lucide-react';

interface ListingTableProps {
  listings: Listing[];
  fakeSellerNames?: Set<string>;
  onFlagSeller?: (sellerName: string) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (itemName: string) => void;
}

// Max bonus values map (German — matches STAT_MAP from metin2alerts)
const MAX_BONUSES: Record<string, number> = {
  // Stats
  "Stärke": 12,
  "Intelligenz": 12,
  "Vitalität": 12,
  "Beweglichkeit": 12,
  "Max. TP": 2000,
  "Max. MP": 2000,

  // Combat speeds
  "Angriffsgeschwindigkeit": 8,
  "Zaubergeschwindigkeit": 20,
  "Angriffswert": 50,

  // Critical / Penetrate
  "Chance auf krit. Treffer": 10,
  "Chance auf durchbohrenden Treffer": 10,
  "Vergiftungschance": 8,
  "Ohnmachtschance": 8,
  "Verlangsamungschance": 8,

  // Strong Against (Stark gegen)
  "Stark gegen Halbmenschen": 10,
  "Stark gegen Tiere": 20,
  "Stark gegen Orks": 20,
  "Stark gegen Esoterische": 20,
  "Stark gegen Untote": 20,
  "Stark gegen Teufel": 20,
  "Stark gegen Monster": 25,
  "Stark gegen Krieger": 10,
  "Stark gegen Ninja": 10,
  "Stark gegen Sura": 10,
  "Stark gegen Schamanen": 10,
  "Stark gegen Lykaner": 10,
  "Stark gegen Zodiakmonster": 10,
  "Stark gegen Insekten": 10,
  "Stark gegen Wüstenmonster": 10,
  "Stark gegen Metinsteine": 10,
  "Stark gegen Mysterien": 10,
  "Stark gegen Drachen": 10,
  "Stark gegen Mondschatten": 10,

  // Defenses
  "Schwertverteidigung": 15,
  "Zweihänderverteidigung": 15,
  "Dolchverteidigung": 15,
  "Glockenverteidigung": 15,
  "Fächerverteidigung": 15,
  "Pfeilverteidigung": 15,
  "Krallenverteidigung": 15,

  // Resistances
  "Feuerwiderstand": 15,
  "Blitzwiderstand": 15,
  "Magiewiderstand": 15,
  "Windwiderstand": 15,
  "Eiswiderstand": 15,
  "Erdwiderstand": 15,
  "Widerstand gegen Dunkelheit": 15,
  "Giftwiderstand": 15,

  // Absorption
  "Schaden wird von TP absorbiert": 10,
  "Schaden wird von MP absorbiert": 10,
  "Nahkampftreffer zu reflektieren": 15,
  "Nahkampfangriff abzublocken": 15,

  // Regeneration
  "TP-Regeneration": 30,
  "MP-Regeneration": 30,

  // Skill damage
  "Fertigkeitsschaden": 20,
  "Durchschn. Schaden": 50,

  // EXP / Drop
  "Chance auf EXP-Bonus": 20,
  "doppelte Menge von Gegenständen": 20,
  "doppelte Menge Yang": 20,

  // Elemental powers
  "Kraft der Blitze": 10,
  "Kraft des Feuers": 10,
  "Kraft des Eises": 10,
  "Kraft des Windes": 10,
  "Kraft der Erde": 10,
  "Kraft der Dunkelheit": 10,

  // Boss damage
  "Angriffsschaden gegen Bosse": 10,
  "Fertigkeitsschaden gegen Bosse": 10,

  // Defense class
  "Abwehrchance gegen Kriegerangriffe": 10,
  "Abwehrchance gegen Ninjaangriffe": 10,
  "Abwehrchance gegen Suraangriffe": 10,
  "Abwehrchance gegen Schamanenangriffe": 10,
  "Abwehrchance gegen Lykaner": 10,

  // Widerstand gegen krit./durchbohrend
  "Widerstand gegen kritischen Treffer": 10,
  "Widerstand gegen durchbohrenden Treffer": 10,
  "Widerstand gegen Blutungsangriff": 10,
  "Blutungsangriff": 10,
};

// Helper to extract numeric value from bonus string and check against max
const isMaxBonus = (bonusStr: string): boolean => {
  const normalizedBonus = bonusStr.toLowerCase();
  
  for (const [key, maxVal] of Object.entries(MAX_BONUSES)) {
    const normalizedKey = key.toLowerCase();
    
    if (normalizedBonus.includes(normalizedKey)) {
      // Extract number: look for digits (including negative)
      const matches = bonusStr.match(/(-?\d+)/g);
      if (matches) {
        for (const m of matches) {
           if (parseInt(m) >= maxVal) return true;
        }
      }
    }
  }
  return false;
};

export default function ListingTable({ listings, fakeSellerNames, onFlagSeller, favorites, onToggleFavorite }: ListingTableProps) {
  return (
    <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
      <table className="w-full text-left text-sm text-slate-400">
        <thead className="bg-slate-900 text-slate-200 uppercase font-medium">
          <tr>
            <th className="px-6 py-4">Item Name & Bonuses</th>
            <th className="px-6 py-4">Qty</th>
            <th className="px-6 py-4">Price (Won)</th>
            <th className="px-6 py-4">Price (Yang)</th>
            <th className="px-6 py-4">Seller</th>
            <th className="px-6 py-4">Seen At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {listings.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                No listings found.
              </td>
            </tr>
          ) : (
            listings.map((listing) => {
              const isFake = fakeSellerNames?.has(listing.seller_name) ?? false;
              return (
              <tr key={listing.id} className={`hover:bg-slate-700/50 transition-colors ${isFake ? 'opacity-40 line-through decoration-red-500/50' : ''}`}>
                <td className="px-6 py-4 align-top">
                    <div className="font-bold text-white text-base mb-2 flex items-center gap-2">
                        {onToggleFavorite && (
                          <button
                            onClick={() => onToggleFavorite(listing.item.name)}
                            className="flex-shrink-0 p-0.5 rounded transition-colors hover:scale-110"
                            title={favorites?.has(listing.item.name) ? 'Favorit entfernen' : 'Als Favorit markieren'}
                          >
                            <Star
                              size={16}
                              className={favorites?.has(listing.item.name)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-600 hover:text-yellow-400'}
                            />
                          </button>
                        )}
                        {listing.item.name}
                    </div>
                    {listing.bonuses && listing.bonuses.length > 0 && (
                        <ul className="space-y-1">
                            {listing.bonuses.map((bonus, idx) => {
                                const isMax = isMaxBonus(bonus.bonus_name);
                                return (
                                    <li 
                                        key={idx} 
                                        className={`text-xs px-2 py-0.5 rounded w-fit ${
                                            isMax 
                                            ? "text-purple-400 font-bold bg-purple-900/30 border border-purple-500/30" 
                                            : "text-slate-400 bg-slate-800/50"
                                        }`}
                                    >
                                        {bonus.bonus_name}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </td>
                <td className="px-6 py-4 align-top">{listing.quantity}</td>
                <td className="px-6 py-4 text-yellow-500 font-bold align-top text-lg">{listing.price_won} W</td>
                <td className="px-6 py-4 align-top">{listing.price_yang.toLocaleString()}</td>
                <td className="px-6 py-4 align-top">
                  <div className="flex items-center gap-2">
                    <span className={isFake ? 'text-red-400' : 'text-blue-400'}>{listing.seller_name}</span>
                    {isFake ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-600/30 whitespace-nowrap">FAKE</span>
                    ) : onFlagSeller ? (
                      <button
                        onClick={() => onFlagSeller(listing.seller_name)}
                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title={`"${listing.seller_name}" als Fake markieren`}
                      >
                        <UserX size={14} />
                      </button>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 align-top text-xs">
                  {new Date(listing.seen_at).toLocaleString()}
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}