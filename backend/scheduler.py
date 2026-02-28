import sqlite3
import time
import subprocess
import sys
import os
from datetime import datetime, timedelta

# Path to the scraper script
SCRAPER_PATH = os.path.join(os.path.dirname(__file__), "scraper.py")
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "metin2.db")

TICK_SECONDS = 30  # Check watchlist every 30 seconds


def ensure_tables():
    """Ensure watchlist + alert tables exist (migration-safe)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            server_name TEXT NOT NULL DEFAULT 'Chimera',
            is_active INTEGER NOT NULL DEFAULT 1,
            last_scraped_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(query, server_name)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telegram_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_token TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            watchlist_id INTEGER NOT NULL,
            price_threshold INTEGER NOT NULL,
            price_type TEXT NOT NULL DEFAULT 'yang',
            direction TEXT NOT NULL DEFAULT 'below',
            is_active INTEGER NOT NULL DEFAULT 1,
            last_triggered_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fake_sellers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_name TEXT NOT NULL UNIQUE,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
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
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS percentage_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            watchlist_id INTEGER NOT NULL,
            metric_a TEXT NOT NULL,
            metric_b TEXT NOT NULL,
            threshold_pct REAL NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_triggered_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()


def ensure_watchlist_seeded():
    """Seed watchlist from env vars if the table is empty (first-run migration)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    count = cursor.execute("SELECT COUNT(*) FROM watchlist").fetchone()[0]
    if count == 0:
        query = os.environ.get("SEARCH_QUERY", "Vollmond")
        server = os.environ.get("SERVER_NAME", "Chimera")
        cursor.execute(
            "INSERT OR IGNORE INTO watchlist (query, server_name) VALUES (?, ?)",
            (query, server)
        )
        conn.commit()
        print(f"Seeded watchlist with default: '{query}' on '{server}'")
    conn.close()


def get_due_items():
    """Return watchlist items that are active and due for scraping."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM watchlist WHERE is_active = 1")
    items = cursor.fetchall()
    conn.close()

    now = datetime.now()
    due = []
    for item in items:
        last = item["last_scraped_at"]
        interval = item["interval_minutes"] or 20
        if last is None:
            due.append(item)
        else:
            last_dt = datetime.fromisoformat(last)
            if now - last_dt >= timedelta(minutes=interval):
                due.append(item)
    return due


def mark_scraped(item_id):
    """Update last_scraped_at for an item."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE watchlist SET last_scraped_at = ? WHERE id = ?",
        (datetime.now().isoformat(), item_id)
    )
    conn.commit()
    conn.close()


def perform_global_scrape(server_name="Chimera"):
    """Run scraper subprocess globally for the server."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Executing Global Scrape for '{server_name}'...")
    try:
        env = os.environ.copy()
        env["SERVER_NAME"] = server_name
        result = subprocess.run(
            [sys.executable, SCRAPER_PATH],
            env=env, capture_output=False, timeout=600
        )
        if result.returncode == 0:
            print(f"  -> GLOBAL SCRAPE OK")
            return True
        else:
            print(f"  -> GLOBAL SCRAPE FAIL: exit code {result.returncode}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  -> TIMEOUT for Global Scrape")
        return False
    except Exception as e:
        print(f"  -> ERROR: {e}")
        return False

def clean_old_snapshots(days=14):
    """Delete listing snapshots older than X days to prevent endless DB growth."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    cursor.execute("DELETE FROM listing_snapshots WHERE scraped_at < ?", (cutoff,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted > 0:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Auto-Cleanup: Deleted {deleted} old snapshots.")


# ── Price Alert checking ────────────────────────────────────────

def get_telegram_config():
    """Return (bot_token, chat_id) or None if not configured / disabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM telegram_settings WHERE is_active = 1 LIMIT 1").fetchone()
    conn.close()
    if row:
        return row["bot_token"], row["chat_id"]
    return None


def get_active_alerts_for(watchlist_id):
    """Return active price alerts for a watchlist item."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    alerts = conn.execute(
        "SELECT * FROM price_alerts WHERE watchlist_id = ? AND is_active = 1",
        (watchlist_id,)
    ).fetchall()
    conn.close()
    return alerts


def get_current_prices(query):
    """Get min, avg_bottom20, and avg prices for an item, excluding fake sellers.
    Returns dict with keys: 'min', 'avg_bottom20', 'avg' (or None if no data)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Load fake seller names
    fake_sellers = set(
        row["seller_name"] for row in
        conn.execute("SELECT seller_name FROM fake_sellers").fetchall()
    )

    # Compute from listings, excluding fake sellers
    rows = conn.execute("""
        SELECT l.total_price_yang / MAX(l.quantity, 1) as unit_price, l.seller_name
        FROM listings l
        JOIN items i ON l.item_id = i.id
        WHERE i.name LIKE ?
    """, (f"%{query}%",)).fetchall()
    conn.close()

    prices = sorted([row["unit_price"] for row in rows if row["seller_name"] not in fake_sellers and row["unit_price"]])
    if not prices:
        return None
    total = len(prices)
    bottom_count = max(1, int(total * 0.2))
    return {
        "min": prices[0],
        "avg_bottom20": int(sum(prices[:bottom_count]) / bottom_count),
        "avg": int(sum(prices) / total),
    }


def mark_alert_triggered(alert_id):
    """Update last_triggered_at for an alert."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE price_alerts SET last_triggered_at = ? WHERE id = ?",
        (datetime.now().isoformat(), alert_id)
    )
    conn.commit()
    conn.close()


def check_alerts_for_item(watchlist_item):
    """After scraping, check if any price alerts should fire."""
    from .telegram_bot import send_telegram_message_sync, format_alert_message

    tg = get_telegram_config()
    if not tg:
        return  # Telegram not set up or disabled

    bot_token, chat_id = tg
    query = watchlist_item["query"]
    alerts = get_active_alerts_for(watchlist_item["id"])

    if not alerts:
        return

    price_data = get_current_prices(query)
    if price_data is None:
        return

    min_price = price_data["min"]

    for alert in alerts:
        threshold = alert["price_threshold"]
        direction = alert["direction"]
        price_type = alert["price_type"]

        # Determine which price to compare
        current = min_price  # Use min price as the trigger reference

        triggered = False
        if direction == "below" and current <= threshold:
            triggered = True
        elif direction == "above" and current >= threshold:
            triggered = True

        if triggered:
            # Cooldown: don't re-trigger within 30 minutes
            last = alert["last_triggered_at"]
            if last:
                last_dt = datetime.fromisoformat(last)
                if datetime.now() - last_dt < timedelta(minutes=30):
                    continue

            try:
                msg = format_alert_message(query, current, price_type, direction)
                send_telegram_message_sync(bot_token, chat_id, msg)
                mark_alert_triggered(alert["id"])
                print(f"  🔔 Alert sent for '{query}' – {current:,} (threshold {threshold:,} {direction})")
            except Exception as e:
                print(f"  ⚠️ Failed to send alert for '{query}': {e}")


def get_active_percentage_alerts_for(watchlist_id):
    """Return active percentage alerts for a watchlist item."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    alerts = conn.execute(
        "SELECT * FROM percentage_alerts WHERE watchlist_id = ? AND is_active = 1",
        (watchlist_id,)
    ).fetchall()
    conn.close()
    return alerts


def mark_percentage_alert_triggered(alert_id):
    """Update last_triggered_at for a percentage alert."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE percentage_alerts SET last_triggered_at = ? WHERE id = ?",
        (datetime.now().isoformat(), alert_id)
    )
    conn.commit()
    conn.close()


METRIC_LABELS = {
    "min": "Minimum",
    "avg_bottom20": "Ø Günstigste 20%",
    "avg": "Ø Preis (alle)",
}


def check_percentage_alerts_for_item(watchlist_item):
    """After scraping, check if any percentage-based deviation alerts should fire."""
    from .telegram_bot import send_telegram_message_sync, format_percentage_alert_message

    tg = get_telegram_config()
    if not tg:
        return

    bot_token, chat_id = tg
    query = watchlist_item["query"]
    alerts = get_active_percentage_alerts_for(watchlist_item["id"])

    if not alerts:
        return

    price_data = get_current_prices(query)
    if price_data is None:
        return

    for alert in alerts:
        metric_a = alert["metric_a"]
        metric_b = alert["metric_b"]
        threshold_pct = alert["threshold_pct"]

        val_a = price_data.get(metric_a)
        val_b = price_data.get(metric_b)

        if val_a is None or val_b is None or val_b == 0:
            continue

        deviation_pct = abs((val_a - val_b) / val_b) * 100

        if deviation_pct >= threshold_pct:
            # Cooldown: don't re-trigger within 30 minutes
            last = alert["last_triggered_at"]
            if last:
                last_dt = datetime.fromisoformat(last)
                if datetime.now() - last_dt < timedelta(minutes=30):
                    continue

            try:
                label_a = METRIC_LABELS.get(metric_a, metric_a)
                label_b = METRIC_LABELS.get(metric_b, metric_b)
                msg = format_percentage_alert_message(
                    query, label_a, val_a, label_b, val_b, deviation_pct, threshold_pct
                )
                send_telegram_message_sync(bot_token, chat_id, msg)
                mark_percentage_alert_triggered(alert["id"])
                print(f"  🔔 %-Alert sent for '{query}' – {label_a}={val_a:,} vs {label_b}={val_b:,} ({deviation_pct:.1f}% >= {threshold_pct}%)")
            except Exception as e:
                print(f"  ⚠️ Failed to send %-alert for '{query}': {e}")


print("Scheduler started – reading watchlist from DB.")
ensure_tables()
ensure_watchlist_seeded()

GLOBAL_INTERVAL_MIN = 10
CLEANUP_INTERVAL_DAYS = 1

if __name__ == "__main__":
    try:
        server_name = os.environ.get("SERVER_NAME", "Chimera")
        last_global_scrape = None
        last_cleanup = None
        
        while True:
            now = datetime.now()
            
            # 1. Global Scrape Check
            if last_global_scrape is None or now - last_global_scrape >= timedelta(minutes=GLOBAL_INTERVAL_MIN):
                success = perform_global_scrape(server_name)
                last_global_scrape = datetime.now()
                
                if success:
                    # Check alerts for all active watchlist items
                    conn = sqlite3.connect(DB_PATH)
                    conn.row_factory = sqlite3.Row
                    items = conn.execute("SELECT * FROM watchlist WHERE is_active = 1").fetchall()
                    conn.close()
                    
                    if items:
                        print(f"  -> Checking alerts for {len(items)} watchlist items...")
                        for it in items:
                            mark_scraped(it["id"])
                            check_alerts_for_item(it)
                            check_percentage_alerts_for_item(it)

            # 2. Cleanup Check
            if last_cleanup is None or now - last_cleanup >= timedelta(days=CLEANUP_INTERVAL_DAYS):
                clean_old_snapshots(days=14)
                last_cleanup = datetime.now()
                
            time.sleep(TICK_SECONDS)
    except KeyboardInterrupt:
        print("Scheduler stopped.")
