"""
Telegram Bot integration – sends price alert messages via the Telegram Bot API.
Uses only httpx (no heavy SDK needed).
"""

import httpx
from datetime import datetime


async def send_telegram_message(bot_token: str, chat_id: str, text: str) -> dict:
    """Send a message via Telegram Bot API (async)."""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()


def send_telegram_message_sync(bot_token: str, chat_id: str, text: str) -> dict:
    """Send a message via Telegram Bot API (sync – used by the scheduler)."""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()


def format_alert_message(item_name: str, price: int, price_type: str, direction: str) -> str:
    """Build a nice Telegram alert message."""
    arrow = "⬇️" if direction == "below" else "⬆️"
    currency = "Yang" if price_type == "yang" else "Won"
    now_str = datetime.now().strftime("%d.%m.%Y %H:%M")
    return (
        f"{arrow} <b>Preis-Alert ausgelöst!</b>\n\n"
        f"📦 <b>Item:</b> {item_name}\n"
        f"💰 <b>Preis:</b> {price:,} {currency}\n"
        f"📊 <b>Schwelle:</b> {direction}\n"
        f"🕐 {now_str}"
    )
