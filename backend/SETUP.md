# 🎯 Setup PostgreSQL & Testing Backend - Step by Step

## ⚠️ PENTING: PostgreSQL harus running terlebih dahulu!

### Option 1: Install PostgreSQL (Jika belum punya)

1. **Download PostgreSQL**
   - Kunjungi: https://www.postgresql.org/download/windows/
   - Download installer (recommended: PostgreSQL 15 atau 16)
   - Install dengan default settings
   - **INGAT PASSWORD untuk user postgres!**

2. **Setelah Install**
   - PostgreSQL akan otomatis running
   - PgAdmin4 akan terinstall otomatis
   - Port default: 5432

### Option 2: Start PostgreSQL (Jika sudah install)

#### Cek apakah PostgreSQL running:

```powershell
Get-Service -Name postgresql*
```

Jika status: **Stopped**, start dengan:

```powershell
# Start PostgreSQL service
Start-Service -Name "postgresql-x64-15"  # atau versi Anda
```

Atau cari di **Services** (Windows+R → services.msc):
- Cari service bernama: **postgresql-x64-15** (atau versi lain)
- Klik kanan → **Start**

---

## 📋 Step-by-Step Setup & Testing

### Step 1: Buka PgAdmin4

1. Buka **PgAdmin4** dari Start Menu
2. Masukkan **Master Password** (yang dibuat saat install)
3. Expand: **Servers** → **PostgreSQL 15** (atau versi Anda)
4. Masukkan password untuk user **postgres**

### Step 2: Buat Database

1. Klik kanan pada **Databases** → **Create** → **Database**
2. **Database name**: `prm_imm`
3. **Owner**: postgres
4. Klik **Save**

### Step 3: Update File .env

Buka file `D:\PRM-IMM\backend\.env` dan update:

```env
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/prm_imm
```

Ganti `PASSWORD_ANDA` dengan password PostgreSQL Anda!

Contoh:
```env
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/prm_imm
```

### Step 4: Push Database Schema

Buka PowerShell di folder backend:

```powershell
cd D:\PRM-IMM\backend
npx tsx src/db/push.ts
```

**Output yang benar:**
```
🔄 Pushing database schema...
✅ Database schema pushed successfully!
```

**Jika error "ECONNREFUSED":**
- PostgreSQL belum running → Start service
- Password salah di .env → Cek password
- Database belum dibuat → Buat di PgAdmin4

### Step 5: Verifikasi Tables di PgAdmin4

1. Di PgAdmin4, expand:
   - **Databases** → **prm_imm** → **Schemas** → **public** → **Tables**

2. Anda harus melihat 7 tables:
   - ✅ users
   - ✅ departments
   - ✅ rooms
   - ✅ facilities
   - ✅ room_facilities
   - ✅ meeting_requests
   - ✅ meeting_request_history

### Step 6: Run Backend Server

```powershell
cd D:\PRM-IMM\backend
npx tsx watch src/index.ts
```

**Output:**
```
🚀 Server is running on port 3000
📚 Swagger UI: http://localhost:3000/swagger
📖 OpenAPI Spec: http://localhost:3000/api/openapi.json
```

**Biarkan terminal ini tetap buka!**

---

## 🧪 Testing API

### Test 1: Health Check

Buka browser: **http://localhost:3000**

Expected response:
```json
{
  "message": "PRM-IMM Backend API",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-02-03T..."
}
```

### Test 2: Swagger UI (RECOMMENDED!)

Buka: **http://localhost:3000/swagger**

Di Swagger UI Anda bisa:
- ✅ Lihat semua endpoint
- ✅ Test langsung dari browser
- ✅ Lihat request/response schema
- ✅ Tidak perlu PowerShell command!

### Test 3: Register User (PowerShell)

Buka PowerShell baru (jangan close yang run server):

```powershell
# Register admin user
$body = @{
    username = "admin"
    email = "admin@prm-imm.com"
    password = "admin123"
    fullName = "Admin User"
    whatsapp = "6281234567890"
    department = "IT Department"
    role = "admin"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"

# Lihat response
$response | ConvertTo-Json -Depth 5
```

**Expected output:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@prm-imm.com",
      "fullName": "Admin User",
      "whatsapp": "6281234567890",
      "department": "IT Department",
      "role": "admin"
    }
  }
}
```

### Test 4: Login

```powershell
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

# Save token untuk request selanjutnya
$token = $loginResponse.data.token
Write-Host "Login Success! Token: $token"
```

### Test 5: Create Department

```powershell
$deptBody = @{
    name = "IT Department"
    description = "Information Technology Department"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/departments" -Method POST -Body $deptBody -ContentType "application/json"
```

### Test 6: Create Room

```powershell
$roomBody = @{
    name = "Meeting Room A"
    capacity = 20
    location = "Lantai 3, Gedung Utama"
    description = "Ruang meeting besar dengan proyektor dan AC"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" -Method POST -Body $roomBody -ContentType "application/json"
```

### Test 7: Create Facility

```powershell
$facilityBody = @{
    name = "Projector"
    description = "LCD Projector Full HD 1080p"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/facilities" -Method POST -Body $facilityBody -ContentType "application/json"
```

### Test 8: Create Meeting Request

```powershell
$meetingBody = @{
    userId = 1
    nama = "Admin User"
    whatsapp = "6281234567890"
    department = "IT Department"
    tanggal = "2026-02-15"
    hari = "Sabtu"
    jamMulai = "09:00"
    jamBerakhir = "11:00"
    jumlahPeserta = 15
    agenda = "Team Planning & Strategy Meeting Q1 2026"
    namaRuangan = "Meeting Room A"
    fasilitas = "Projector, Whiteboard, Video Conference, Audio System"
} | ConvertTo-Json

$meeting = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method POST -Body $meetingBody -ContentType "application/json"

# Simpan meeting ID
$meetingId = $meeting.data.id
Write-Host "Meeting Request Created! ID: $meetingId, Request ID: $($meeting.data.requestId)"
```

### Test 9: Get All Meeting Requests

```powershell
$allMeetings = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method GET
$allMeetings.data | ConvertTo-Json -Depth 10
```

### Test 10: Approve Meeting Request (Head GA)

```powershell
$approveGA = @{
    type = "approveGA"
    notes = "Approved by GA Department. All requirements met."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/$meetingId/approval" -Method PATCH -Body $approveGA -ContentType "application/json"
```

### Test 11: Approve Meeting Request (Head OS)

```powershell
$approveOS = @{
    type = "approveOS"
    notes = "Approved by OS Department. Facilities are available."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/$meetingId/approval" -Method PATCH -Body $approveOS -ContentType "application/json"
```

### Test 12: View Final Result

```powershell
$finalResult = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method GET
$finalResult.data | Where-Object {$_.id -eq $meetingId} | ConvertTo-Json -Depth 10
```

---

## 📊 View Data di PgAdmin4

1. **View Users Table**
   - Klik kanan pada table **users** → **View/Edit Data** → **All Rows**
   - Anda akan lihat user yang dibuat

2. **View Meeting Requests**
   - Klik kanan pada **meeting_requests** → **View/Edit Data** → **All Rows**
   - Lihat status headGA dan headOS

3. **View History**
   - Klik kanan pada **meeting_request_history** → **View/Edit Data** → **All Rows**
   - Lihat semua approval history dengan timestamp

---

## 🔄 Complete Testing Script (All in One)

Simpan sebagai `test-backend.ps1`:

```powershell
# Complete Backend Testing Script
Write-Host "=== PRM-IMM Backend Testing ===" -ForegroundColor Cyan

# 1. Register Admin
Write-Host "`n1. Registering admin user..." -ForegroundColor Yellow
$adminBody = @{
    username = "admin"
    email = "admin@prm-imm.com"
    password = "admin123"
    fullName = "Admin User"
    whatsapp = "6281234567890"
    department = "IT Department"
    role = "admin"
} | ConvertTo-Json

$admin = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $adminBody -ContentType "application/json"
Write-Host "✅ Admin registered: $($admin.data.user.username)" -ForegroundColor Green

# 2. Create Department
Write-Host "`n2. Creating department..." -ForegroundColor Yellow
$deptBody = @{ name = "IT Department"; description = "Technology Department" } | ConvertTo-Json
$dept = Invoke-RestMethod -Uri "http://localhost:3000/api/departments" -Method POST -Body $deptBody -ContentType "application/json"
Write-Host "✅ Department created: $($dept.data.name)" -ForegroundColor Green

# 3. Create Room
Write-Host "`n3. Creating meeting room..." -ForegroundColor Yellow
$roomBody = @{ name = "Meeting Room A"; capacity = 20; location = "Lantai 3" } | ConvertTo-Json
$room = Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" -Method POST -Body $roomBody -ContentType "application/json"
Write-Host "✅ Room created: $($room.data.name)" -ForegroundColor Green

# 4. Create Meeting Request
Write-Host "`n4. Creating meeting request..." -ForegroundColor Yellow
$meetingBody = @{
    userId = $admin.data.user.id
    nama = "Admin User"
    whatsapp = "6281234567890"
    department = "IT Department"
    tanggal = "2026-02-15"
    hari = "Sabtu"
    jamMulai = "09:00"
    jamBerakhir = "11:00"
    jumlahPeserta = 15
    agenda = "Team Meeting"
    namaRuangan = "Meeting Room A"
    fasilitas = "Projector, Whiteboard"
} | ConvertTo-Json

$meeting = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method POST -Body $meetingBody -ContentType "application/json"
Write-Host "✅ Meeting created: $($meeting.data.requestId)" -ForegroundColor Green

# 5. Approve by Head GA
Write-Host "`n5. Approving by Head GA..." -ForegroundColor Yellow
$approveGA = @{ type = "approveGA"; notes = "Approved" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/$($meeting.data.id)/approval" -Method PATCH -Body $approveGA -ContentType "application/json" | Out-Null
Write-Host "✅ Approved by Head GA" -ForegroundColor Green

# 6. Approve by Head OS
Write-Host "`n6. Approving by Head OS..." -ForegroundColor Yellow
$approveOS = @{ type = "approveOS"; notes = "Approved" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests/$($meeting.data.id)/approval" -Method PATCH -Body $approveOS -ContentType "application/json" | Out-Null
Write-Host "✅ Approved by Head OS" -ForegroundColor Green

# 7. Get Final Result
Write-Host "`n7. Fetching final result..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/meeting-requests" -Method GET
$finalMeeting = $result.data | Where-Object {$_.id -eq $meeting.data.id}

Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
Write-Host "Request ID: $($finalMeeting.requestId)" -ForegroundColor White
Write-Host "Nama: $($finalMeeting.nama)" -ForegroundColor White
Write-Host "WhatsApp: wa.me/$($finalMeeting.whatsapp)" -ForegroundColor White
Write-Host "Agenda: $($finalMeeting.agenda)" -ForegroundColor White
Write-Host "Head GA Status: $($finalMeeting.headGA)" -ForegroundColor Green
Write-Host "Head OS Status: $($finalMeeting.headOS)" -ForegroundColor Green
Write-Host "History Count: $($finalMeeting.history.Count)" -ForegroundColor White

Write-Host "`n✅ All tests passed!" -ForegroundColor Green
```

Run dengan:
```powershell
.\test-backend.ps1
```

---

## 🐛 Troubleshooting

### Error: ECONNREFUSED

**Problem**: PostgreSQL tidak running

**Solution**:
```powershell
# Cek service
Get-Service -Name postgresql*

# Start service
Start-Service -Name "postgresql-x64-15"
```

### Error: password authentication failed

**Problem**: Password salah di .env

**Solution**:
1. Buka PgAdmin4
2. Test koneksi dengan password Anda
3. Update DATABASE_URL di .env dengan password yang benar

### Error: database "prm_imm" does not exist

**Problem**: Database belum dibuat

**Solution**:
1. Buka PgAdmin4
2. Create database: **prm_imm**
3. Run `npx tsx src/db/push.ts` lagi

### Error: Port 3000 already in use

**Solution**:
```powershell
# Kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Atau ubah port di .env
# PORT=3001
```

---

## ✅ Checklist Setup

- [ ] PostgreSQL installed & running
- [ ] PgAdmin4 opened successfully
- [ ] Database **prm_imm** created
- [ ] File **.env** updated with correct password
- [ ] `npx tsx src/db/push.ts` executed successfully
- [ ] All 7 tables visible in PgAdmin4
- [ ] Backend server running on port 3000
- [ ] http://localhost:3000 shows API info
- [ ] http://localhost:3000/swagger shows Swagger UI
- [ ] User registered successfully
- [ ] Meeting request created successfully
- [ ] Approval workflow works

Selamat! Backend Anda sudah siap! 🎉
