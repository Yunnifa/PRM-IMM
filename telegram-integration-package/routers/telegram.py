# routers/telegram.py
# FastAPI router untuk Telegram: webhook, CRUD subscriber, broadcast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from app.database import get_db
from app.dependencies import require_admin       # Sesuaikan dengan auth system Anda
from app.models.user import User                 # Sesuaikan dengan model User Anda
from app.models.telegram_subscriber import TelegramSubscriber
from app.schemas.telegram import (
    TelegramSubscriberCreate,
    TelegramSubscriberUpdate,
    TelegramSubscriberResponse,
    TelegramSubscriberListResponse,
    TelegramWebhookUpdate,
    BroadcastMessage,
    BroadcastResult
)
from app.services.telegram_service import telegram_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["Telegram"])


# =====================================================
# WEBHOOK ENDPOINT (Menerima pesan dari Telegram)
# =====================================================
@router.post("/webhook")
async def telegram_webhook(update: dict, db: Session = Depends(get_db)):
    """
    Endpoint untuk menerima update dari Telegram Bot.
    Bot akan memanggil endpoint ini setiap ada pesan masuk.
    
    Commands yang didukung:
    - /start atau /subscribe - Mendaftar notifikasi
    - /stop atau /unsubscribe - Berhenti langganan
    - /status - Cek status langganan
    - /help - Bantuan
    """
    try:
        message = update.get("message") or update.get("edited_message")
        if not message:
            return {"ok": True}
        
        chat = message.get("chat", {})
        from_user = message.get("from", {})
        text = message.get("text", "")
        
        chat_id = str(chat.get("id"))
        chat_type = chat.get("type", "private")
        user_id = from_user.get("id")
        username = from_user.get("username")
        first_name = from_user.get("first_name", "")
        last_name = from_user.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip()
        
        # Handle commands
        if text.startswith("/start") or text.startswith("/subscribe"):
            await handle_subscribe(db, chat_id, user_id, username, full_name, chat_type)
        elif text.startswith("/stop") or text.startswith("/unsubscribe"):
            await handle_unsubscribe(db, chat_id)
        elif text.startswith("/status"):
            await handle_status(db, chat_id)
        elif text.startswith("/help"):
            await handle_help(chat_id)
        else:
            await handle_unknown(chat_id)
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        return {"ok": True}  # Return ok agar Telegram tidak retry


async def handle_subscribe(
    db: Session, 
    chat_id: str, 
    user_id: Optional[int],
    username: Optional[str],
    full_name: Optional[str],
    chat_type: str
):
    """Handle command /start atau /subscribe"""
    subscriber = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.chat_id == chat_id
    ).first()
    
    if subscriber:
        if subscriber.is_active:
            message = (
                "✅ <b>Anda Sudah Terdaftar!</b>\n\n"
                "Anda sudah berlangganan notifikasi.\n"
                "Ketik /help untuk bantuan."
            )
        else:
            # Reaktivasi subscriber
            subscriber.is_active = True
            subscriber.unsubscribed_at = None
            subscriber.telegram_user_id = user_id
            subscriber.telegram_username = username
            subscriber.full_name = full_name
            db.commit()
            
            message = (
                "🎉 <b>Selamat Datang Kembali!</b>\n\n"
                "Langganan notifikasi Anda telah diaktifkan kembali.\n"
                "Ketik /help untuk bantuan."
            )
    else:
        # Buat subscriber baru
        new_subscriber = TelegramSubscriber(
            chat_id=chat_id,
            telegram_user_id=user_id,
            telegram_username=username,
            full_name=full_name,
            chat_type=chat_type,
            is_active=True
        )
        db.add(new_subscriber)
        db.commit()
        
        message = (
            "🎉 <b>Pendaftaran Berhasil!</b>\n\n"
            "Selamat datang di Notification Bot!\n\n"
            "<b>Commands:</b>\n"
            "/status - Cek status langganan\n"
            "/stop - Berhenti langganan\n"
            "/help - Bantuan"
        )
    
    await telegram_service.send_message_to_chat(chat_id, message.strip())


async def handle_unsubscribe(db: Session, chat_id: str):
    """Handle command /stop atau /unsubscribe"""
    subscriber = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.chat_id == chat_id
    ).first()
    
    if subscriber and subscriber.is_active:
        subscriber.is_active = False
        subscriber.unsubscribed_at = datetime.utcnow()
        db.commit()
        
        message = (
            "👋 <b>Berhenti Langganan</b>\n\n"
            "Anda telah berhenti berlangganan notifikasi.\n"
            "Ketik /start untuk berlangganan kembali."
        )
    else:
        message = (
            "ℹ️ <b>Tidak Terdaftar</b>\n\n"
            "Anda belum berlangganan notifikasi.\n"
            "Ketik /start untuk mendaftar."
        )
    
    await telegram_service.send_message_to_chat(chat_id, message.strip())


async def handle_status(db: Session, chat_id: str):
    """Handle command /status"""
    subscriber = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.chat_id == chat_id
    ).first()
    
    if subscriber:
        status_text = "✅ Aktif" if subscriber.is_active else "❌ Tidak Aktif"
        subscribed_date = subscriber.subscribed_at.strftime("%d %b %Y %H:%M")
        last_notified = subscriber.last_notified_at.strftime("%d %b %Y %H:%M") if subscriber.last_notified_at else "Belum pernah"
        
        message = (
            "📊 <b>Status Langganan</b>\n\n"
            f"<b>Status:</b> {status_text}\n"
            f"<b>Terdaftar:</b> {subscribed_date}\n"
            f"<b>Notifikasi Terakhir:</b> {last_notified}\n"
            f"<b>Username:</b> @{subscriber.telegram_username or 'Tidak tersedia'}\n"
            f"<b>Nama:</b> {subscriber.full_name or 'Tidak tersedia'}"
        )
    else:
        message = (
            "ℹ️ <b>Tidak Terdaftar</b>\n\n"
            "Anda belum berlangganan notifikasi.\n"
            "Ketik /start untuk mendaftar."
        )
    
    await telegram_service.send_message_to_chat(chat_id, message.strip())


async def handle_help(chat_id: str):
    """Handle command /help"""
    message = (
        "📖 <b>Bantuan Notification Bot</b>\n\n"
        "Bot ini mengirimkan notifikasi otomatis dari sistem.\n\n"
        "<b>⌨️ Commands:</b>\n"
        "/start - Mulai berlangganan\n"
        "/stop - Berhenti langganan\n"
        "/status - Cek status langganan\n"
        "/help - Tampilkan bantuan ini\n\n"
        "Jika ada pertanyaan, hubungi Admin."
    )
    await telegram_service.send_message_to_chat(chat_id, message.strip())


async def handle_unknown(chat_id: str):
    """Handle pesan yang tidak dikenali"""
    message = (
        "🤖 <b>Notification Bot</b>\n\n"
        "Saya adalah bot notifikasi otomatis.\n"
        "Ketik /help untuk melihat commands yang tersedia."
    )
    await telegram_service.send_message_to_chat(chat_id, message.strip())


# =====================================================
# ADMIN ENDPOINTS
# =====================================================
@router.get("/subscribers", response_model=TelegramSubscriberListResponse)
async def list_subscribers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Mendapatkan daftar semua subscriber."""
    subscribers = db.query(TelegramSubscriber).order_by(
        TelegramSubscriber.subscribed_at.desc()
    ).all()
    
    active_count = sum(1 for s in subscribers if s.is_active)
    inactive_count = len(subscribers) - active_count
    
    return TelegramSubscriberListResponse(
        total=len(subscribers),
        active_count=active_count,
        inactive_count=inactive_count,
        subscribers=[TelegramSubscriberResponse.model_validate(s) for s in subscribers]
    )


@router.post("/subscribers", response_model=TelegramSubscriberResponse)
async def add_subscriber(
    data: TelegramSubscriberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Menambahkan subscriber secara manual."""
    existing = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.chat_id == data.chat_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subscriber dengan chat_id {data.chat_id} sudah terdaftar"
        )
    
    subscriber = TelegramSubscriber(
        chat_id=data.chat_id,
        telegram_user_id=data.telegram_user_id,
        telegram_username=data.telegram_username,
        full_name=data.full_name,
        chat_type=data.chat_type,
        notes=data.notes,
        is_active=True
    )
    
    db.add(subscriber)
    db.commit()
    db.refresh(subscriber)
    
    return TelegramSubscriberResponse.model_validate(subscriber)


@router.patch("/subscribers/{chat_id}", response_model=TelegramSubscriberResponse)
async def update_subscriber(
    chat_id: str,
    data: TelegramSubscriberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Update subscriber (aktivasi/deaktivasi, catatan, dll)."""
    subscriber = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.chat_id == chat_id
    ).first()
    
    if not subscriber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscriber dengan chat_id {chat_id} tidak ditemukan"
        )
    
    if data.is_active is not None:
        subscriber.is_active = data.is_active
        if not data.is_active:
            subscriber.unsubscribed_at = datetime.utcnow()
        else:
            subscriber.unsubscribed_at = None
    
    if data.notes is not None:
        subscriber.notes = data.notes
    if data.telegram_username is not None:
        subscriber.telegram_username = data.telegram_username
    if data.full_name is not None:
        subscriber.full_name = data.full_name
    
    db.commit()
    db.refresh(subscriber)
    
    return TelegramSubscriberResponse.model_validate(subscriber)


@router.delete("/subscribers/{chat_id}")
async def delete_subscriber(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Hapus subscriber secara permanen."""
    subscriber = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.chat_id == chat_id
    ).first()
    
    if not subscriber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscriber dengan chat_id {chat_id} tidak ditemukan"
        )
    
    db.delete(subscriber)
    db.commit()
    
    return {"message": f"Subscriber {chat_id} berhasil dihapus", "chat_id": chat_id}


@router.post("/broadcast", response_model=BroadcastResult)
async def broadcast_message(
    data: BroadcastMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Kirim pesan broadcast ke semua subscriber aktif."""
    result = await telegram_service.broadcast_message(db, data.message, data.parse_mode)
    return result


@router.post("/test-notification")
async def test_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Kirim notifikasi test ke semua subscriber."""
    test_message = (
        "🧪 <b>TEST NOTIFICATION</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "Ini adalah pesan test dari sistem.\n"
        "Jika Anda menerima pesan ini, notifikasi berfungsi dengan baik!"
    )
    
    result = await telegram_service.broadcast_message(db, test_message.strip())
    
    return {
        "message": "Test notification sent",
        "total_subscribers": result.total_subscribers,
        "success_count": result.success_count,
        "failed_count": result.failed_count
    }


@router.get("/bot-info")
async def get_bot_info(
    current_user: User = Depends(require_admin)
):
    """[Admin Only] Mendapatkan informasi bot Telegram."""
    info = await telegram_service.get_bot_info()
    return {"message": "Bot info retrieved", "data": info}


@router.post("/setup-webhook")
async def setup_webhook(
    webhook_url: str,
    current_user: User = Depends(require_admin)
):
    """
    [Admin Only] Setup webhook URL untuk bot Telegram.
    Contoh: https://your-domain.com/api/telegram/webhook
    """
    success = await telegram_service.set_webhook(webhook_url)
    
    if success:
        return {"message": "Webhook berhasil di-setup", "webhook_url": webhook_url}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal setup webhook"
        )
