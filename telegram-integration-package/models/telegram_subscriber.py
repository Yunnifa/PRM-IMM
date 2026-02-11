# models/telegram_subscriber.py
# Model untuk menyimpan daftar subscriber Telegram multi-user

from sqlalchemy import Column, String, Boolean, DateTime, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database import Base


class TelegramSubscriber(Base):
    """
    Model untuk menyimpan daftar subscriber Telegram.
    Setiap user yang mendaftar melalui bot akan dicatat di sini,
    dan notifikasi akan dikirim ke semua subscriber aktif.
    """
    __tablename__ = "telegram_subscribers"
    __table_args__ = {'extend_existing': True}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Chat ID dari Telegram (bisa personal atau group)
    chat_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Telegram user ID (untuk personal chat)
    telegram_user_id = Column(BigInteger, nullable=True)
    
    # Username Telegram (jika tersedia)
    telegram_username = Column(String(255), nullable=True)
    
    # Nama lengkap dari Telegram
    full_name = Column(String(255), nullable=True)
    
    # Tipe chat: "private", "group", atau "supergroup"
    chat_type = Column(String(50), default="private", nullable=False)
    
    # Status aktif subscriber
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Catatan atau keterangan
    notes = Column(Text, nullable=True)
    
    # Audit Trail
    subscribed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    unsubscribed_at = Column(DateTime, nullable=True)
    last_notified_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<TelegramSubscriber {self.chat_id} - Active: {self.is_active}>"
