# 🚀 Quick Start Guide - Backend Testing

## Step 1: Setup PostgreSQL Database

### Menggunakan PgAdmin4:

1. Buka **PgAdmin4**
2. Klik kanan pada **Databases** → **Create** → **Database**
3. Database name: `prm_imm`
4. Klik **Save**

### Atau menggunakan psql command:

```bash
psql -U postgres
CREATE DATABASE prm_imm;
\q
```

## Step 2: Update .env File

Edit file `.env` dan sesuaikan DATABASE_URL dengan kredensial PostgreSQL Anda:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/prm_imm
```

Contoh:
```env
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/prm_imm
```

## Step 3: Push Database Schema

Jalankan perintah ini untuk membuat semua tabel:

```bash
npm run db:push
```

Atau:

```bash
npx tsx src/db/push.ts
```

Output yang benar:
```
🔄 Pushing database schema...
✅ Database schema pushed successfully!
```

## Step 4: Run Backend Server

```bash
npm run dev
```

Output:
```
🚀 Server is running on port 3000
📚 Swagger UI: http://localhost:3000/swagger
📖 OpenAPI Spec: http://localhost:3000/api/openapi.json
```

## Step 5: Test API

### 1. Health Check

Buka browser: http://localhost:3000

Response:
```json
{
  "message": "PRM-IMM Backend API",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-02-03T..."
}
```

### 2. Swagger UI

Buka: http://localhost:3000/swagger

Di sini Anda bisa test semua endpoint dengan UI yang interaktif!

### 3. Test Register (PowerShell)

```powershell
# Register user baru
$body = @{
    username = "admin"
    email = "admin@prm-imm.com"
    password = "admin123"
    fullName = "Admin User"
    whatsapp = "6281234567890"
    department = "IT Department"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

### 4. Test Login (PowerShell)

```powershell
# Login
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

# Save token
$token = $response.data.token
Write-Host "Token: $token"
```

### 5. Create Meeting Request (PowerShell)

```powershell
# Buat meeting request
$meetingBody = @{
    userId = 1
    nama = "John Doe"
    whatsapp = "6281234567890"
    department = "IT Department"
    tanggal = "2026-02-10"
    hari = "Senin"
    jamMulai = "09:00"
    jamBerakhir = "11:00"
    jumlahPeserta = 10
    agenda = "Team Planning Meeting"
    namaRuangan = "Meeting Room A"
    fasilitas = "Projector, Whiteboard, Video Conference"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method POST -Body $meetingBody -ContentType "application/json"
```

### 6. Get All Meeting Requests

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method GET
```

### 7. Approve/Reject Meeting Request

```powershell
# Approve by Head GA
$approvalBody = @{
    type = "approveGA"
    notes = "Approved for team meeting"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/1/approval" -Method PATCH -Body $approvalBody -ContentType "application/json"
```

### 8. Create Department

```powershell
$deptBody = @{
    name = "IT Department"
    description = "Information Technology Department"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/departments" -Method POST -Body $deptBody -ContentType "application/json"
```

### 9. Create Room

```powershell
$roomBody = @{
    name = "Meeting Room A"
    capacity = 20
    location = "Lantai 3"
    description = "Ruang meeting besar dengan proyektor"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" -Method POST -Body $roomBody -ContentType "application/json"
```

### 10. Create Facility

```powershell
$facilityBody = @{
    name = "Projector"
    description = "LCD Projector Full HD"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/facilities" -Method POST -Body $facilityBody -ContentType "application/json"
```

## Step 6: View Database di PgAdmin4

1. Buka **PgAdmin4**
2. Expand: **Servers** → **PostgreSQL** → **Databases** → **prm_imm** → **Schemas** → **public** → **Tables**
3. Klik kanan pada table (misal: **users**) → **View/Edit Data** → **All Rows**

## Step 7: Menggunakan Drizzle Studio (Optional)

Untuk GUI yang lebih modern:

```bash
npm run db:studio
```

Buka: https://local.drizzle.studio

## Testing Workflow Lengkap

### Scenario: User request meeting → Approve by Head GA → Approve by Head OS

```powershell
# 1. Register user biasa
$userBody = @{
    username = "john"
    email = "john@prm-imm.com"
    password = "john123"
    fullName = "John Doe"
    whatsapp = "6281234567890"
    department = "IT Department"
    role = "user"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $userBody -ContentType "application/json"

# 2. User membuat meeting request
$meetingBody = @{
    userId = $user.data.id
    nama = "John Doe"
    whatsapp = "6281234567890"
    department = "IT Department"
    tanggal = "2026-02-15"
    hari = "Sabtu"
    jamMulai = "10:00"
    jamBerakhir = "12:00"
    jumlahPeserta = 15
    agenda = "Product Launch Discussion"
    namaRuangan = "Meeting Room A"
    fasilitas = "Projector, Audio System, Whiteboard"
} | ConvertTo-Json

$meeting = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method POST -Body $meetingBody -ContentType "application/json"

Write-Host "Meeting Request Created: $($meeting.data.requestId)"

# 3. Head GA approve
$approveGA = @{
    type = "approveGA"
    notes = "Meeting approved by GA department"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/$($meeting.data.id)/approval" -Method PATCH -Body $approveGA -ContentType "application/json"

# 4. Head OS approve
$approveOS = @{
    type = "approveOS"
    notes = "All facilities available"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/$($meeting.data.id)/approval" -Method PATCH -Body $approveOS -ContentType "application/json"

# 5. Cek hasil
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method GET
$result.data | ConvertTo-Json -Depth 10
```

## Troubleshooting

### Error: Cannot connect to database

**Solusi**:
1. Pastikan PostgreSQL running (cek di Services)
2. Test koneksi di PgAdmin4
3. Cek DATABASE_URL di .env

### Error: relation "users" does not exist

**Solusi**:
```bash
npm run db:push
```

### Error: Port 3000 already in use

**Solusi**:
```bash
# Cari process yang pakai port 3000
netstat -ano | findstr :3000

# Kill process (ganti PID dengan hasil dari command atas)
taskkill /PID <PID> /F

# Atau ubah PORT di .env
PORT=3001
```

### View Logs

Backend akan menampilkan semua request di console:
```
GET /api/users 200 - 23ms
POST /api/meeting-requests 201 - 45ms
```

## Next: Connect Frontend to Backend

1. Update frontend untuk fetch dari `http://localhost:3000/api`
2. Tambahkan axios atau fetch di frontend
3. Simpan token di localStorage
4. Tambahkan authorization header

## Production Deployment ke Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Add PostgreSQL
# Di Railway dashboard → Add PostgreSQL

# Set environment variables
railway variables set JWT_SECRET="your-secret"

# Deploy
railway up

# Push schema
railway run npm run db:push
```

Selamat mencoba! 🎉
