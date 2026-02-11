#!/usr/bin/env python3
"""
Script untuk mendapatkan Chat ID Telegram dengan mudah.
Jalankan script ini, lalu kirim pesan ke bot Anda.

Usage:
    python get_chat_id.py
    python get_chat_id.py YOUR_BOT_TOKEN
"""
import asyncio
import httpx
import sys


def print_instructions():
    """Print instruksi untuk mendapatkan bot token"""
    print("=" * 70)
    print("📱 CARA MENDAPATKAN TELEGRAM BOT TOKEN & CHAT ID")
    print("=" * 70)
    print()
    print("🤖 LANGKAH 1: Buat Bot (jika belum punya)")
    print("-" * 70)
    print("1. Buka Telegram dan cari @BotFather")
    print("2. Kirim pesan: /newbot")
    print("3. Ikuti instruksi, beri nama dan username untuk bot Anda")
    print("4. BotFather akan memberikan TOKEN seperti:")
    print("   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
    print()
    print("💬 LANGKAH 2: Dapatkan Chat ID Anda")
    print("-" * 70)
    print("Cara 1 - Menggunakan @userinfobot:")
    print("  1. Buka @userinfobot di Telegram")
    print("  2. Kirim pesan apapun")
    print("  3. Bot akan reply dengan Chat ID Anda")
    print()
    print("Cara 2 - Menggunakan script ini:")
    print("  1. Jalankan: python get_chat_id.py YOUR_BOT_TOKEN")
    print("  2. Kirim /start ke bot Anda")
    print("  3. Script akan menampilkan Chat ID Anda")
    print()
    print("=" * 70)


async def get_updates(bot_token: str):
    """Ambil update dari bot untuk mendapatkan chat_id"""
    print("\n⏳ Menunggu pesan dari Anda...")
    print("📝 Silakan:")
    print("   1. Buka bot Anda di Telegram")
    print("   2. Kirim pesan /start atau pesan apapun")
    print("   3. Kembali ke sini untuk melihat Chat ID Anda")
    print("\n⏸️  Tekan Ctrl+C untuk berhenti")
    print("=" * 70)
    
    url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        offset = 0
        seen_chat_ids = set()
        
        while True:
            try:
                params = {"offset": offset, "timeout": 10}
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"❌ Error: {response.text}")
                    break
                
                data = response.json()
                
                if not data.get("ok"):
                    print(f"❌ Bot error: {data.get('description')}")
                    break
                
                updates = data.get("result", [])
                
                for update in updates:
                    update_id = update.get("update_id")
                    offset = update_id + 1
                    
                    message = update.get("message", {})
                    chat = message.get("chat", {})
                    chat_id = str(chat.get("id", ""))
                    
                    if chat_id and chat_id not in seen_chat_ids:
                        seen_chat_ids.add(chat_id)
                        
                        print("\n" + "=" * 70)
                        print("✅ CHAT ID DITEMUKAN!")
                        print("=" * 70)
                        print(f"Chat ID  : {chat_id}")
                        print(f"From     : {message.get('from', {}).get('first_name', 'N/A')}")
                        print(f"Username : @{message.get('from', {}).get('username', 'N/A')}")
                        print(f"Message  : {message.get('text', 'N/A')}")
                        print("=" * 70)
                        print()
                        print("📝 Simpan Chat ID ini untuk ditambahkan sebagai subscriber!")
                        print()
                
                await asyncio.sleep(1)
                
            except httpx.TimeoutException:
                continue
            except KeyboardInterrupt:
                print("\n\n👋 Stopped!")
                break
            except Exception as e:
                print(f"❌ Error: {str(e)}")
                await asyncio.sleep(5)


def main():
    if len(sys.argv) < 2:
        print_instructions()
        bot_token = input("💡 Masukkan Bot Token Anda: ").strip()
        if not bot_token:
            print("❌ Bot token tidak boleh kosong!")
            sys.exit(1)
    else:
        bot_token = sys.argv[1]
    
    print(f"\n✅ Bot Token diterima: {bot_token[:10]}...")
    
    try:
        asyncio.run(get_updates(bot_token))
    except KeyboardInterrupt:
        print("\n\n👋 Stopped!")


if __name__ == "__main__":
    main()
