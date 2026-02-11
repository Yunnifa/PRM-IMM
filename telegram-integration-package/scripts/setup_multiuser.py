#!/usr/bin/env python3
"""
Script untuk setup Telegram Multi-User Bot secara lengkap:
- Cek info bot
- Setup webhook
- Tambah subscriber awal
- Kirim test message

Usage:
    python setup_multiuser.py

PENTING: Edit variabel di bawah sebelum menjalankan!
"""
import os
import sys
import asyncio
import httpx
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

# ==============================
# EDIT KONFIGURASI DI BAWAH INI
# ==============================
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"                              # Dari @BotFather
WEBHOOK_URL = "https://your-domain.com/api/telegram/webhook"   # URL backend Anda
INITIAL_CHAT_IDS = ["123456789", "987654321"]                   # Chat ID subscriber awal


async def get_bot_info():
    """Dapatkan informasi bot"""
    print("\n📋 Getting bot info...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe")
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    bot_info = result.get("result", {})
                    print(f"✅ Bot Name: @{bot_info.get('username')}")
                    print(f"✅ Bot ID: {bot_info.get('id')}")
                    return True
            print(f"❌ Error: {response.text}")
            return False
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            return False


async def setup_webhook():
    """Setup webhook untuk bot telegram"""
    print(f"\n🔧 Setting up webhook: {WEBHOOK_URL}")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook",
                json={"url": WEBHOOK_URL}
            )
            if response.status_code == 200 and response.json().get("ok"):
                print(f"✅ Webhook berhasil di-setup!")
                return True
            print(f"❌ Error: {response.text}")
            return False
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            return False


def add_initial_subscribers():
    """Menambahkan subscriber awal ke database"""
    print("\n👥 Adding initial subscribers...")
    try:
        engine = create_engine(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
        with engine.connect() as conn:
            for chat_id in INITIAL_CHAT_IDS:
                result = conn.execute(text(
                    "SELECT COUNT(*) FROM telegram_subscribers WHERE chat_id = :chat_id"
                ), {"chat_id": chat_id})
                
                if result.scalar() == 0:
                    conn.execute(text("""
                        INSERT INTO telegram_subscribers 
                        (chat_id, chat_type, is_active, notes, subscribed_at) 
                        VALUES (:chat_id, 'private', true, 'Initial subscriber', :now)
                    """), {"chat_id": chat_id, "now": datetime.utcnow()})
                    print(f"✅ Added: {chat_id}")
                else:
                    print(f"ℹ️  Already exists: {chat_id}")
            conn.commit()
    except Exception as e:
        print(f"❌ Error: {str(e)}")


async def send_test_message():
    """Kirim pesan test ke semua subscriber awal"""
    print("\n🧪 Sending test message...")
    test_message = (
        "🎉 <b>SETUP BERHASIL!</b>\n\n"
        "Sistem notifikasi Telegram multi-user sudah aktif!\n\n"
        "<b>Commands:</b>\n"
        "/start - Subscribe\n"
        "/stop - Unsubscribe\n"
        "/status - Cek status\n"
        "/help - Bantuan"
    )
    
    async with httpx.AsyncClient() as client:
        for chat_id in INITIAL_CHAT_IDS:
            try:
                response = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                    json={"chat_id": chat_id, "text": test_message, "parse_mode": "HTML"}
                )
                if response.status_code == 200 and response.json().get("ok"):
                    print(f"✅ Test sent to {chat_id}")
                else:
                    print(f"❌ Failed for {chat_id}: {response.text}")
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"❌ Exception for {chat_id}: {str(e)}")


async def main():
    print("=" * 60)
    print("🤖 TELEGRAM MULTI-USER SETUP")
    print("=" * 60)
    
    await get_bot_info()
    await setup_webhook()
    add_initial_subscribers()
    await send_test_message()
    
    print("\n" + "=" * 60)
    print("✅ SETUP SELESAI!")
    print("=" * 60)
    print("\nLangkah selanjutnya:")
    print("1. User kirim /start ke bot untuk subscribe")
    print("2. Admin bisa broadcast via API /api/telegram/broadcast")
    print("3. Sistem otomatis kirim notifikasi ke semua subscriber")


if __name__ == "__main__":
    asyncio.run(main())
