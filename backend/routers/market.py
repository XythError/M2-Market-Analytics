from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas, database
from ..telegram_bot import send_telegram_message, format_alert_message
import httpx

router = APIRouter(
    prefix="/market",
    tags=["market"]
)

@router.get("/listings", response_model=List[schemas.ListingOut])
def get_listings(
    skip: int = 0, 
    limit: int = 100, 
    server: Optional[str] = None, 
    item_name: Optional[str] = None,
    sort_by: Optional[str] = "newest",
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Listing)
    
    if server:
        query = query.join(models.Server).filter(models.Server.name == server)
    if item_name:
        query = query.join(models.Item).filter(models.Item.name.contains(item_name))
        
    if sort_by == "newest":
        query = query.order_by(models.Listing.seen_at.desc())
    elif sort_by == "price_asc":
        query = query.order_by(models.Listing.total_price_yang.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Listing.total_price_yang.desc())

    listings = query.offset(skip).limit(limit).all()
    return listings

@router.get("/stats/top-items")
def get_top_items(db: Session = Depends(database.get_db)):
    """Returns the most frequently listed items (by listing count)."""
    from sqlalchemy import func
    results = db.query(models.Item.name, func.count(models.Listing.id).label("count")) \
        .join(models.Listing) \
        .group_by(models.Item.name) \
        .order_by(func.count(models.Listing.id).desc()) \
        .limit(10).all()
    
    return [{"name": name, "count": count} for name, count in results]

@router.get("/stats/price-history")
def get_price_history(item_name: str, db: Session = Depends(database.get_db)):
    """Returns price history for an item. Combines legacy price_history with snapshot-based dynamic data."""
    from sqlalchemy import func as sa_func
    from collections import defaultdict

    result = []

    # 1. Get fake seller names
    fake_names = [fs.seller_name for fs in db.query(models.FakeSeller).all()]

    # 2. Check if snapshots exist for this item
    snapshot_query = db.query(models.ListingSnapshot)\
        .filter(models.ListingSnapshot.item_name == item_name)
    if fake_names:
        snapshot_query = snapshot_query.filter(~models.ListingSnapshot.seller_name.in_(fake_names))
    snapshots = snapshot_query.order_by(models.ListingSnapshot.scraped_at.asc()).all()

    # Find the earliest snapshot timestamp (if any)
    earliest_snapshot_ts = None
    if snapshots:
        earliest_snapshot_ts = min(s.scraped_at for s in snapshots if s.scraped_at)

    # 3. Include legacy price_history entries that are OLDER than the earliest snapshot
    legacy_history = db.query(models.PriceHistory)\
        .filter(models.PriceHistory.item_name == item_name)\
        .order_by(models.PriceHistory.timestamp.asc())\
        .all()

    for h in legacy_history:
        # If we have snapshots, only include legacy data from before the snapshot era
        if earliest_snapshot_ts and h.timestamp and h.timestamp >= earliest_snapshot_ts:
            continue
        result.append({
            "timestamp": h.timestamp,
            "avg_unit_price": h.avg_unit_price,
            "min_unit_price": h.min_unit_price,
            "avg_bottom20_price": h.avg_bottom20_price,
            "total_listings": h.total_listings
        })

    # 4. Add snapshot-based data (dynamically computed, fake-seller-filtered)
    if snapshots:
        time_groups = defaultdict(list)
        for s in snapshots:
            # Round to minute for grouping
            key = s.scraped_at.replace(second=0, microsecond=0) if s.scraped_at else s.scraped_at
            time_groups[key].append(s.unit_price)

        for ts, prices in sorted(time_groups.items()):
            prices_sorted = sorted(prices)
            total = len(prices_sorted)
            avg_price = sum(prices_sorted) / total
            min_price = prices_sorted[0]
            bottom_count = max(1, int(total * 0.2))
            avg_bottom20 = sum(prices_sorted[:bottom_count]) / bottom_count
            result.append({
                "timestamp": ts,
                "avg_unit_price": int(avg_price),
                "min_unit_price": int(min_price),
                "avg_bottom20_price": int(avg_bottom20),
                "total_listings": total
            })

    # Sort by timestamp
    result.sort(key=lambda x: x["timestamp"] if x["timestamp"] else "")
    return result

# ---------------------------------------------------------------------------
# Complete server list matching metin2alerts.com dropdown
# ---------------------------------------------------------------------------
ALL_SERVERS = [
    # Turkish servers
    {"name": "Fırtına",          "id": "439", "group": "Turkey"},
    {"name": "Lodos",            "id": "438", "group": "Turkey"},
    {"name": "Bagjanamu",        "id": "418", "group": "Turkey"},
    {"name": "Arkadaşlar",       "id": "413", "group": "Turkey"},
    {"name": "Marmara",          "id": "409", "group": "Turkey"},
    {"name": "Ezel",             "id": "59",  "group": "Turkey"},
    {"name": "Barbaros",         "id": "57",  "group": "Turkey"},
    {"name": "Dandanakan",       "id": "51",  "group": "Turkey"},
    # Sapphire servers
    {"name": "Star",             "id": "437", "group": "Sapphire"},
    {"name": "Safir",            "id": "436", "group": "Sapphire"},
    {"name": "Oceana",           "id": "540", "group": "Sapphire"},
    {"name": "Azure",            "id": "732", "group": "Sapphire"},
    # Ruby servers
    {"name": "Lucifer",          "id": "431", "group": "Ruby"},
    {"name": "Charon",           "id": "426", "group": "Ruby"},
    {"name": "Chimera",          "id": "531", "group": "Ruby"},
    {"name": "Kirin",            "id": "723", "group": "Ruby"},
    # International / EU servers
    {"name": "Germania",         "id": "70",  "group": "International"},
    {"name": "Teutonia",         "id": "71",  "group": "International"},
    {"name": "Europe",           "id": "502", "group": "International"},
    {"name": "Italia",           "id": "503", "group": "International"},
    {"name": "Iberia",           "id": "506", "group": "International"},
    {"name": "Tigerghost",       "id": "524", "group": "International"},
    {"name": "Nyx",              "id": "541", "group": "International"},
    {"name": "Chione",           "id": "733", "group": "International"},
    # Other regional servers
    {"name": "România",          "id": "599", "group": "Regional"},
    {"name": "Tara Româneascã",  "id": "54",  "group": "Regional"},
    {"name": "Magyarország",     "id": "700", "group": "Regional"},
    {"name": "Česko",            "id": "701", "group": "Regional"},
    {"name": "Polska",           "id": "702", "group": "Regional"},
]

@router.get("/servers")
def get_servers(db: Session = Depends(database.get_db)):
    """Returns the complete list of metin2alerts servers, with a flag for those that have data in the DB."""
    db_servers = {s.name for s in db.query(models.Server).all()}
    return [
        {"id": s["id"], "name": s["name"], "group": s["group"], "has_data": s["name"] in db_servers}
        for s in ALL_SERVERS
    ]

# ── Watchlist CRUD ──────────────────────────────────────────────

@router.get("/watchlist", response_model=List[schemas.WatchlistItemOut])
def get_watchlist(db: Session = Depends(database.get_db)):
    """Returns all watchlist items."""
    return db.query(models.WatchlistItem).order_by(models.WatchlistItem.created_at.desc()).all()

@router.post("/watchlist", response_model=schemas.WatchlistItemOut)
def add_watchlist_item(item: schemas.WatchlistItemCreate, db: Session = Depends(database.get_db)):
    """Add an item to the watchlist for automatic scraping."""
    # Check for duplicate
    existing = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.query == item.query,
        models.WatchlistItem.server_name == item.server_name
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Item already on watchlist for this server")
    
    db_item = models.WatchlistItem(
        query=item.query,
        server_name=item.server_name
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/watchlist/{item_id}")
def remove_watchlist_item(item_id: int, db: Session = Depends(database.get_db)):
    """Remove an item from the watchlist."""
    item = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"message": f"Removed '{item.query}' from watchlist"}

@router.patch("/watchlist/{item_id}/toggle")
def toggle_watchlist_item(item_id: int, db: Session = Depends(database.get_db)):
    """Toggle active/inactive status of a watchlist item."""
    item = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    item.is_active = 0 if item.is_active else 1
    db.commit()
    db.refresh(item)
    return item

# ── Telegram Settings ───────────────────────────────────────────

@router.get("/telegram/settings", response_model=Optional[schemas.TelegramSettingsOut])
def get_telegram_settings(db: Session = Depends(database.get_db)):
    """Get the current Telegram bot settings (single-row config)."""
    row = db.query(models.TelegramSettings).first()
    return row

@router.post("/telegram/settings", response_model=schemas.TelegramSettingsOut)
def save_telegram_settings(body: schemas.TelegramSettingsCreate, db: Session = Depends(database.get_db)):
    """Create or update the Telegram bot settings."""
    existing = db.query(models.TelegramSettings).first()
    if existing:
        existing.bot_token = body.bot_token
        existing.chat_id = body.chat_id
    else:
        existing = models.TelegramSettings(bot_token=body.bot_token, chat_id=body.chat_id)
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

@router.patch("/telegram/settings/toggle")
def toggle_telegram(db: Session = Depends(database.get_db)):
    """Toggle Telegram notifications globally on/off."""
    row = db.query(models.TelegramSettings).first()
    if not row:
        raise HTTPException(status_code=404, detail="Telegram not configured yet")
    row.is_active = 0 if row.is_active else 1
    db.commit()
    db.refresh(row)
    return row

@router.post("/telegram/test")
async def test_telegram(db: Session = Depends(database.get_db)):
    """Send a test message to verify the Telegram configuration."""
    cfg = db.query(models.TelegramSettings).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Telegram not configured")
    try:
        await send_telegram_message(cfg.bot_token, cfg.chat_id, "✅ <b>Metin2 Market</b> – Telegram-Verbindung erfolgreich!")
        return {"message": "Testnachricht gesendet!"}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Telegram API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# ── Price Alerts ────────────────────────────────────────────────

@router.get("/alerts", response_model=List[schemas.PriceAlertOut])
def get_alerts(watchlist_id: Optional[int] = None, db: Session = Depends(database.get_db)):
    """Get all price alerts, optionally filtered by watchlist item."""
    q = db.query(models.PriceAlert)
    if watchlist_id is not None:
        q = q.filter(models.PriceAlert.watchlist_id == watchlist_id)
    return q.order_by(models.PriceAlert.created_at.desc()).all()

@router.post("/alerts", response_model=schemas.PriceAlertOut)
def create_alert(body: schemas.PriceAlertCreate, db: Session = Depends(database.get_db)):
    """Create a price alert for a watchlist item."""
    wl = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == body.watchlist_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    alert = models.PriceAlert(
        watchlist_id=body.watchlist_id,
        price_threshold=body.price_threshold,
        price_type=body.price_type,
        direction=body.direction,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(database.get_db)):
    """Delete a price alert."""
    alert = db.query(models.PriceAlert).filter(models.PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}

@router.patch("/alerts/{alert_id}/toggle")
def toggle_alert(alert_id: int, db: Session = Depends(database.get_db)):
    """Toggle a price alert on/off."""
    alert = db.query(models.PriceAlert).filter(models.PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = 0 if alert.is_active else 1
    db.commit()
    db.refresh(alert)
    return alert

# ── Percentage Alerts ───────────────────────────────────────────

VALID_METRICS = {"min", "avg_bottom20", "avg"}

@router.get("/percentage-alerts", response_model=List[schemas.PercentageAlertOut])
def get_percentage_alerts(watchlist_id: Optional[int] = None, db: Session = Depends(database.get_db)):
    """Get all percentage-based alerts, optionally filtered by watchlist item."""
    q = db.query(models.PercentageAlert)
    if watchlist_id is not None:
        q = q.filter(models.PercentageAlert.watchlist_id == watchlist_id)
    return q.order_by(models.PercentageAlert.created_at.desc()).all()

@router.post("/percentage-alerts", response_model=schemas.PercentageAlertOut)
def create_percentage_alert(body: schemas.PercentageAlertCreate, db: Session = Depends(database.get_db)):
    """Create a percentage-based deviation alert for a watchlist item."""
    if body.metric_a not in VALID_METRICS or body.metric_b not in VALID_METRICS:
        raise HTTPException(status_code=400, detail=f"Invalid metric. Must be one of: {VALID_METRICS}")
    if body.metric_a == body.metric_b:
        raise HTTPException(status_code=400, detail="metric_a and metric_b must be different")
    wl = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == body.watchlist_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    alert = models.PercentageAlert(
        watchlist_id=body.watchlist_id,
        metric_a=body.metric_a,
        metric_b=body.metric_b,
        threshold_pct=body.threshold_pct,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/percentage-alerts/{alert_id}")
def delete_percentage_alert(alert_id: int, db: Session = Depends(database.get_db)):
    """Delete a percentage-based alert."""
    alert = db.query(models.PercentageAlert).filter(models.PercentageAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Percentage alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Percentage alert deleted"}

@router.patch("/percentage-alerts/{alert_id}/toggle")
def toggle_percentage_alert(alert_id: int, db: Session = Depends(database.get_db)):
    """Toggle a percentage-based alert on/off."""
    alert = db.query(models.PercentageAlert).filter(models.PercentageAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Percentage alert not found")
    alert.is_active = 0 if alert.is_active else 1
    db.commit()
    db.refresh(alert)
    return alert

# ── Fake Sellers ────────────────────────────────────────────────

@router.get("/fake-sellers", response_model=List[schemas.FakeSellerOut])
def get_fake_sellers(db: Session = Depends(database.get_db)):
    """Get all flagged fake sellers."""
    return db.query(models.FakeSeller).order_by(models.FakeSeller.created_at.desc()).all()

@router.post("/fake-sellers", response_model=schemas.FakeSellerOut)
def add_fake_seller(body: schemas.FakeSellerCreate, db: Session = Depends(database.get_db)):
    """Flag a seller as fake. Their listings will be excluded from price calculations."""
    existing = db.query(models.FakeSeller).filter(models.FakeSeller.seller_name == body.seller_name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Seller already flagged")
    seller = models.FakeSeller(seller_name=body.seller_name, reason=body.reason)
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return seller

@router.delete("/fake-sellers/{seller_id}")
def remove_fake_seller(seller_id: int, db: Session = Depends(database.get_db)):
    """Remove a seller from the fake list."""
    seller = db.query(models.FakeSeller).filter(models.FakeSeller.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Fake seller entry not found")
    db.delete(seller)
    db.commit()
    return {"message": f"Seller '{seller.seller_name}' removed from fake list"}
