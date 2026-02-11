# schemas/telegram.py
# Pydantic schemas untuk validasi request/response Telegram API

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class TelegramSubscriberBase(BaseModel):
    """Base schema untuk subscriber"""
    chat_id: str
    telegram_username: Optional[str] = None
    full_name: Optional[str] = None
    chat_type: str = "private"
    notes: Optional[str] = None


class TelegramSubscriberCreate(TelegramSubscriberBase):
    """Schema untuk create subscriber"""
    telegram_user_id: Optional[int] = None


class TelegramSubscriberUpdate(BaseModel):
    """Schema untuk update subscriber"""
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    telegram_username: Optional[str] = None
    full_name: Optional[str] = None


class TelegramSubscriberResponse(BaseModel):
    """Schema response subscriber"""
    id: UUID
    chat_id: str
    telegram_user_id: Optional[int] = None
    telegram_username: Optional[str] = None
    full_name: Optional[str] = None
    chat_type: str
    is_active: bool
    notes: Optional[str] = None
    subscribed_at: datetime
    unsubscribed_at: Optional[datetime] = None
    last_notified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TelegramSubscriberListResponse(BaseModel):
    """Schema untuk list subscribers"""
    total: int
    active_count: int
    inactive_count: int
    subscribers: List[TelegramSubscriberResponse]


class TelegramWebhookUpdate(BaseModel):
    """Schema untuk menerima update dari Telegram Webhook"""
    update_id: int
    message: Optional[dict] = None


class TelegramBotCommand(BaseModel):
    """Schema untuk command dari bot"""
    command: str
    chat_id: str
    from_user_id: Optional[int] = None
    from_username: Optional[str] = None
    from_full_name: Optional[str] = None
    chat_type: str = "private"


class BroadcastMessage(BaseModel):
    """Schema untuk broadcast pesan ke semua subscriber"""
    message: str = Field(..., min_length=1, max_length=4096)
    parse_mode: str = Field(default="HTML")


class BroadcastResult(BaseModel):
    """Hasil broadcast"""
    total_subscribers: int
    success_count: int
    failed_count: int
    failed_chat_ids: List[str] = []
