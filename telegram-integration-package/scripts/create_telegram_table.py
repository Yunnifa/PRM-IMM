#!/usr/bin/env python3
"""
Script untuk membuat tabel telegram_subscribers secara manual.
Jalankan jika migrasi Alembic tidak berhasil.

Usage:
    python create_telegram_table.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.config import settings


def create_telegram_subscribers_table():
    """Buat tabel telegram_subscribers secara manual jika belum ada"""
    
    print("=" * 60)
    print("CREATE TELEGRAM_SUBSCRIBERS TABLE")
    print("=" * 60)
    
    # Sesuaikan connection string dengan database Anda
    engine = create_engine(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
    
    with engine.connect() as conn:
        inspector = inspect(conn)
        tables = inspector.get_table_names()
        
        print(f"\n📋 Current tables: {tables}")
        
        if 'telegram_subscribers' not in tables:
            print("\n⚠️  Table 'telegram_subscribers' not found. Creating...")
            
            create_sql = """
            CREATE TABLE telegram_subscribers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chat_id VARCHAR(100) NOT NULL UNIQUE,
                telegram_user_id BIGINT,
                telegram_username VARCHAR(255),
                full_name VARCHAR(255),
                chat_type VARCHAR(50) NOT NULL DEFAULT 'private',
                is_active BOOLEAN NOT NULL DEFAULT true,
                notes TEXT,
                subscribed_at TIMESTAMP NOT NULL DEFAULT now(),
                unsubscribed_at TIMESTAMP,
                last_notified_at TIMESTAMP
            );
            """
            
            conn.execute(text(create_sql))
            
            # Create indexes
            conn.execute(text(
                "CREATE INDEX ix_telegram_subscribers_chat_id ON telegram_subscribers (chat_id);"
            ))
            conn.execute(text(
                "CREATE INDEX ix_telegram_subscribers_is_active ON telegram_subscribers (is_active);"
            ))
            
            conn.commit()
            print("✅ Table 'telegram_subscribers' created successfully!")
        else:
            print("\n✅ Table 'telegram_subscribers' already exists")
        
        # Verification
        inspector = inspect(conn)
        if 'telegram_subscribers' in inspector.get_table_names():
            columns = inspector.get_columns('telegram_subscribers')
            print(f"\n📋 Table structure:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
            print("\n✅ Table ready!")


if __name__ == "__main__":
    create_telegram_subscribers_table()
