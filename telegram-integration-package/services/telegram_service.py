# services/telegram_service.py
# Core service untuk kirim notifikasi Telegram ke multi-user (broadcast)

from typing import Optional, List
import logging
import asyncio
from datetime import datetime
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.notification import TelegramNotification, NotificationType

logger = logging.getLogger(__name__)


class BroadcastResult:
    """Result class for broadcast operations"""
    def __init__(self, total_subscribers: int = 0, success_count: int = 0, 
                 failed_count: int = 0, failed_chat_ids: List[str] = None):
        self.total_subscribers = total_subscribers
        self.success_count = success_count
        self.failed_count = failed_count
        self.failed_chat_ids = failed_chat_ids or []


class TelegramService:
    """
    Service untuk mengirim notifikasi Telegram - Multi User Support.
    
    Fitur:
    - Broadcast pesan ke semua subscriber aktif
    - Retry mechanism dengan exponential backoff
    - Connection pooling (shared httpx client)
    - Fallback ke default chat_id jika tidak ada subscriber
    """
    
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.default_chat_id = settings.TELEGRAM_CHAT_ID  # Fallback chat ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self._client = None
    
    def _get_client(self) -> httpx.AsyncClient:
        """Get or create shared async client dengan connection pooling"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )
        return self._client
    
    def _get_active_subscribers(self, db: Session) -> List[str]:
        """Mendapatkan daftar chat_id dari subscriber aktif"""
        try:
            from app.models.telegram_subscriber import TelegramSubscriber
            
            subscribers = db.query(TelegramSubscriber).filter(
                TelegramSubscriber.is_active == True
            ).all()
            
            chat_ids = [s.chat_id for s in subscribers]
            
            # Fallback: jika tidak ada subscriber, gunakan default chat_id
            if not chat_ids and self.default_chat_id:
                logger.info("No active subscribers found, using default chat_id")
                chat_ids = [self.default_chat_id]
            
            return chat_ids
        except Exception as e:
            logger.warning(f"Error getting subscribers, using default chat_id: {str(e)}")
            if self.default_chat_id:
                return [self.default_chat_id]
            return []
    
    async def send_message_to_chat(self, chat_id: str, message: str, max_retries: int = 3) -> bool:
        """Kirim pesan ke satu chat_id tertentu dengan retry mechanism"""
        client = self._get_client()
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Sending telegram message to {chat_id} (attempt {attempt + 1}/{max_retries})")
                
                response = await client.post(
                    f"{self.base_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": message,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"Telegram message sent successfully to {chat_id}")
                    return True
                elif response.status_code == 400:
                    logger.error(f"Telegram API Bad Request for {chat_id}: {response.text}")
                    return False
                elif response.status_code == 403:
                    logger.warning(f"Bot blocked by user {chat_id}")
                    return False
                else:
                    logger.warning(f"Telegram API returned {response.status_code} for {chat_id}: {response.text}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    return False
                    
            except httpx.TimeoutException as e:
                logger.warning(f"Telegram request timeout for {chat_id} on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                logger.error(f"All {max_retries} attempts timed out for {chat_id}")
                return False
                
            except httpx.NetworkError as e:
                logger.warning(f"Network error for {chat_id} on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                logger.error(f"Network error after {max_retries} attempts for {chat_id}")
                return False
                
            except Exception as e:
                logger.error(f"Unexpected error sending telegram to {chat_id}: {str(e)}", exc_info=True)
                return False
        
        return False
    
    async def send_message(self, message: str, max_retries: int = 3) -> bool:
        """Kirim pesan ke default chat_id (backward compatible)"""
        if not self.default_chat_id:
            logger.error("No default chat_id configured")
            return False
        return await self.send_message_to_chat(self.default_chat_id, message, max_retries)
    
    async def send_to_all_subscribers(self, db: Session, message: str) -> BroadcastResult:
        """Kirim pesan ke semua subscriber aktif"""
        chat_ids = self._get_active_subscribers(db)
        
        result = BroadcastResult(total_subscribers=len(chat_ids))
        
        if not chat_ids:
            logger.warning("No active subscribers to send message to")
            return result
        
        logger.info(f"Broadcasting message to {len(chat_ids)} subscribers")
        
        for chat_id in chat_ids:
            success = await self.send_message_to_chat(chat_id, message)
            if success:
                result.success_count += 1
                # Update last_notified_at
                try:
                    from app.models.telegram_subscriber import TelegramSubscriber
                    subscriber = db.query(TelegramSubscriber).filter(
                        TelegramSubscriber.chat_id == chat_id
                    ).first()
                    if subscriber:
                        subscriber.last_notified_at = datetime.utcnow()
                except Exception as e:
                    logger.warning(f"Could not update last_notified_at for {chat_id}: {str(e)}")
            else:
                result.failed_count += 1
                result.failed_chat_ids.append(chat_id)
            
            # Small delay untuk menghindari rate limiting Telegram
            await asyncio.sleep(0.1)
        
        try:
            db.commit()
        except Exception as e:
            logger.warning(f"Could not commit subscriber updates: {str(e)}")
        
        logger.info(f"Broadcast complete: {result.success_count}/{result.total_subscribers} successful")
        return result
    
    async def broadcast_message(self, db: Session, message: str, parse_mode: str = "HTML") -> BroadcastResult:
        """Alias untuk send_to_all_subscribers"""
        return await self.send_to_all_subscribers(db, message)
    
    async def get_bot_info(self) -> dict:
        """Mendapatkan informasi bot dari Telegram API"""
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/getMe")
            if response.status_code == 200:
                return response.json().get("result", {})
            return {"error": response.text}
        except Exception as e:
            return {"error": str(e)}
    
    async def set_webhook(self, webhook_url: str) -> bool:
        """Setup webhook URL untuk bot"""
        client = self._get_client()
        try:
            response = await client.post(
                f"{self.base_url}/setWebhook",
                json={"url": webhook_url}
            )
            if response.status_code == 200:
                logger.info(f"Webhook set to: {webhook_url}")
                return True
            logger.error(f"Failed to set webhook: {response.text}")
            return False
        except Exception as e:
            logger.error(f"Error setting webhook: {str(e)}")
            return False

    async def send_notification(
        self,
        db: Session,
        notification_type: NotificationType,
        message: str,
        vehicle_id=None,
        report_id=None
    ) -> Optional[TelegramNotification]:
        """
        Generic method untuk kirim notifikasi ke semua subscriber + simpan log ke DB.
        Gunakan method ini sebagai entry point utama untuk kirim notifikasi.
        """
        # Simpan log ke DB
        notification = TelegramNotification(
            notification_type=notification_type,
            vehicle_id=vehicle_id,
            report_id=report_id,
            message=message,
            is_sent=False
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # Kirim ke SEMUA SUBSCRIBER
        result = await self.send_to_all_subscribers(db, message)
        
        # Update status kirim
        notification.is_sent = result.success_count > 0
        if result.success_count > 0:
            notification.sent_at = datetime.utcnow()
        
        if result.failed_count > 0:
            notification.error_message = f"Gagal kirim ke {result.failed_count} dari {result.total_subscribers} subscriber"
        
        db.commit()
        
        logger.info(f"Notification broadcast: {result.success_count}/{result.total_subscribers} successful")
        return notification

    async def close(self):
        """Close httpx client gracefully"""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.info("Telegram client closed")


# Global singleton instance
telegram_service = TelegramService()
