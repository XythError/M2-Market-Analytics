-- Users/Servers
CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Unique Items (normalization)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    image_url TEXT,
    UNIQUE(name)
);

-- Market Listings (The core data)
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    item_id INTEGER,
    seller_name TEXT,
    quantity INTEGER,
    price_won INTEGER DEFAULT 0,
    price_yang INTEGER DEFAULT 0,
    total_price_yang BIGINT, -- Calculated total value for sorting
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(server_id) REFERENCES servers(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
);

-- Item Bonuses/Attributes (e.g., "Ortalama Zarar 45%")
CREATE TABLE IF NOT EXISTS listing_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER,
    bonus_name TEXT NOT NULL,
    bonus_value TEXT,
    FOREIGN KEY(listing_id) REFERENCES listings(id)
);

-- Price History (Market Analysis)
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    avg_unit_price BIGINT,
    min_unit_price BIGINT,
    avg_bottom20_price BIGINT,
    total_listings INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist (items to scrape automatically on a schedule)
CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    server_name TEXT NOT NULL DEFAULT 'Chimera',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query, server_name)
);

-- Fake Sellers (flagged sellers whose listings are excluded from price calculations)
CREATE TABLE IF NOT EXISTS fake_sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_name TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listing Snapshots (archival of every listing per scrape for retroactive filtering)
CREATE TABLE IF NOT EXISTS listing_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    server_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_won INTEGER DEFAULT 0,
    price_yang INTEGER DEFAULT 0,
    total_price_yang BIGINT NOT NULL,
    unit_price BIGINT NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_item_server ON listings(item_id, server_id);
CREATE INDEX IF NOT EXISTS idx_listings_seen_at ON listings(seen_at);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_name);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_fake_sellers_name ON fake_sellers(seller_name);
CREATE INDEX IF NOT EXISTS idx_listing_snapshots_item ON listing_snapshots(item_name);
CREATE INDEX IF NOT EXISTS idx_listing_snapshots_time ON listing_snapshots(scraped_at);
CREATE INDEX IF NOT EXISTS idx_listing_snapshots_seller ON listing_snapshots(seller_name);