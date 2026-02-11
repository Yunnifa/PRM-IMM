# 📱 Telegram Multi-User Integration Package

Paket integrasi Telegram multi-user untuk project FastAPI + SQLAlchemy + PostgreSQL.
User bisa subscribe/unsubscribe langsung via bot, dan semua notifikasi di-broadcast ke semua subscriber aktif.

---

## 📁 Struktur Folder

```
telegram-integration-package/
├── PANDUAN_INTEGRASI.md          ← File ini (panduan lengkap)
├── models/
│   ├── telegram_subscriber.py    ← Model DB: daftar subscriber
│   └── notification.py           ← Model DB: log notifikasi (audit trail)
├── schemas/
│   └── telegram.py               ← Pydantic schemas (request/response)
├── services/
│   └── telegram_service.py       ← Core service: broadcast, retry, send
├── routers/
│   └── telegram.py               ← FastAPI endpoints (webhook, CRUD, broadcast)
├── scripts/
│   ├── get_chat_id.py            ← Tool: cari Chat ID user
│   ├── add_subscriber_direct.py  ← Tool: tambah subscriber via DB langsung
│   ├── create_telegram_table.py  ← Tool: buat tabel manual (tanpa Alembic)
│   └── setup_multiuser.py        ← Tool: setup lengkap (webhook + subscriber + test)
└── migration/
    └── create_telegram_subscribers.sql  ← SQL migration manual
```

---

## 🔧 Prasyarat

### Dependencies (pip)
```bash
pip install httpx fastapi sqlalchemy pydantic
```

### Environment Variables
Tambahkan ke `.env` atau environment server Anda:
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

- `TELEGRAM_BOT_TOKEN` — Token bot dari @BotFather **(WAJIB)**
- `TELEGRAM_CHAT_ID` — Chat ID default sebagai fallback jika belum ada subscriber **(opsional)**

### Config (app/config.py)
Pastikan settings Anda punya field:
```python
class Settings(BaseSettings):
    # ... field lainnya ...
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
```

---

## 🚀 Langkah Integrasi ke Project Baru

### STEP 1: Copy File ke Project

Copy folder-folder ke dalam struktur project Anda:

```
your-project/
├── app/
│   ├── models/
│   │   ├── telegram_subscriber.py   ← COPY dari models/
│   │   └── notification.py          ← COPY dari models/
│   ├── schemas/
│   │   └── telegram.py              ← COPY dari schemas/
│   ├── services/
│   │   └── telegram_service.py      ← COPY dari services/
│   ├── routers/
│   │   └── telegram.py              ← COPY dari routers/
│   ├── config.py                    ← Tambahkan env vars
│   ├── database.py                  ← Harus punya Base & SessionLocal/get_db
│   └── main.py                      ← Register router di sini
├── scripts/
│   ├── get_chat_id.py               ← COPY dari scripts/
│   └── ...
└── requirements.txt
```

### STEP 2: Sesuaikan Import Path

Edit import di setiap file sesuai struktur project Anda. Contoh:
```python
# Jika project Anda pakai "src" folder:
from src.database import Base          # bukan from app.database import Base  
from src.config import settings        # bukan from app.config import settings
```

### STEP 3: Sesuaikan Model notification.py

File `models/notification.py` punya ForeignKey ke tabel `vehicles` dan `p2h_reports`.
**Sesuaikan atau hapus** ForeignKey ini dengan tabel di project Anda:

```python
# SEBELUM (spesifik P2H project):
vehicle_id = Column(UUID, ForeignKey("vehicles.id"), nullable=True)
report_id = Column(UUID, ForeignKey("p2h_reports.id"), nullable=True)

# SESUDAH (generic, tanpa FK):
entity_id = Column(UUID, nullable=True)      # ID entitas terkait
reference_id = Column(UUID, nullable=True)    # ID referensi tambahan
```

Juga sesuaikan `NotificationType` enum:
```python
class NotificationType(str, enum.Enum):
    # Sesuaikan dengan kebutuhan project Anda
    ALERT_CRITICAL = "alert_critical"
    ALERT_WARNING = "alert_warning"
    REMINDER = "reminder"
    INFO = "info"
```

### STEP 4: Sesuaikan Router (Auth)

File `routers/telegram.py` menggunakan `require_admin` dan model `User` untuk proteksi endpoint admin.
Sesuaikan dengan auth system project Anda:

```python
# SEBELUM:
from app.dependencies import require_admin
from app.models.user import User

# SESUDAH (contoh jika pakai dependency berbeda):
from app.auth import get_current_admin_user
from app.models import User
```

Atau jika belum ada auth, hapus sementara:
```python
# Hapus parameter ini dari setiap endpoint admin:
current_user: User = Depends(require_admin)
```

### STEP 5: Buat Tabel Database

**Opsi A — Via SQL langsung:**
```bash
psql -d your_database -f migration/create_telegram_subscribers.sql
```

**Opsi B — Via script Python:**
```bash
cd your-project
python scripts/create_telegram_table.py
```

**Opsi C — Via Alembic migration:**
```bash
alembic revision --autogenerate -m "create telegram tables"
alembic upgrade head
```

### STEP 6: Register Router di main.py

```python
from app.routers import telegram

app = FastAPI()
# ... router lainnya ...
app.include_router(telegram.router, prefix="/api", tags=["Telegram"])
```

### STEP 7: (Opsional) Auto-create tabel saat startup

Tambahkan di `main.py` agar tabel otomatis dibuat:
```python
@app.on_event("startup")
async def startup():
    from sqlalchemy import inspect, text
    from app.database import engine
    
    with engine.connect() as conn:
        inspector = inspect(conn)
        if 'telegram_subscribers' not in inspector.get_table_names():
            # Buat tabel (gunakan SQL dari migration/)
            conn.execute(text("""
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
            """))
            conn.commit()
```

---

## 📱 Setup Bot Telegram

### 1. Buat Bot di @BotFather

1. Buka Telegram → cari **@BotFather**
2. Kirim `/newbot`
3. Beri nama bot (contoh: `My Project Alert Bot`)
4. Beri username (contoh: `myproject_alert_bot`)
5. **Simpan Bot Token** yang diberikan (format: `1234567890:ABCdef...`)

### 2. Dapatkan Chat ID

**Cara termudah:**
1. Buka **@userinfobot** di Telegram
2. Kirim pesan apa saja
3. Bot akan balas dengan Chat ID Anda

**Cara via script:**
```bash
python scripts/get_chat_id.py YOUR_BOT_TOKEN
# Lalu kirim pesan ke bot, Chat ID akan muncul
```

### 3. Set Environment Variables

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### 4. Setup Webhook

Setelah backend sudah di-deploy, set webhook agar bot bisa menerima command:

**Via API:**
```bash
curl -X POST "https://your-backend.com/api/telegram/setup-webhook?webhook_url=https://your-backend.com/api/telegram/webhook" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Via script:**
```bash
python scripts/setup_multiuser.py
```

**Via Telegram API langsung:**
```bash
curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://your-backend.com/api/telegram/webhook"
```

### 5. Test

Kirim `/start` ke bot Anda di Telegram. Bot harus membalas pesan selamat datang.

---

## 📋 API Endpoints

Semua endpoint di-mount di prefix `/api/telegram`:

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| `POST` | `/webhook` | Public | Menerima update dari Telegram (webhook) |
| `GET` | `/subscribers` | Admin | List semua subscriber |
| `POST` | `/subscribers` | Admin | Tambah subscriber manual |
| `PATCH` | `/subscribers/{chat_id}` | Admin | Update subscriber |
| `DELETE` | `/subscribers/{chat_id}` | Admin | Hapus subscriber |
| `POST` | `/broadcast` | Admin | Broadcast pesan ke semua subscriber |
| `POST` | `/test-notification` | Admin | Kirim test notification |
| `GET` | `/bot-info` | Admin | Info bot Telegram |
| `POST` | `/setup-webhook` | Admin | Set webhook URL |

### Contoh Request

**Tambah subscriber:**
```bash
curl -X POST "https://your-backend.com/api/telegram/subscribers" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "123456789", "full_name": "John Doe"}'
```

**Broadcast pesan:**
```bash
curl -X POST "https://your-backend.com/api/telegram/broadcast" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "<b>Pengumuman!</b>\nIni pesan broadcast ke semua subscriber."}'
```

---

## 🔔 Cara Kirim Notifikasi dari Kode

### Cara 1: Broadcast sederhana
```python
from app.services.telegram_service import telegram_service

# Di dalam async function:
result = await telegram_service.broadcast_message(db, "Pesan HTML <b>bold</b>")
print(f"Terkirim: {result.success_count}/{result.total_subscribers}")
```

### Cara 2: Dengan logging ke DB (audit trail)
```python
from app.services.telegram_service import telegram_service
from app.models.notification import NotificationType

notification = await telegram_service.send_notification(
    db=db,
    notification_type=NotificationType.ALERT_WARNING,
    message="<b>⚠️ WARNING</b>\nAda masalah pada sistem!",
    vehicle_id=some_uuid,  # opsional
    report_id=some_uuid    # opsional
)
```

### Cara 3: Kirim ke satu user saja
```python
await telegram_service.send_message_to_chat("123456789", "Pesan pribadi")
```

---

## 🤖 Bot Commands

User bisa kirim command berikut ke bot:

| Command | Fungsi |
|---------|--------|
| `/start` | Subscribe / mulai berlangganan notifikasi |
| `/stop` | Unsubscribe / berhenti berlangganan |
| `/status` | Cek status langganan |
| `/help` | Tampilkan bantuan |

---

## 🔄 Alur Kerja

```
User kirim /start ke Bot
        ↓
Webhook endpoint menerima update
        ↓
handle_subscribe() → simpan ke DB (telegram_subscribers)
        ↓
Bot reply "Pendaftaran Berhasil!"

======================================

Sistem ada event (misal: alert/warning)
        ↓
Panggil telegram_service.send_notification() atau broadcast_message()
        ↓
Service query semua subscriber aktif dari DB
        ↓
Kirim pesan ke setiap subscriber (dengan retry)
        ↓
Simpan log ke telegram_notifications (audit trail)
```

---

## ⚠️ Yang Perlu Disesuaikan

| File | Yang perlu diedit |
|------|-------------------|
| `models/notification.py` | ForeignKey, relationship, NotificationType enum |
| `routers/telegram.py` | Import auth (`require_admin`, `User`), pesan bot |
| `services/telegram_service.py` | Import model-model yang spesifik project Anda |
| `scripts/*.py` | `sys.path` dan import sesuai struktur project |
| Config / `.env` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

---

## 🛡️ Tips Production

1. **Rate Limiting** — Telegram limit 30 pesan/detik. Service sudah ada delay 0.1s antar pesan.
2. **Retry** — Sudah ada retry 3x dengan exponential backoff (1s, 2s, 4s).
3. **Connection Pooling** — Menggunakan shared `httpx.AsyncClient` agar koneksi di-reuse.
4. **Fallback** — Jika tidak ada subscriber di DB, otomatis fallback ke `TELEGRAM_CHAT_ID` env var.
5. **Graceful Shutdown** — Panggil `await telegram_service.close()` saat app shutdown.
6. **Blocked Users** — Jika user block bot (HTTP 403), pesan di-skip tanpa crash.

---

## 📞 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespon `/start` | Cek webhook sudah di-set. Cek token benar. |
| Notifikasi tidak terkirim | Cek ada subscriber aktif di DB. Cek log server. |
| Timeout error | Naikkan timeout di `telegram_service.py` (default 30s). |
| `403 Forbidden` | User mem-block bot. Subscriber akan di-skip. |
| Tabel tidak ada | Jalankan `scripts/create_telegram_table.py` atau SQL migration. |
| Webhook error | Pastikan URL backend HTTPS dan bisa diakses publik. |
