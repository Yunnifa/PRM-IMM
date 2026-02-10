# 🚀 Panduan Menjalankan Aplikasi PRM-IMM

Dokumentasi ini berisi cara menjalankan **Frontend** dan **Backend** dari aplikasi PRM-IMM (Meeting Room Management System).

---

## 📋 Prasyarat

Pastikan Anda sudah menginstall:

- **Node.js** v18+ (Download: https://nodejs.org/)
- **PostgreSQL** v15+ (Download: https://www.postgresql.org/download/)
- **npm** atau **yarn** (sudah termasuk di Node.js)

---

## 🗄️ Setup Database (PostgreSQL)

### 1. Pastikan PostgreSQL Running

```powershell
# Cek status PostgreSQL
Get-Service -Name postgresql*

# Jika Stopped, start dengan:
Start-Service -Name "postgresql-x64-15"
```

### 2. Buat Database

Buka **PgAdmin4** dan buat database baru:
- **Database name**: `prm_imm`
- **Owner**: postgres

Atau via SQL:
```sql
CREATE DATABASE prm_imm;
```

### 3. Konfigurasi Environment

Buat file `.env` di folder `backend/`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/prm_imm
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
```

> ⚠️ Ganti `PASSWORD_ANDA` dengan password PostgreSQL Anda!

---

## ⚙️ Backend

### Lokasi: `D:\PRM-IMM\backend`

### Langkah-langkah:

#### 1. Install Dependencies

```powershell
cd D:\PRM-IMM\backend
npm install
```

#### 2. Push Database Schema

```powershell
npm run db:push
```

Atau:
```powershell
npx tsx src/db/push.ts
```

#### 3. Jalankan Development Server

**Menggunakan npm:**
```powershell
npm run dev
```

**Atau menggunakan npx (langsung):**
```powershell
npx tsx watch src/index.ts
```

✅ Backend akan berjalan di: **http://localhost:3000**

### Script Backend yang Tersedia:

| Script | Perintah | NPX Equivalent | Deskripsi |
|--------|----------|----------------|-----------|
| `dev` | `npm run dev` | `npx tsx watch src/index.ts` | Menjalankan server development dengan hot reload |
| `build` | `npm run build` | `npx tsc` | Build TypeScript ke JavaScript |
| `start` | `npm run start` | `node dist/index.js` | Menjalankan production build |
| `db:push` | `npm run db:push` | `npx tsx src/db/push.ts` | Push schema database ke PostgreSQL |
| `db:studio` | `npm run db:studio` | `npx drizzle-kit studio` | Buka Drizzle Studio untuk melihat database |

---

## 🎨 Frontend

### Lokasi: `D:\PRM-IMM\frontend`

### Langkah-langkah:

#### 1. Install Dependencies

```powershell
cd D:\PRM-IMM\frontend
npm install
```

#### 2. Jalankan Development Server

**Menggunakan npm:**
```powershell
npm run dev
```

**Atau menggunakan npx (langsung):**
```powershell
npx vite
```

✅ Frontend akan berjalan di: **http://localhost:5173**

### Script Frontend yang Tersedia:

| Script | Perintah | NPX Equivalent | Deskripsi |
|--------|----------|----------------|-----------|
| `dev` | `npm run dev` | `npx vite` | Menjalankan Vite dev server dengan hot reload |
| `build` | `npm run build` | `npx tsc && npx vite build` | Build untuk production |
| `preview` | `npm run preview` | `npx vite preview` | Preview hasil build production |
| `lint` | `npm run lint` | `npx eslint . --ext ts,tsx` | Jalankan ESLint untuk cek kode |

---

## 🏃 Quick Start (Menjalankan Keduanya)

Buka **2 terminal terpisah**:

### Terminal 1 - Backend:
```powershell
cd D:\PRM-IMM\backend
npm install
npm run dev
```

**Atau dengan npx:**
```powershell
cd D:\PRM-IMM\backend
npm install
npx tsx watch src/index.ts
```

### Terminal 2 - Frontend:
```powershell
cd D:\PRM-IMM\frontend
npm install
npm run dev
```

**Atau dengan npx:**
```powershell
cd D:\PRM-IMM\frontend
npm install
npx vite
```

---

## 📝 Ringkasan Perintah NPX

| Komponen | Folder | Perintah NPX |
|----------|--------|--------------|
| **Backend Dev** | `backend/` | `npx tsx watch src/index.ts` |
| **Backend DB Push** | `backend/` | `npx tsx src/db/push.ts` |
| **Backend DB Studio** | `backend/` | `npx drizzle-kit studio` |
| **Frontend Dev** | `frontend/` | `npx vite` |
| **Frontend Build** | `frontend/` | `npx vite build` |
| **Frontend Preview** | `frontend/` | `npx vite preview` |

---

## 🌐 Akses Aplikasi

| Layanan | URL | Deskripsi |
|---------|-----|-----------|
| Frontend | http://localhost:5173 | Aplikasi React |
| Backend API | http://localhost:3000 | Hono.js REST API |
| Swagger Docs | http://localhost:3000/swagger | Dokumentasi API |
| Drizzle Studio | https://local.drizzle.studio | Database viewer |

---

## ❗ Troubleshooting

### Error: "ECONNREFUSED"
- ✅ Pastikan PostgreSQL sudah running
- ✅ Cek password di file `.env`
- ✅ Pastikan database `prm_imm` sudah dibuat

### Error: "Module not found"
- ✅ Jalankan `npm install` di folder yang bermasalah

### Port sudah digunakan
- ✅ Ubah PORT di `.env` (backend) atau `vite.config.ts` (frontend)
- ✅ Atau matikan proses yang menggunakan port tersebut:
  ```powershell
  # Cek proses di port 3000
  netstat -ano | findstr :3000
  
  # Kill proses (ganti PID)
  taskkill /PID <PID> /F
  ```

---

## 📁 Struktur Project

```
D:\PRM-IMM\
├── backend/                 # Backend API (Hono.js + PostgreSQL)
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── db/             # Database config & schema
│   │   └── routes/         # API endpoints
│   ├── package.json
│   └── .env                # Environment variables
│
├── frontend/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx         # Main component
│   │   ├── components/     # UI components
│   │   └── services/       # API services
│   └── package.json
│
└── RUNNING_GUIDE.md        # File ini
```

---

## 🛠️ Tech Stack

### Backend:
- **Hono.js** - Web framework
- **PostgreSQL** - Database
- **Drizzle ORM** - Database ORM
- **Zod** - Validation
- **JWT** - Authentication

### Frontend:
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

---

**Happy Coding! 🎉**
