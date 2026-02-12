# Railway Deployment Guide

## ⚠️ PENTING: Database Connection Issue

Jika mengalami error `CONNECT_TIMEOUT postgres.railway.internal:5432`, artinya Railway Private Network belum terkonfigurasi dengan benar.

## Solusi: Gunakan DATABASE_PUBLIC_URL

### Langkah 1: Buka Railway Dashboard
1. Buka project Railway Anda
2. Klik service **PostgreSQL**

### Langkah 2: Copy Public Connection URL
1. Klik tab **"Connect"**
2. Copy **"Postgres Connection URL"** (PUBLIC URL)
   - Format: `postgresql://postgres:password@xxxxx.railway.app:5432/railway`
   - **BUKAN** yang `postgres.railway.internal`

### Langkah 3: Update Environment Variable di Backend Service
1. Klik service **Backend** (bukan PostgreSQL)
2. Klik tab **"Variables"**
3. **HAPUS** variable reference `${{Postgres.DATABASE_URL}}` jika ada
4. Buat/update variable baru:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste connection URL public dari step 2
   - Contoh: `postgresql://postgres:xxxxx@monorail.proxy.rlwy.net:12345/railway`

### Langkah 4: Redeploy
1. Klik tab **"Deployments"**
2. Klik **"Redeploy"** atau trigger deployment baru
3. Monitor logs - seharusnya tidak ada CONNECT_TIMEOUT lagi

## Verifikasi Connection String

Cek di deployment logs, seharusnya muncul:
```
✅ Using Railway Public URL
```

Bukan:
```
⚠️ Using Railway Private Network
```

## Alternative: Enable Private Networking (Advanced)

Jika ingin pakai Private Network (`postgres.railway.internal`):

1. **Enable Private Network di kedua services:**
   - PostgreSQL service → Settings → Networking → Enable Private Network
   - Backend service → Settings → Networking → Enable Private Network

2. **Gunakan variable reference:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_PRIVATE_URL}}
   ```

3. **Pastikan kedua service di region yang sama**

⚠️ **Note**: Private networking kadang unstable untuk free tier Railway.

## Environment Variables Lainnya

Pastikan backend service memiliki semua variable ini:

```env
# Database
DATABASE_URL=postgresql://postgres:xxxxx@xxxxx.railway.app:5432/railway

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=your-bot-token

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend.railway.app
```

## Troubleshooting

### Error: "CONNECT_TIMEOUT"
- ❌ Pakai Private URL tapi private networking tidak enabled
- ✅ Ganti ke Public URL

### Error: "password authentication failed"
- ❌ Password salah di connection string
- ✅ Copy ulang connection URL dari Railway dashboard

### Error: "connection refused"
- ❌ Database service belum running
- ✅ Cek PostgreSQL service status

### Login timeout 30 detik
- ❌ Database tidak bisa diakses
- ✅ Ikuti step 1-4 di atas untuk fix DATABASE_URL

## Health Check

Setelah deployment berhasil, cek:
1. **Health endpoint**: `https://your-backend.railway.app/`
2. **Swagger docs**: `https://your-backend.railway.app/swagger`

Response health endpoint:
```json
{
  "message": "PRM-IMM Backend API",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-02-12T00:00:00.000Z"
}
```
