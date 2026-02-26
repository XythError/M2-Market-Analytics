from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ServerBase(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class ListingBonusBase(BaseModel):
    bonus_name: str
    bonus_value: Optional[str] = None
    
    class Config:
        from_attributes = True

class ListingOut(BaseModel):
    id: int
    server: ServerBase
    item: ItemBase
    seller_name: str
    quantity: int
    price_won: int
    price_yang: int
    total_price_yang: int
    seen_at: datetime
    bonuses: List[ListingBonusBase] = [] 

    class Config:
        from_attributes = True

class WatchlistItemCreate(BaseModel):
    query: str
    server_name: str = "Chimera"
    interval_minutes: int = 20

class PriceAlertOut(BaseModel):
    id: int
    watchlist_id: int
    price_threshold: int
    price_type: str
    direction: str
    is_active: int
    last_triggered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WatchlistItemOut(BaseModel):
    id: int
    query: str
    server_name: str
    is_active: int
    interval_minutes: int
    last_scraped_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    alerts: List[PriceAlertOut] = []

    class Config:
        from_attributes = True

# ── Telegram ────────────────────────────────────────────────────

class TelegramSettingsCreate(BaseModel):
    bot_token: str
    chat_id: str

class TelegramSettingsOut(BaseModel):
    id: int
    bot_token: str
    chat_id: str
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PriceAlertCreate(BaseModel):
    watchlist_id: int
    price_threshold: int
    price_type: str = "yang"       # "yang" or "won"
    direction: str = "below"       # "below" or "above"

# ── Fake Sellers ────────────────────────────────────────────────

class FakeSellerCreate(BaseModel):
    seller_name: str
    reason: Optional[str] = None

class FakeSellerOut(BaseModel):
    id: int
    seller_name: str
    reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
