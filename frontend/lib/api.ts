import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(request => {
  console.log('Starting Request', JSON.stringify(request, null, 2))
  return request
})

api.interceptors.response.use(response => {
  return response
}, error => {
  console.error("API Error:", error);
  return Promise.reject(error);
});

export interface Listing {
  id: number;
  item: {
    name: string;
    category: string;
    image_url: string | null;
  };
  server: {
    name: string;
  };
  seller_name: string;
  quantity: number;
  price_won: number;
  price_yang: number;
  total_price_yang: number;
  seen_at: string;
  bonuses: {
    bonus_name: string;
    bonus_value: string;
  }[];
}

export const getListings = async (itemName?: string, server?: string) => {
  const params: any = {};
  if (itemName) params.item_name = itemName;
  if (server) params.server = server;

  const response = await api.get<Listing[]>('/market/listings', { params });
  return response.data;
};

export const getServers = async () => {
  const response = await api.get<{ id: string, name: string, group: string, has_data: boolean }[]>('/market/servers');
  return response.data;
}

export const getTopItems = async () => {
  const response = await api.get<{ name: string, count: number }[]>('/market/stats/top-items');
  return response.data;
}

export interface PricePoint {
  timestamp: string;
  avg_unit_price: number;
  min_unit_price: number;
  avg_bottom20_price: number | null;
  total_listings: number;
}

export const getPriceHistory = async (itemName: string) => {
  const response = await api.get<PricePoint[]>('/market/stats/price-history', {
    params: { item_name: itemName }
  });
  return response.data;
}

export const triggerScrape = async (query: string, server: string) => {
  const response = await api.post<{ message: string, output?: string, error?: string }>('/scrape', { query, server });
  return response.data;
}

// ── Watchlist ──────────────────────────────────────────────────

export interface WatchlistItem {
  id: number;
  query: string;
  server_name: string;
  is_active: number;
  interval_minutes: number;
  last_scraped_at: string | null;
  created_at: string | null;
  alerts: PriceAlert[];
  percentage_alerts: PercentageAlert[];
}

export const getWatchlist = async () => {
  const response = await api.get<WatchlistItem[]>('/market/watchlist');
  return response.data;
}

export const addWatchlistItem = async (query: string, server_name: string, interval_minutes: number = 20) => {
  const response = await api.post<WatchlistItem>('/market/watchlist', { query, server_name, interval_minutes });
  return response.data;
}

export const removeWatchlistItem = async (id: number) => {
  const response = await api.delete(`/market/watchlist/${id}`);
  return response.data;
}

export const toggleWatchlistItem = async (id: number) => {
  const response = await api.patch(`/market/watchlist/${id}/toggle`);
  return response.data;
}

// ── Telegram Settings ──────────────────────────────────────────

export interface TelegramSettings {
  id: number;
  bot_token: string;
  chat_id: string;
  is_active: number;
  created_at: string | null;
}

export const getTelegramSettings = async (): Promise<TelegramSettings | null> => {
  const response = await api.get('/market/telegram/settings');
  return response.data;
}

export const saveTelegramSettings = async (bot_token: string, chat_id: string): Promise<TelegramSettings> => {
  const response = await api.post('/market/telegram/settings', { bot_token, chat_id });
  return response.data;
}

export const toggleTelegram = async () => {
  const response = await api.patch('/market/telegram/settings/toggle');
  return response.data;
}

export const testTelegram = async () => {
  const response = await api.post('/market/telegram/test');
  return response.data;
}

// ── Price Alerts ───────────────────────────────────────────────

export interface PriceAlert {
  id: number;
  watchlist_id: number;
  price_threshold: number;
  price_type: string;
  direction: string;
  is_active: number;
  last_triggered_at: string | null;
  created_at: string | null;
}

export const getAlerts = async (watchlist_id?: number): Promise<PriceAlert[]> => {
  const params: any = {};
  if (watchlist_id !== undefined) params.watchlist_id = watchlist_id;
  const response = await api.get('/market/alerts', { params });
  return response.data;
}

export const createAlert = async (watchlist_id: number, price_threshold: number, price_type: string = 'yang', direction: string = 'below'): Promise<PriceAlert> => {
  const response = await api.post('/market/alerts', { watchlist_id, price_threshold, price_type, direction });
  return response.data;
}

export const deleteAlert = async (id: number) => {
  const response = await api.delete(`/market/alerts/${id}`);
  return response.data;
}

export const toggleAlert = async (id: number) => {
  const response = await api.patch(`/market/alerts/${id}/toggle`);
  return response.data;
}

// ── Fake Sellers ───────────────────────────────────────────────

export interface FakeSeller {
  id: number;
  seller_name: string;
  reason: string | null;
  created_at: string | null;
}

export const getFakeSellers = async (): Promise<FakeSeller[]> => {
  const response = await api.get('/market/fake-sellers');
  return response.data;
}

export const addFakeSeller = async (seller_name: string, reason?: string): Promise<FakeSeller> => {
  const response = await api.post('/market/fake-sellers', { seller_name, reason: reason || null });
  return response.data;
}

export const removeFakeSeller = async (id: number) => {
  const response = await api.delete(`/market/fake-sellers/${id}`);
  return response.data;
}

// ── Percentage Alerts ──────────────────────────────────────────

export interface PercentageAlert {
  id: number;
  watchlist_id: number;
  metric_a: string;
  metric_b: string;
  threshold_pct: number;
  is_active: number;
  last_triggered_at: string | null;
  created_at: string | null;
}

export const getPercentageAlerts = async (watchlist_id?: number): Promise<PercentageAlert[]> => {
  const params: any = {};
  if (watchlist_id !== undefined) params.watchlist_id = watchlist_id;
  const response = await api.get('/market/percentage-alerts', { params });
  return response.data;
}

export const createPercentageAlert = async (
  watchlist_id: number, metric_a: string, metric_b: string, threshold_pct: number
): Promise<PercentageAlert> => {
  const response = await api.post('/market/percentage-alerts', { watchlist_id, metric_a, metric_b, threshold_pct });
  return response.data;
}

export const deletePercentageAlert = async (id: number) => {
  const response = await api.delete(`/market/percentage-alerts/${id}`);
  return response.data;
}

export const togglePercentageAlert = async (id: number) => {
  const response = await api.patch(`/market/percentage-alerts/${id}/toggle`);
  return response.data;
}
