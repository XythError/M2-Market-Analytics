"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import ListingTable from '@/components/ListingTable';
import PriceChart from '@/components/PriceChart';
import FavoritesList from '@/components/FavoritesList';
import { getListings, getTopItems, getPriceHistory, triggerScrape, getServers, getWatchlist, addWatchlistItem, removeWatchlistItem, toggleWatchlistItem, getTelegramSettings, saveTelegramSettings, toggleTelegram, testTelegram, createAlert, deleteAlert, toggleAlert, getFakeSellers, addFakeSeller, removeFakeSeller, Listing, PricePoint, WatchlistItem, TelegramSettings, PriceAlert, FakeSeller } from '@/lib/api';
import { TrendingUp, ShoppingCart, Server, LineChart, Search, RefreshCw, ChevronDown, Clock, Plus, Trash2, Power, List, Bell, BellOff, Send, Settings, AlertTriangle, UserX, Star } from 'lucide-react';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [topItems, setTopItems] = useState<{name: string, count: number}[]>([]);
  const [servers, setServers] = useState<{id: string, name: string, group: string, has_data: boolean}[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("Chimera");
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedItemForChart, setSelectedItemForChart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [upgradeFilter, setUpgradeFilter] = useState<string>("ALL");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [watchlistInterval, setWatchlistInterval] = useState(20);
  const [showWatchlist, setShowWatchlist] = useState(false);

  // Telegram state
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings | null>(null);
  const [showTelegramPanel, setShowTelegramPanel] = useState(false);
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTestMsg, setTgTestMsg] = useState<string | null>(null);

  // Alert state
  const [alertModal, setAlertModal] = useState<{ watchlistId: number; query: string } | null>(null);
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertPriceType, setAlertPriceType] = useState<"yang" | "won">("yang");
  const [alertDirection, setAlertDirection] = useState<"below" | "above">("below");

  // Fake sellers state
  const [fakeSellers, setFakeSellers] = useState<FakeSeller[]>([]);
  const [showFakeSellers, setShowFakeSellers] = useState(false);
  const [newFakeSellerName, setNewFakeSellerName] = useState("");
  const [newFakeSellerReason, setNewFakeSellerReason] = useState("");

  // Favorites state (persisted in localStorage)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('m2_favorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Persist favorites to localStorage on change
  const saveFavorites = (updated: string[]) => {
    setFavorites(updated);
    try { localStorage.setItem('m2_favorites', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const toggleFavorite = (itemName: string) => {
    const updated = favorites.includes(itemName)
      ? favorites.filter(f => f !== itemName)
      : [...favorites, itemName];
    saveFavorites(updated);
  };

  const removeFavorite = (itemName: string) => {
    saveFavorites(favorites.filter(f => f !== itemName));
  };

  const favoritesSet = new Set(favorites);

  // Helper to extract plus value from item name
  const getPlusValue = (name: string): number | null => {
    // Looks for + followed by digits, ideally at the end or before a bracket
    const match = name.match(/\+(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const fetchData = async (filter?: string | null, serverName?: string) => {
      setLoading(true);
      setErrorMsg(null);
      const currentServer = serverName || selectedServer;
      try {
        const [listingsData, topItemsData, serversData, watchlistData, tgData, fakeSellersData] = await Promise.all([
          getListings(filter || undefined, currentServer),
          getTopItems(),
          getServers(),
          getWatchlist(),
          getTelegramSettings(),
          getFakeSellers()
        ]);
        setListings(listingsData);
        setTopItems(topItemsData);
        setServers(serversData);
        setWatchlist(watchlistData);
        setFakeSellers(fakeSellersData);
        if (tgData) {
          setTelegramSettings(tgData);
          setTgBotToken(tgData.bot_token);
          setTgChatId(tgData.chat_id);
        }

        if (topItemsData.length > 0 && !selectedItemForChart) {
            setSelectedItemForChart(topItemsData[0].name);
            const history = await getPriceHistory(topItemsData[0].name);
            setPriceHistory(history);
        }
      } catch (error: any) {
        console.error("Failed to fetch data:", error);
        setErrorMsg(error.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData(null, selectedServer);
  }, [selectedServer]);

  const handleScrape = async () => {
      if (!searchQuery) return;
      setScraping(true);
      try {
          await triggerScrape(searchQuery, selectedServer);
          // Set filter to the searched item and refresh
          setActiveFilter(searchQuery);
          await fetchData(searchQuery, selectedServer);
          // Don't clear searchQuery so user sees what they searched
      } catch (e: any) {
          alert("Scrape failed: " + e.message);
      } finally {
          setScraping(false);
      }
  };

  const clearFilter = () => {
      setActiveFilter(null);
      setSearchQuery("");
      setUpgradeFilter("ALL");
      fetchData(null);
  };

  // Handle clicking a top item to view its chart
  const handleTopItemClick = async (itemName: string) => {
      setSelectedItemForChart(itemName);
      try {
          const history = await getPriceHistory(itemName);
          setPriceHistory(history);
      } catch (e) {
          console.error("Failed to fetch history for", itemName, e);
      }
  };

  // ── Watchlist handlers ──
  const handleAddToWatchlist = async () => {
      if (!watchlistQuery.trim()) return;
      try {
          await addWatchlistItem(watchlistQuery.trim(), selectedServer, watchlistInterval);
          setWatchlistQuery("");
          const updated = await getWatchlist();
          setWatchlist(updated);
      } catch (e: any) {
          const detail = e?.response?.data?.detail;
          alert(detail || "Failed to add item");
      }
  };

  const handleRemoveWatchlist = async (id: number) => {
      try {
          await removeWatchlistItem(id);
          setWatchlist(prev => prev.filter(w => w.id !== id));
      } catch { /* ignore */ }
  };

  const handleToggleWatchlist = async (id: number) => {
      try {
          const updated = await toggleWatchlistItem(id);
          setWatchlist(prev => prev.map(w => w.id === id ? { ...w, is_active: updated.is_active } : w));
      } catch { /* ignore */ }
  };

  // ── Telegram handlers ──
  const handleSaveTelegram = async () => {
    if (!tgBotToken.trim() || !tgChatId.trim()) return;
    setTgSaving(true);
    try {
      const saved = await saveTelegramSettings(tgBotToken.trim(), tgChatId.trim());
      setTelegramSettings(saved);
      setTgTestMsg("Einstellungen gespeichert!");
      setTimeout(() => setTgTestMsg(null), 3000);
    } catch (e: any) {
      setTgTestMsg("Fehler beim Speichern");
    } finally {
      setTgSaving(false);
    }
  };

  const handleToggleTelegram = async () => {
    try {
      const updated = await toggleTelegram();
      setTelegramSettings(prev => prev ? { ...prev, is_active: updated.is_active } : prev);
    } catch { /* ignore */ }
  };

  const handleTestTelegram = async () => {
    setTgTestMsg("Sende Testnachricht...");
    try {
      await testTelegram();
      setTgTestMsg("✅ Testnachricht gesendet!");
    } catch (e: any) {
      setTgTestMsg("❌ " + (e?.response?.data?.detail || "Fehler"));
    }
    setTimeout(() => setTgTestMsg(null), 4000);
  };

  // ── Alert handlers ──
  const handleCreateAlert = async () => {
    if (!alertModal || !alertThreshold) return;
    const threshold = parseInt(alertThreshold);
    if (isNaN(threshold) || threshold <= 0) return;
    try {
      await createAlert(alertModal.watchlistId, threshold, alertPriceType, alertDirection);
      // Refresh watchlist to get updated alerts
      const updated = await getWatchlist();
      setWatchlist(updated);
      setAlertModal(null);
      setAlertThreshold("");
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Fehler beim Erstellen des Alerts");
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    try {
      await deleteAlert(alertId);
      const updated = await getWatchlist();
      setWatchlist(updated);
    } catch { /* ignore */ }
  };

  const handleToggleAlert = async (alertId: number) => {
    try {
      await toggleAlert(alertId);
      const updated = await getWatchlist();
      setWatchlist(updated);
    } catch { /* ignore */ }
  };

  // ── Fake Sellers handlers ──
  const fakeSellerNames = new Set(fakeSellers.map(fs => fs.seller_name));

  const handleAddFakeSeller = async () => {
    if (!newFakeSellerName.trim()) return;
    try {
      await addFakeSeller(newFakeSellerName.trim(), newFakeSellerReason.trim() || undefined);
      setNewFakeSellerName("");
      setNewFakeSellerReason("");
      const updated = await getFakeSellers();
      setFakeSellers(updated);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      alert(detail || "Fehler beim Hinzufügen");
    }
  };

  const handleRemoveFakeSeller = async (id: number) => {
    try {
      await removeFakeSeller(id);
      setFakeSellers(prev => prev.filter(fs => fs.id !== id));
    } catch { /* ignore */ }
  };

  const handleFlagSellerFromListing = async (sellerName: string) => {
    if (fakeSellerNames.has(sellerName)) return;
    try {
      await addFakeSeller(sellerName, "Flagged from listing table");
      const updated = await getFakeSellers();
      setFakeSellers(updated);
    } catch { /* ignore */ }
  };

  // Filter listings based on upgrade level
  const filteredListings = listings.filter(item => {
      const plus = getPlusValue(item.item.name);
      
      if (upgradeFilter === "ALL") return true;
      if (upgradeFilter === "MATERIAL") return plus === null;
      if (upgradeFilter === "0-6") return plus !== null && plus >= 0 && plus <= 6;
      if (upgradeFilter === "7-8") return plus !== null && plus >= 7 && plus <= 8;
      if (upgradeFilter === "9") return plus === 9;
      if (upgradeFilter === "10+") return plus !== null && plus >= 10;
      return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />
      
      <main className="container mx-auto p-6 space-y-8">
        {/* Search & Scrape Control */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full">
                    <h3 className="text-lg font-semibold text-white mb-2">Track New Item</h3>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Enter item name (e.g. Kılıç, Dolunay)" 
                            className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                        />
                        <button 
                            onClick={handleScrape}
                            disabled={scraping || !searchQuery}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded flex items-center gap-2 font-medium transition-colors"
                        >
                            {scraping ? <RefreshCw className="animate-spin" size={20}/> : <Search size={20}/>}
                            {scraping ? "Scanning..." : "Scan Market"}
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-slate-400 text-sm self-end mb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Marmara Server
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Live Scraper
                    </div>
                </div>
            </div>

            {/* Upgrade Level Filter */}
            <div className="border-t border-slate-700 pt-4">
                <span className="text-sm text-slate-400 mr-4">Filter by Level:</span>
                <div className="inline-flex flex-wrap gap-2">
                    {[
                        { id: "ALL", label: "All Items" },
                        { id: "MATERIAL", label: "Materials (No +)" },
                        { id: "0-6", label: "+0 to +6" },
                        { id: "7-8", label: "+7 to +8" },
                        { id: "9", label: "+9 Only" },
                        { id: "10+", label: "+10 & Higher" }
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setUpgradeFilter(filter.id)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                                upgradeFilter === filter.id 
                                ? "bg-blue-600 text-white font-medium" 
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Telegram Settings Panel */}
          <div className="md:col-span-3 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setShowTelegramPanel(!showTelegramPanel)}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-slate-700/50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Send className="text-sky-400" size={20} />
                <h3 className="text-lg font-semibold">Telegram Benachrichtigungen</h3>
                {telegramSettings && (
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    telegramSettings.is_active ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                  }`}>
                    {telegramSettings.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                )}
              </div>
              <ChevronDown className={`text-slate-400 transition-transform ${showTelegramPanel ? 'rotate-180' : ''}`} size={18} />
            </button>

            {showTelegramPanel && (
              <div className="border-t border-slate-700 p-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Erstelle einen Bot via <a href="https://t.me/BotFather" target="_blank" className="text-sky-400 underline">@BotFather</a> und sende dem Bot eine Nachricht. Nutze <a href="https://api.telegram.org" target="_blank" className="text-sky-400 underline">getUpdates</a> um deine Chat-ID zu erhalten.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Bot Token (z.B. 123456:ABC-DEF...)"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-sky-500 font-mono"
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Chat ID (z.B. 123456789)"
                    className="w-48 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-sky-500 font-mono"
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                  />
                  <button
                    onClick={handleSaveTelegram}
                    disabled={tgSaving || !tgBotToken.trim() || !tgChatId.trim()}
                    className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    <Settings size={16} />
                    {tgSaving ? "Speichern..." : "Speichern"}
                  </button>
                </div>
                {telegramSettings && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleToggleTelegram}
                      className={`px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                        telegramSettings.is_active
                          ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                          : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                      }`}
                    >
                      <Power size={14} />
                      {telegramSettings.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={handleTestTelegram}
                      className="px-4 py-1.5 rounded text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <Send size={14} />
                      Testnachricht senden
                    </button>
                    {tgTestMsg && <span className="text-sm text-slate-400">{tgTestMsg}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fake Sellers Management Panel */}
          <div className="md:col-span-3 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setShowFakeSellers(!showFakeSellers)}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-slate-700/50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <UserX className="text-red-400" size={20} />
                <h3 className="text-lg font-semibold">Fake Seller Blacklist</h3>
                <span className="ml-2 bg-red-600/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                  {fakeSellers.length} geflaggt
                </span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform ${showFakeSellers ? 'rotate-180' : ''}`} size={18} />
            </button>

            {showFakeSellers && (
              <div className="border-t border-slate-700 p-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Hier kannst du Seller als &quot;Fake&quot; markieren. Ihre Angebote werden automatisch aus der Preisberechnung (Minimum, Durchschnitt, Bottom 20%) und den Preis-Alerts gefiltert. Die Listings bleiben sichtbar, werden aber gekennzeichnet.
                </p>

                {/* Add fake seller form */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Seller Name (exakt wie im Markt)"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-red-500"
                    value={newFakeSellerName}
                    onChange={(e) => setNewFakeSellerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFakeSeller()}
                  />
                  <input
                    type="text"
                    placeholder="Grund (optional)"
                    className="w-64 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                    value={newFakeSellerReason}
                    onChange={(e) => setNewFakeSellerReason(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFakeSeller()}
                  />
                  <button
                    onClick={handleAddFakeSeller}
                    disabled={!newFakeSellerName.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                  >
                    <UserX size={18} />
                    Flaggen
                  </button>
                </div>

                {/* Fake sellers list */}
                {fakeSellers.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-4">Keine Seller geflaggt.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {fakeSellers.map(fs => (
                      <div
                        key={fs.id}
                        className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border border-red-600/40 bg-red-600/10 text-red-300"
                      >
                        <UserX size={14} />
                        <span className="font-medium">{fs.seller_name}</span>
                        {fs.reason && <span className="text-[10px] text-red-400/60">({fs.reason})</span>}
                        <button
                          onClick={() => handleRemoveFakeSeller(fs.id)}
                          className="ml-1 hover:text-white transition-colors"
                          title="Entfernen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Watchlist Management Panel */}
          <div className="md:col-span-3 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setShowWatchlist(!showWatchlist)}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-slate-700/50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <List className="text-emerald-500" size={20} />
                <h3 className="text-lg font-semibold">Auto-Scrape Watchlist</h3>
                <span className="ml-2 bg-emerald-600/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                  {watchlist.filter(w => w.is_active).length} active
                </span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform ${showWatchlist ? 'rotate-180' : ''}`} size={18} />
            </button>

            {showWatchlist && (
              <div className="border-t border-slate-700 p-4 space-y-4">
                {/* Add to watchlist form */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Item name (e.g. Vollmond, gift, Roteisenklinge)"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    value={watchlistQuery}
                    onChange={(e) => setWatchlistQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToWatchlist()}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-sm whitespace-nowrap">Interval:</label>
                    <select
                      value={watchlistInterval}
                      onChange={(e) => setWatchlistInterval(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={10}>10 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>1 h</option>
                      <option value={120}>2 h</option>
                      <option value={360}>6 h</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddToWatchlist}
                    disabled={!watchlistQuery.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Items werden automatisch auf dem aktuell gewählten Server (<span className="text-white">{selectedServer}</span>) gescraped. Ohne &quot;+&quot; wird +0 bis +9 gescanned.
                </p>

                {/* Watchlist table */}
                {watchlist.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-4">Watchlist ist leer – füge ein Item hinzu.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                          <th className="text-left py-2 px-3">Item</th>
                          <th className="text-left py-2 px-3">Server</th>
                          <th className="text-center py-2 px-3">Interval</th>
                          <th className="text-center py-2 px-3">Letzter Scan</th>
                          <th className="text-center py-2 px-3">Alerts</th>
                          <th className="text-center py-2 px-3">Status</th>
                          <th className="text-right py-2 px-3">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {watchlist.map(item => (
                          <React.Fragment key={item.id}>
                            <tr className={`border-b border-slate-700/50 ${item.is_active ? '' : 'opacity-50'}`}>
                              <td className="py-2 px-3 text-white font-medium">{item.query}</td>
                              <td className="py-2 px-3 text-slate-300">{item.server_name}</td>
                              <td className="py-2 px-3 text-center text-slate-300">
                                <span className="inline-flex items-center gap-1"><Clock size={14} /> {item.interval_minutes}m</span>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-400">
                                {item.last_scraped_at 
                                  ? new Date(item.last_scraped_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                  : '—'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {item.alerts && item.alerts.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400">
                                    <Bell size={12} /> {item.alerts.filter(a => a.is_active).length}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                  item.is_active 
                                    ? 'bg-emerald-600/20 text-emerald-400' 
                                    : 'bg-red-600/20 text-red-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                  {item.is_active ? 'Aktiv' : 'Pausiert'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setAlertModal({ watchlistId: item.id, query: item.query })}
                                    className="p-1.5 rounded text-amber-400 hover:bg-amber-400/10 transition-colors"
                                    title="Preis-Alert hinzufügen"
                                  >
                                    <Bell size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleToggleWatchlist(item.id)}
                                    className={`p-1.5 rounded transition-colors ${
                                      item.is_active 
                                        ? 'text-yellow-400 hover:bg-yellow-400/10' 
                                        : 'text-emerald-400 hover:bg-emerald-400/10'
                                    }`}
                                    title={item.is_active ? 'Pausieren' : 'Aktivieren'}
                                  >
                                    <Power size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveWatchlist(item.id)}
                                    className="p-1.5 rounded text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Entfernen"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* Inline alerts for this item */}
                            {item.alerts && item.alerts.length > 0 && (
                              <tr className="bg-slate-900/50">
                                <td colSpan={7} className="px-6 py-2">
                                  <div className="flex flex-wrap gap-2">
                                    {item.alerts.map(alert => (
                                      <div
                                        key={alert.id}
                                        className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
                                          alert.is_active
                                            ? 'border-amber-600/40 bg-amber-600/10 text-amber-300'
                                            : 'border-slate-700 bg-slate-800 text-slate-500'
                                        }`}
                                      >
                                        {alert.direction === 'below' ? '⬇️' : '⬆️'}
                                        <span className="font-medium">{alert.price_threshold.toLocaleString('de-DE')}</span>
                                        <span className="text-[10px] uppercase">{alert.price_type}</span>
                                        <button
                                          onClick={() => handleToggleAlert(alert.id)}
                                          className="ml-1 hover:text-white transition-colors"
                                          title={alert.is_active ? 'Deaktivieren' : 'Aktivieren'}
                                        >
                                          {alert.is_active ? <Bell size={12} /> : <BellOff size={12} />}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAlert(alert.id)}
                                          className="hover:text-red-400 transition-colors"
                                          title="Löschen"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                        {alert.last_triggered_at && (
                                          <span className="text-[10px] text-slate-500 ml-1">
                                            Letzter: {new Date(alert.last_triggered_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          <StatsCard 
            title="Total Listings" 
            value={filteredListings.length} 
            icon={ShoppingCart} 
            trend={upgradeFilter !== "ALL" ? "Filtered View" : "+12% from yesterday"}
          />
          
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 relative group">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-medium">Selected Server</h3>
                <Server className="text-blue-500" size={20} />
            </div>
            <div className="relative">
                <select 
                    value={selectedServer}
                    onChange={(e) => setSelectedServer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-bold appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                    {(() => {
                        const groups = ['Ruby', 'Sapphire', 'Turkey', 'International', 'Regional'];
                        return groups.map(group => {
                            const groupServers = servers.filter(s => s.group === group);
                            if (groupServers.length === 0) return null;
                            return (
                                <optgroup key={group} label={group}>
                                    {groupServers.map(server => (
                                        <option key={server.id} value={server.name}>
                                            {server.name}{server.has_data ? '' : ' (no data)'}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        });
                    })()}
                    {servers.length === 0 && <option value="Chimera">Chimera</option>}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
            </div>
            <div className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Switching filters results automatically
            </div>
          </div>

          <StatsCard 
            title="Most Traded Item" 
            value={topItems[0]?.name || "N/A"} 
            icon={TrendingUp} 
            trend={topItems[0] ? `${topItems[0].count} listings` : ""}
          />
        </div>

        {/* Charts Section (New) */}
        {selectedItemForChart && (
            <div className="w-full">
                <div className="flex items-center gap-2 mb-4">
                    <LineChart className="text-blue-500" size={24} />
                    <h2 className="text-xl font-bold text-white">Market Analysis: {selectedItemForChart}</h2>
                </div>
                <div className="h-[400px]">
                    <PriceChart itemName={selectedItemForChart} data={priceHistory} />
                </div>
            </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Listings Table (Wide) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="text-blue-500" size={20} />
                  {activeFilter ? `Results for "${activeFilter}"` : "Recent Market Listings"}
                </h2>
                {activeFilter && (
                    <button 
                        onClick={clearFilter}
                        className="text-sm text-red-400 hover:text-red-300 underline"
                    >
                        Clear Filter (Show All)
                    </button>
                )}
            </div>
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-4">
                    Error loading data: {errorMsg}
                </div>
            )}
            {loading ? (
               <div className="text-center py-10 text-slate-500">Loading market data...</div>
            ) : (
               <ListingTable listings={filteredListings} fakeSellerNames={fakeSellerNames} onFlagSeller={handleFlagSellerFromListing} favorites={favoritesSet} onToggleFavorite={toggleFavorite} />
            )}
          </div>

          {/* Sidebar / Favorites + Top Items */}
          <div className="space-y-4">
            {/* Favorites Section */}
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="text-yellow-400" size={20} />
              Favoriten
              {favorites.length > 0 && (
                <span className="ml-2 bg-yellow-600/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </h2>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <FavoritesList
                favorites={favorites}
                onSelectItem={handleTopItemClick}
                onRemoveFavorite={removeFavorite}
                selectedItem={selectedItemForChart}
              />
            </div>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-green-500" size={20} />
              Top Trending Items
            </h2>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              {topItems.length === 0 ? (
                <div className="text-slate-500 text-sm">No trending data yet.</div>
              ) : (
                <ul className="space-y-3">
                  {topItems.map((item, idx) => (
                    <li 
                        key={idx} 
                        className="flex justify-between items-center border-b border-slate-700 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-700/50 p-2 rounded transition-colors"
                        onClick={() => handleTopItemClick(item.name)}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.name); }}
                          className="flex-shrink-0 p-0.5 rounded transition-colors hover:scale-110"
                          title={favoritesSet.has(item.name) ? 'Favorit entfernen' : 'Als Favorit markieren'}
                        >
                          <Star
                            size={14}
                            className={favoritesSet.has(item.name)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-600 hover:text-yellow-400'}
                          />
                        </button>
                        <span className="text-slate-300 font-medium">{idx + 1}. {item.name}</span>
                      </div>
                      <span className="text-blue-400 font-bold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="text-xs text-slate-500 text-center">
                Click an item to view price history
            </div>
          </div>

        </div>

        {/* Price Alert Modal */}
        {alertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="text-amber-400" size={22} />
                <h3 className="text-lg font-bold text-white">Preis-Alert erstellen</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Alert für <span className="text-white font-medium">&quot;{alertModal.query}&quot;</span>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Preis-Schwelle</label>
                  <input
                    type="number"
                    placeholder="z.B. 500000"
                    className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Währung</label>
                    <select
                      value={alertPriceType}
                      onChange={(e) => setAlertPriceType(e.target.value as "yang" | "won")}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="yang">Yang</option>
                      <option value="won">Won</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Richtung</label>
                    <select
                      value={alertDirection}
                      onChange={(e) => setAlertDirection(e.target.value as "below" | "above")}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="below">Unter (⬇️ Preis fällt)</option>
                      <option value="above">Über (⬆️ Preis steigt)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setAlertModal(null); setAlertThreshold(""); }}
                  className="px-4 py-2 rounded text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={!alertThreshold || parseInt(alertThreshold) <= 0}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Bell size={16} />
                  Alert erstellen
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
