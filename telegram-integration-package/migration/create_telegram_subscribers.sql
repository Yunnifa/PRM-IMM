-- =============================================
-- Migration: Create telegram_subscribers table
-- =============================================
-- Jalankan SQL ini di database PostgreSQL Anda
-- atau buat Alembic migration yang sesuai.

CREATE TABLE IF NOT EXISTS telegram_subscribers (
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

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS ix_telegram_subscribers_chat_id 
    ON telegram_subscribers (chat_id);
CREATE INDEX IF NOT EXISTS ix_telegram_subscribers_is_active 
    ON telegram_subscribers (is_active);


-- =============================================
-- Migration: Create telegram_notifications table
-- =============================================
-- Tabel ini untuk audit log notifikasi yang dikirim

-- Buat enum type terlebih dahulu (sesuaikan dengan kebutuhan)
DO $$ BEGIN
    CREATE TYPE notificationtype AS ENUM (
        'p2h_abnormal', 
        'p2h_warning', 
        'stnk_expiry', 
        'kir_expiry'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS telegram_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type notificationtype NOT NULL,
    vehicle_id UUID,           -- FK ke tabel terkait (sesuaikan)
    report_id UUID,            -- FK ke tabel terkait (sesuaikan)
    message TEXT NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_telegram_notifications_type 
    ON telegram_notifications (notification_type);
CREATE INDEX IF NOT EXISTS ix_telegram_notifications_vehicle 
    ON telegram_notifications (vehicle_id);
