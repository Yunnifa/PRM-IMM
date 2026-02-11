#!/usr/bin/env python3
"""
Script untuk menambahkan Telegram subscriber langsung ke database.
Interactive CLI menu.

Usage:
    python add_subscriber_direct.py
"""
import sys
from pathlib import Path

# Add parent directory to path (sesuaikan dengan struktur project Anda)
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.telegram_subscriber import TelegramSubscriber
from datetime import datetime


def add_subscriber(chat_id: str, full_name: str = None, notes: str = None):
    """Tambahkan subscriber ke database"""
    db = SessionLocal()
    
    try:
        existing = db.query(TelegramSubscriber).filter(
            TelegramSubscriber.chat_id == chat_id
        ).first()
        
        if existing:
            print(f"⚠️  Subscriber dengan Chat ID {chat_id} sudah terdaftar!")
            print(f"   Name: {existing.full_name or 'N/A'}")
            print(f"   Status: {'Active' if existing.is_active else 'Inactive'}")
            
            if not existing.is_active:
                response = input("\nAktifkan subscriber ini? (y/n): ").strip().lower()
                if response == 'y':
                    existing.is_active = True
                    existing.unsubscribed_at = None
                    db.commit()
                    print("✅ Subscriber berhasil diaktifkan!")
            return
        
        subscriber = TelegramSubscriber(
            chat_id=chat_id,
            full_name=full_name,
            notes=notes,
            is_active=True,
            subscribed_at=datetime.utcnow()
        )
        
        db.add(subscriber)
        db.commit()
        
        print("✅ Subscriber berhasil ditambahkan!")
        print(f"   Chat ID: {chat_id}")
        print(f"   Name: {full_name or 'N/A'}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()


def list_subscribers():
    """Tampilkan semua subscriber"""
    db = SessionLocal()
    
    try:
        subscribers = db.query(TelegramSubscriber).all()
        
        if not subscribers:
            print("📭 Belum ada subscriber yang terdaftar")
            return
        
        print(f"\n📱 Total subscribers: {len(subscribers)}")
        print("=" * 70)
        
        for sub in subscribers:
            status = "✅ Active" if sub.is_active else "❌ Inactive"
            print(f"{status} | Chat ID: {sub.chat_id:15} | {sub.full_name or 'N/A'}")
        
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        db.close()


def main():
    print("=" * 70)
    print("🤖 TELEGRAM SUBSCRIBER MANAGEMENT - Direct Database")
    print("=" * 70)
    
    while True:
        print("\nMenu:")
        print("1. Tambah subscriber")
        print("2. Lihat semua subscriber")
        print("3. Keluar")
        
        choice = input("\nPilih (1-3): ").strip()
        
        if choice == "1":
            chat_id = input("Chat ID: ").strip()
            if not chat_id:
                print("❌ Chat ID tidak boleh kosong!")
                continue
            full_name = input("Nama (optional): ").strip() or None
            notes = input("Catatan (optional): ").strip() or None
            add_subscriber(chat_id, full_name, notes)
            
        elif choice == "2":
            list_subscribers()
            
        elif choice == "3":
            print("\n👋 Selesai!")
            break


if __name__ == "__main__":
    main()
