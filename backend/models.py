from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Server(Base):
    __tablename__ = "servers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String)
    image_url = Column(String, nullable=True)

class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    seller_name = Column(String)
    quantity = Column(Integer)
    price_won = Column(Integer, default=0)
    price_yang = Column(Integer, default=0)
    total_price_yang = Column(BigInteger)
    seen_at = Column(DateTime(timezone=True), server_default=func.now())

    server = relationship("Server")
    item = relationship("Item")
    bonuses = relationship("ListingBonus", back_populates="listing")

class ListingBonus(Base):
    __tablename__ = "listing_bonuses"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    bonus_name = Column(String)
    bonus_value = Column(String)

    listing = relationship("Listing", back_populates="bonuses")

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True)
    avg_unit_price = Column(BigInteger)
    min_unit_price = Column(BigInteger)
    avg_bottom20_price = Column(BigInteger, nullable=True)
    total_listings = Column(Integer)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class WatchlistItem(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, nullable=False)
    server_name = Column(String, nullable=False, default="Chimera")
    is_active = Column(Integer, default=1)
    interval_minutes = Column(Integer, default=20)
    last_scraped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alerts = relationship("PriceAlert", back_populates="watchlist_item", cascade="all, delete-orphan")
    percentage_alerts = relationship("PercentageAlert", back_populates="watchlist_item", cascade="all, delete-orphan")


class TelegramSettings(Base):
    __tablename__ = "telegram_settings"
    id = Column(Integer, primary_key=True, index=True)
    bot_token = Column(String, nullable=False)
    chat_id = Column(String, nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FakeSeller(Base):
    __tablename__ = "fake_sellers"
    id = Column(Integer, primary_key=True, index=True)
    seller_name = Column(String, unique=True, nullable=False, index=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ListingSnapshot(Base):
    __tablename__ = "listing_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False, index=True)
    seller_name = Column(String, nullable=False, index=True)
    server_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    price_won = Column(Integer, default=0)
    price_yang = Column(Integer, default=0)
    total_price_yang = Column(BigInteger, nullable=False)
    unit_price = Column(BigInteger, nullable=False)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlist.id", ondelete="CASCADE"), nullable=False)
    price_threshold = Column(BigInteger, nullable=False)
    price_type = Column(String, nullable=False, default="yang")  # "yang" or "won"
    direction = Column(String, nullable=False, default="below")   # "below" or "above"
    is_active = Column(Integer, default=1)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    watchlist_item = relationship("WatchlistItem", back_populates="alerts")


class PercentageAlert(Base):
    __tablename__ = "percentage_alerts"
    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlist.id", ondelete="CASCADE"), nullable=False)
    metric_a = Column(String, nullable=False)         # "min", "avg_bottom20", "avg"
    metric_b = Column(String, nullable=False)         # "min", "avg_bottom20", "avg"
    threshold_pct = Column(Float, nullable=False)     # e.g. 15.0 for 15%
    is_active = Column(Integer, default=1)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    watchlist_item = relationship("WatchlistItem", back_populates="percentage_alerts")
