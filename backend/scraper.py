import os
import sqlite3
import asyncio
import random
import sys
import json
import argparse
from datetime import datetime
import httpx

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "metin2.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "database", "schema.sql")
HISTORY_EXPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "exports")

# Direct JSON API endpoints (no browser needed!)
STORE_DATA_URL = "https://metin2alerts.com/store/public/data/{server_id}.json?v={ts}&r={rand}"
ITEM_NAMES_URL = "https://metin2alerts.com/m2_data/{lang}/item_names.json"

# Cache for item names (vnum_str -> localized name)
_item_names_cache: dict[str, dict[str, str]] = {}

# ---------------------------------------------------------------------------
# Complete server list (scraped from metin2alerts.com dropdown)
# ---------------------------------------------------------------------------
SERVER_MAPPING = {
    # Turkish servers
    "Fırtına": "439",
    "Lodos": "438",
    "Bagjanamu": "418",
    "Arkadaşlar": "413",
    "Marmara": "409",
    "Ezel": "59",
    "Barbaros": "57",
    "Dandanakan": "51",
    # Sapphire servers
    "Star": "437",
    "Safir": "436",
    "Oceana": "540",
    "Azure": "732",
    # Ruby servers
    "Lucifer": "431",
    "Charon": "426",
    "Chimera": "531",
    "Kirin": "723",
    # International / EU servers
    "Germania": "70",
    "Teutonia": "71",
    "Europe": "502",
    "Italia": "503",
    "Iberia": "506",
    "Tigerghost": "524",
    "Nyx": "541",
    "Chione": "733",
    # Other regional servers
    "România": "599",
    "Tara Româneascã": "54",
    "Magyarország": "700",
    "Česko": "701",
    "Polska": "702",
}

# ---------------------------------------------------------------------------
# German bonus / attribute mapping  (attr_id -> format string)
# Extracted from metin2alerts.com  window.STAT_MAP
# The format string contains %d (or %0.1f) as placeholder for the value.
# ---------------------------------------------------------------------------
STAT_MAP: dict[int, str] = {
    1: "Max. TP +%d",
    2: "Max. MP +%d",
    3: "Vitalität +%d",
    4: "Intelligenz +%d",
    5: "Stärke +%d",
    6: "Beweglichkeit +%d",
    7: "Angriffsgeschwindigkeit +%d%%",
    8: "Bewegungsgeschw. %d%%",
    9: "Zaubergeschwindigkeit +%d%%",
    10: "TP-Regeneration +%d%%",
    11: "MP-Regeneration +%d%%",
    12: "Vergiftungschance %d%%",
    13: "Ohnmachtschance %d%%",
    14: "Verlangsamungschance %d%%",
    15: "Chance auf krit. Treffer +%d%%",
    16: "%d%% Chance auf durchbohrenden Treffer",
    17: "Stark gegen Halbmenschen +%d%%",
    18: "Stark gegen Tiere +%d%%",
    19: "Stark gegen Orks +%d%%",
    20: "Stark gegen Esoterische +%d%%",
    21: "Stark gegen Untote +%d%%",
    22: "Stark gegen Teufel +%d%%",
    23: "%d%% Schaden wird von TP absorbiert",
    24: "%d%% Schaden wird von MP absorbiert",
    25: "%d%% Chance auf Manaraub",
    26: "%d%% Chance, MP bei Treffer zurückzuerhalten",
    27: "Chance, Nahkampfangriff abzublocken %d%%",
    28: "%d%% Chance, Pfeilangriff auszuweichen",
    29: "Schwertverteidigung %d%%",
    30: "Zweihänderverteidigung %d%%",
    31: "Dolchverteidigung %d%%",
    32: "Glockenverteidigung %d%%",
    33: "Fächerverteidigung %d%%",
    34: "Pfeilverteidigung %d%%",
    35: "Feuerwiderstand %d%%",
    36: "Blitzwiderstand %d%%",
    37: "Magiewiderstand %d%%",
    38: "Windwiderstand %d%%",
    39: "%d%% Chance, Nahkampftreffer zu reflektieren",
    40: "%d%% Chance, Fluch zu reflektieren",
    41: "Giftwiderstand %d%%",
    42: "%d%% Chance, MP wiederherzustellen",
    43: "%d%% Chance auf EXP-Bonus",
    44: "%d%% Chance, eine doppelte Menge Yang fallen zu lassen.",
    45: "%d%% Chance, eine doppelte Menge von Gegenständen fallen zu lassen.",
    46: "Trank %d%% Effektzuwachs",
    47: "%d%% Chance, TP wiederherzustellen",
    48: "Abwehr gegen Ohnmacht",
    49: "Abwehr gegen Verlangsamen",
    50: "Immun gegen Stürzen",
    51: "Fertigkeit",
    52: "Reichweite +%d m",
    53: "Angriffswert +%d",
    54: "Verteidigung +%d",
    55: "Magischer Angriffswert +%d",
    56: "Magische Verteidigung +%d",
    58: "Max. Ausdauer +%d",
    59: "Stark gegen Krieger +%d%%",
    60: "Stark gegen Ninja +%d%%",
    61: "Stark gegen Sura +%d%%",
    62: "Stark gegen Schamanen +%d%%",
    63: "Stark gegen Monster +%d%%",
    64: "Angriffswert +%d%%",
    65: "Verteidigung +%d%%",
    66: "EXP +%d%%",
    67: "Dropchance von Gegenständen um %d%% erhöht",
    68: "Dropchance Yang um %d%% erhöht",
    69: "Max. TP +%d%%",
    70: "Max. MP +%d%%",
    71: "Fertigkeitsschaden %d%%",
    72: "Durchschn. Schaden %d%%",
    73: "Widerstand gegen Fertigkeitsschaden %d%%",
    74: "Durchschn. Schadenswiderstand %d%%",
    78: "Abwehrchance gegen Kriegerangriffe %d%%",
    79: "Abwehrchance gegen Ninjaangriffe %d%%",
    80: "Abwehrchance gegen Suraangriffe %d%%",
    81: "Abwehrchance gegen Schamanenangriffe %d%%",
    82: "Energie %d",
    83: "Verteidigung +%d",
    84: "Kostümbonus %d%%",
    85: "Magischer Angriff +%d%%",
    86: "Magie-/Nahkampfangriff +%d%%",
    87: "Eiswiderstand +%d%%",
    88: "Erdwiderstand +%d%%",
    89: "Widerstand gegen Dunkelheit %d%%",
    90: "Widerstand gegen kritischen Treffer +%d%%",
    91: "Widerstand gegen durchbohrenden Treffer +%d%%",
    92: "Widerstand gegen Blutungsangriff + %d%%",
    93: "Blutungsangriff + %d%%",
    94: "Stark gegen Lykaner + %d%%",
    95: "Abwehrchance gegen Lykaner %d%%",
    96: "Krallenverteidigung + %d%%",
    97: "Aufnahmerate: %d%%",
    98: "Magiebruch um %d%%",
    99: "Kraft der Blitze +%d%%",
    100: "Kraft des Feuers +%d%%",
    101: "Kraft des Eises +%d%%",
    102: "Kraft des Windes +%d%%",
    103: "Kraft der Erde +%d%%",
    104: "Kraft der Dunkelheit +%d%%",
    105: "Stark gegen Zodiakmonster +%d%%",
    106: "Stark gegen Insekten +%d%%",
    107: "Stark gegen Wüstenmonster +%d%%",
    108: "Bruch von Schwertverteidigung +%d%%",
    109: "Bruch von Zweihandverteidigung +%d%%",
    110: "Bruch von Dolchverteidigung +%d%%",
    111: "Bruch von Glockenverteidigung +%d%%",
    112: "Bruch von Fächerverteidigung +%d%%",
    113: "Bruch von Pfeilverteidigung +%d%%",
    114: "Bruch von Krallenverteidigung +%d%%",
    115: "Widerstand gegen Halbmenschen %d%%",
    116: "Widerstand gegen Sturz +%d%%",
    119: "Dreiwege-Schnitt-Schaden +%d%%",
    120: "Schaden von Sausen +%d%%",
    121: "Schaden von Schwertwirbel +%d%%",
    122: "Durchschlagsschaden +%d%%",
    123: "Schaden von Heftiges Schlagen +%d%%",
    124: "Schwertschlagschaden +%d%%",
    125: "Schaden von Hinterhalt +%d%%",
    126: "Schaden von Blitzangriff +%d%%",
    127: "Schaden von Degenwirbel +%d%%",
    128: "Schaden von Giftwolke +%d%%",
    129: "Schaden von Wiederholter Schuss +%d%%",
    130: "Pfeilregenschaden +%d%%",
    131: "Giftpfeilschaden +%d%%",
    132: "Feuerpfeilschaden +%d%%",
    133: "Fingerschlagschaden +%d%%",
    134: "Schaden von Drachenwirbel +%d%%",
    135: "Schaden von Zauber aufheben +%d%%",
    136: "Schaden von Dunkler Schlag +%d%%",
    137: "Schaden von Flammenschlag +%d%%",
    138: "Schaden von Dunkler Stein +%d%%",
    139: "Schaden von Fliegender Talisman +%d%%",
    140: "Schaden von Drachenschießen +%d%%",
    141: "Schaden von Drachengebrüll +%d%%",
    142: "Blitzwurfschaden +%d%%",
    143: "Schaden von Blitz heraufbeschwören +%d%%",
    144: "Blitzkrallenschaden +%d%%",
    145: "Schaden von Zerreißen +%d%%",
    146: "Schaden von Atem des Wolfes +%d%%",
    147: "Schaden von Wolfssprung +%d%%",
    148: "Wolfskrallenschaden +%d%%",
    149: "Angriffsschaden von Bossen -%d%%",
    150: "Fertigkeitsschaden von Bossen -%d%%",
    151: "Angriffsschaden gegen Bosse +%d%%",
    152: "Fertigkeitsschaden gegen Bosse +%d%%",
    153: "Erhalte Kraft d. Feuers für %d Sek. im Kampf",
    154: "Erhalte Kraft d. Eises für %d Sek. im Kampf",
    155: "Erhalte Kraft d. Blitze für %d Sek. im Kampf",
    156: "Erhalte Kraft d. Windes für %d Sek. im Kampf",
    157: "Erhalte Kraft d. Dunkelheit für %d Sek. im Kampf",
    158: "Erhalte Kraft d. Erde für %d Sek. im Kampf",
    159: "Erhalte Feuerwiderstand für %d Sek. im Kampf",
    160: "Erhalte Eiswiderstand für %d Sek. im Kampf",
    161: "Erhalte Blitzwiderstand für %d Sek. im Kampf",
    162: "Erhalte Windwiderstand für %d Sek. im Kampf",
    163: "Erhalte Widerstand vs Dunkelheit für %d Sek. im Kampf",
    164: "Erhalte Erdwiderstand für %d Sek. im Kampf",
    214: "+%d%% Stark gegen Metinsteine",
    215: "Absorbiert Schaden zu %d%% als TP",
    216: "Absorbiert Schaden zu %d%% als MP",
    312: "Stark gegen Mysterien +%d%%",
    313: "Stark gegen Drachen +%d%%",
    322: "Stark gegen Mondschatten-Monster +%d%%",
}


def resolve_bonus(attr_id: int, attr_value: int) -> tuple[str, str]:
    """Resolve a raw attribute ID + value into (readable_name, value_str).

    Returns e.g. ("Durchschn. Schaden 15%", "15") for attr_id=72, attr_value=15.
    Falls back to "Attribut #<id> <value>" for unknown IDs.
    """
    fmt = STAT_MAP.get(attr_id)
    if fmt:
        try:
            display = fmt % attr_value
        except (TypeError, ValueError):
            display = fmt.replace("%d", str(attr_value)).replace("%0.1f", str(attr_value))
        return (display, str(attr_value))
    # Unknown attribute – keep raw data so nothing is lost
    return (f"Attribut #{attr_id} {attr_value}", str(attr_value))


async def fetch_item_names(lang: str = "de") -> dict[str, str]:
    """Fetch German item names from metin2alerts CDN. Cached."""
    if lang in _item_names_cache:
        return _item_names_cache[lang]
    
    url = ITEM_NAMES_URL.format(lang=lang)
    print(f"Fetching item names for language '{lang}'...")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://metin2alerts.com/store/",
        })
        resp.raise_for_status()
        names = resp.json()  # dict: vnum_str -> localized name
        _item_names_cache[lang] = names
        print(f"Loaded {len(names)} item names for '{lang}'.")
        return names


async def fetch_server_items(server_id: str) -> list[dict]:
    """Fetch ALL market listings for a server as JSON (bypasses browser entirely). Cache for 5 mins."""
    import time
    
    cache_file = os.path.join(os.path.dirname(__file__), "..", "data", f"cache_{server_id}.json")
    os.makedirs(os.path.dirname(cache_file), exist_ok=True)
    
    # Check if cache is fresh (less than 5 minutes old)
    if os.path.exists(cache_file):
        mtime = os.path.getmtime(cache_file)
        if time.time() - mtime < 300:  # 5 minutes
            print(f"Loading server data from cache ({cache_file})...")
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    items = json.load(f)
                    print(f"Loaded {len(items)} items from local cache.")
                    return items
            except Exception as e:
                print(f"Cache read error: {e}, fetching fresh data.")
                
    ts = int(time.time() * 1000)
    rand = random.randint(100000, 999999)
    url = STORE_DATA_URL.format(server_id=server_id, ts=ts, rand=rand)
    
    print(f"Fetching server data from {url}...")
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://metin2alerts.com/store/",
            "Accept": "application/json",
        })
        resp.raise_for_status()
        items = resp.json()
        print(f"Fetched {len(items)} items from server ({len(resp.content) / 1024 / 1024:.1f} MB).")
        
        # Save to cache
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False)
        except Exception as e:
            print(f"Failed to write cache: {e}")
            
        return items

def init_db():
    """Initialize the database with the schema."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(HISTORY_EXPORT_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema = f.read()
        cursor.executescript(schema)
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


# Common item name mappings (Short/Slang -> Full Game Name, German)
ITEM_NAME_MAPPINGS = {
    "vollmond": "Vollmondschwert",
    "gift": "Giftschwert",
    "klinge": "Klinge des Verderbens",
    "rep": "Roter Eisenschlitzer",
    "rundschild": "Schwarzer Rundschild",
    "hirschhorn": "Hirschhorn-Bogen",
    "groll": "Grollschwert",
    "stahlrüstung": "Blaue Stahlrüstung",
    "fünfeck": "Fünfeckschild",
    "orchidee": "Orchideenglocke",
    "löwenmaul": "Löwenmaulschild",
    "falke": "Falkenschild",
    "tiger": "Tigerschild",
    "ebenholz": "Ebenholz-Ohrring",
    "himmelsauge": "Himmelsaugen-Halskette",
}

async def scrape_store(server_name=None, max_pages=50):
    """
    Fetch market data natively for the whole server globally.
    """
    if not server_name:
        server_name = os.environ.get("SERVER_NAME", "Chimera")

    server_value = SERVER_MAPPING.get(server_name, "531")
    lang = "de"  # Always German
    print(f"Global Scrape for server: {server_name} (ID: {server_value}, lang: {lang})")

    try:
        item_names = await fetch_item_names(lang)
        all_items = await fetch_server_items(server_value)

        matching_listings = []
        for raw_item in all_items:
            vnum = raw_item.get("vnum", 0)
            localized_name = item_names.get(str(vnum), raw_item.get("name", "Unknown"))
            
            yang = raw_item.get("yangPrice", 0) or 0
            won = raw_item.get("wonPrice", 0) or 0
            quantity = raw_item.get("quantity", 1) or 1
            seller = raw_item.get("seller", "Unknown") or "Unknown"
            total_yang = won * 100_000_000 + yang

            if total_yang <= 0:
                continue

            bonuses = []
            for attr in (raw_item.get("attrs") or []):
                if isinstance(attr, (list, tuple)) and len(attr) >= 2 and attr[0]:
                    attr_id = int(attr[0])
                    attr_val = int(attr[1]) if attr[1] else 0
                    display_name, val_str = resolve_bonus(attr_id, attr_val)
                    bonuses.append({"name": display_name, "value": val_str})

            matching_listings.append({
                "item_name": localized_name,
                "seller": seller,
                "quantity": quantity,
                "price_won": won,
                "price_yang": yang,
                "total_yang": total_yang,
                "unit_price": total_yang / quantity,
                "bonuses": bonuses,
            })

        print(f"Found {len(matching_listings)} listings total on {server_name}.")

        if not matching_listings:
            return

        from collections import defaultdict
        grouped = defaultdict(list)
        for listing in matching_listings:
            grouped[listing["item_name"]].append(listing)

        await save_to_db_global(grouped, server_name)

        print(f"Global scrape complete for {server_name}.")

    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching data: {e.response.status_code} {e.response.reason_phrase}")
        sys.exit(1)
    except httpx.RequestError as e:
        print(f"Network error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Scrape error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)



async def save_to_db_global(grouped_listings, server_name):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("INSERT OR IGNORE INTO servers (name) VALUES (?)", (server_name,))
    cursor.execute("SELECT id FROM servers WHERE name=?", (server_name,))
    server_id = cursor.fetchone()[0]

    # Clear current live listings for this server entirely
    cursor.execute("DELETE FROM listings WHERE server_id = ?", (server_id,))
    cursor.execute("DELETE FROM listing_bonuses WHERE listing_id NOT IN (SELECT id FROM listings)")

    now = datetime.now().isoformat()
    count = 0

    unique_item_names = list(grouped_listings.keys())
    cursor.executemany("INSERT OR IGNORE INTO items (name, category) VALUES (?, ?)", 
                       [(name, "General") for name in unique_item_names])

    cursor.execute("SELECT name, id FROM items")
    item_id_map = {row[0]: row[1] for row in cursor.fetchall()}

    unique_items_list = []
    for item_name, listings in grouped_listings.items():
        unique = []
        seen = set()
        for item in listings:
            sig = (item["item_name"], item["seller"], item["total_yang"], item["quantity"])
            if sig not in seen:
                seen.add(sig)
                unique.append(item)
        unique_items_list.extend(unique)

    # Fast bulk insert
    for item in unique_items_list:
        item_id = item_id_map.get(item['item_name'])
        if not item_id:
            continue
            
        cursor.execute("""
            INSERT INTO listings (server_id, item_id, seller_name, quantity, price_won, price_yang, total_price_yang)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (server_id, item_id, item['seller'], item['quantity'], item['price_won'], item['price_yang'], item['total_yang']))
        
        listing_id = cursor.lastrowid
        
        for bonus in item['bonuses']:
            if bonus:
                if isinstance(bonus, dict):
                    cursor.execute("INSERT INTO listing_bonuses (listing_id, bonus_name, bonus_value) VALUES (?, ?, ?)",
                                   (listing_id, bonus.get('name', ''), bonus.get('value', '')))
                else:
                    cursor.execute("INSERT INTO listing_bonuses (listing_id, bonus_name, bonus_value) VALUES (?, ?, ?)",
                                   (listing_id, str(bonus), ""))
                                   
        # Snapshot
        unit_price = int(item['total_yang'] / max(item['quantity'], 1))
        cursor.execute("""
            INSERT INTO listing_snapshots (item_name, seller_name, server_name, quantity, price_won, price_yang, total_price_yang, unit_price, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (item['item_name'], item['seller'], server_name, item['quantity'], item['price_won'], item['price_yang'], int(item['total_yang']), unit_price, now))
        
        count += 1
            
    conn.commit()
    conn.close()
    print(f"Saved {count} listings (+ snapshots) globally for {server_name}.")



async def run_bot(interval_minutes=10):
    """Infinite loop for the bot (Global extraction)."""
    print(f"Starting Global Market Bot (Interval: {interval_minutes} mins)")
    server_name = os.environ.get("SERVER_NAME", "Chimera")
    max_pages = int(os.environ.get("MAX_PAGES", "50"))
    
    while True:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Global bot execution started for {server_name}...")
        await scrape_store(server_name, max_pages=max_pages)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Sleeping for {interval_minutes} minutes...")
        await asyncio.sleep(interval_minutes * 60)



if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Metin2 Market Scraper & Bot")

    parser.add_argument("--bot", action="store_true", help="Run in continuous bot mode")

    parser.add_argument("--query", type=str, help="Search query (override env var)")

    parser.add_argument("--server", type=str, help="Server name (override env var)")

    parser.add_argument("--interval", type=int, default=20, help="Bot interval in minutes")

    parser.add_argument("--max-pages", type=int, default=50, help="Max pages to scrape per query")

    

    args = parser.parse_args()

    

    # Initialize DB first

    init_db()

    

    if args.server:
        os.environ["SERVER_NAME"] = args.server
    
    max_pages = int(os.environ.get("MAX_PAGES", str(args.max_pages)))
        
    if args.bot:
        try:
            asyncio.run(run_bot(args.interval))
        except KeyboardInterrupt:
            print("Bot stopped by user.")
    else:
        asyncio.run(scrape_store(server_name=os.environ.get("SERVER_NAME"), max_pages=max_pages))

