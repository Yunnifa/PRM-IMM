# 📚 Tech Stack & Environment - PRM-IMM

Dokumentasi lengkap mengenai teknologi dan environment yang digunakan pada project **PRM-IMM (Meeting Room Management System)**.

---

## 🏗️ Arsitektur Aplikasi

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React + TypeScript |
| **Backend** | Hono (Node.js Framework) |
| **Database** | PostgreSQL |
| **Notifikasi** | Telegram Bot API |
| **Deployment** | Railway (Nixpacks) |

---

## 🖥️ Frontend Stack

| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| **UI Library** | React | ^18.2.0 |
| **Language** | TypeScript | ^5.2.2 |
| **Build Tool** | Vite | ^5.0.8 |
| **Routing** | React Router DOM | ^7.12.0 |
| **HTTP Client** | Axios | ^1.13.4 |
| **CSS Framework** | Tailwind CSS | ^3.4.0 |
| **CSS Processing** | PostCSS + Autoprefixer | ^8.4.32 |
| **PDF Export** | jsPDF + jspdf-autotable | ^4.1.0 |
| **Excel Export** | xlsx | ^0.18.5 |
| **Linting** | ESLint + TypeScript Plugin | ^8.55.0 |

**Port Development:** `3001`

### Fitur Frontend

- **Responsive Design** — Sidebar toggle untuk mobile, layout adaptif
- **Role-based UI** — Approval buttons tampil sesuai role user (Admin, Head Dept, GA)
- **Export** — Excel, CSV, PDF di semua halaman data
- **Calendar** — Kalender interaktif untuk booking ruangan (publik)
- **Filter & Search** — Filter multi-kriteria di halaman monitoring

---

## ⚙️ Backend Stack

| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| **Framework** | Hono | ^4.6.0 |
| **Runtime** | Node.js | v18+ |
| **Language** | TypeScript | ^5.6.0 |
| **Server Adapter** | @hono/node-server | ^1.13.0 |
| **ORM** | Drizzle ORM | ^0.33.0 |
| **Database Driver** | postgres (pg) | ^3.4.0 |
| **API Documentation** | @hono/swagger-ui + zod-openapi | ^0.4.0 |
| **Validation** | Zod | ^3.23.0 |
| **Authentication** | JWT (jsonwebtoken) | ^9.0.2 |
| **Password Hashing** | bcryptjs | ^2.4.3 |
| **Dev Runner** | tsx | ^4.19.0 |
| **DB Migration** | Drizzle Kit | ^0.24.0 |

**Port Development:** `3000`

---

## 📨 Notifikasi — Telegram Bot

| Item | Detail |
|------|--------|
| **Channel** | Telegram Bot API (HTTPS port 443) |
| **Metode** | Webhook (`/api/telegram/webhook`) |
| **Bot Commands** | `/start`, `/department`, `/status`, `/unlink`, `/help` |
| **Self-Registration** | User mendaftarkan diri via bot dengan inline keyboard |
| **Notifikasi** | Request baru → Head Dept, Setelah HD approve → GA |

### Alur Notifikasi

1. **Request baru dibuat** → Bot kirim notif ke semua Head Dept di department terkait
2. **Head Dept approve** → Bot kirim notif ke semua user GA untuk approval GA
3. User meng-link akun mereka ke Telegram via bot command `/department` → pilih department → pilih nama

### Environment Variables Telegram

```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
```

---

## 🔐 Approval System

| Role | Akses Approval |
|------|---------------|
| **Admin** | Bisa approve di kolom Head Dept & General Affair |
| **Head Dept** | Hanya bisa approve di kolom Head Dept (tidak bisa approve GA) |
| **GA (General Affair)** | Hanya bisa approve di kolom GA, dan **hanya setelah** Head Dept sudah approve |

### Validasi Backend

- Head Dept mencoba approve kolom GA → `403 Forbidden`
- GA mencoba approve sebelum Head Dept approve → `400 Bad Request`
- Validasi dilakukan di route `meetingRequests.ts` menggunakan `HTTPException`

---

## 🗄️ Database

| Item | Detail |
|------|--------|
| **DBMS** | PostgreSQL v15+ |
| **Database Name** | `prm_imm` |
| **ORM** | Drizzle ORM |
| **Schema Location** | `backend/src/db/schema.ts` |
| **Connection** | via `DATABASE_URL` environment variable |

---

## 🌐 Environment Variables

File `.env` di folder `backend/`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/prm_imm
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
```

---

## 🚀 Deployment (Railway)

| Item | Detail |
|------|--------|
| **Platform** | Railway |
| **Builder** | Nixpacks |
| **Domain** | `prm-imm-production.up.railway.app` |
| **Health Check** | Path `/` dengan timeout 100s |
| **Restart Policy** | On Failure (max 3 retries) |
| **Webhook** | Telegram webhook auto-setup via `/api/telegram/setup-webhook` |

---

## 📁 Struktur Project

```
PRM-IMM/
├── backend/                    # Hono API Server
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── db/
│   │   │   ├── index.ts        # Database connection
│   │   │   ├── schema.ts       # Drizzle schema
│   │   │   ├── seed.ts         # Database seeder
│   │   │   ├── syncSchema.ts   # Sync schema to DB
│   │   │   └── push.ts         # Push schema to DB
│   │   ├── middleware/
│   │   │   └── apiLogger.ts    # API logging middleware
│   │   ├── services/
│   │   │   ├── telegramService.ts  # Telegram notification service
│   │   │   └── emailService.ts     # (deprecated, tidak digunakan)
│   │   └── routes/
│   │       ├── auth.ts         # Authentication routes
│   │       ├── departments.ts  # Department management
│   │       ├── emailLogs.ts    # Email log routes
│   │       ├── facilities.ts   # Facility management
│   │       ├── meetingRequests.ts # Meeting request CRUD + approval
│   │       ├── rooms.ts        # Room management
│   │       ├── telegram.ts     # Telegram webhook & bot commands
│   │       └── users.ts        # User management
│   ├── migrations/
│   │   └── 001_rename_roles.sql
│   ├── drizzle.config.ts       # Drizzle configuration
│   ├── package.json
│   ├── tsconfig.json
│   ├── railway.toml            # Railway deployment config
│   └── nixpacks.toml           # Nixpacks build config
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── App.tsx             # Main App + routing
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Global styles (Tailwind)
│   │   ├── components/
│   │   │   ├── AdminLayout.tsx # Admin layout (responsive sidebar toggle)
│   │   │   ├── Calendar.tsx    # Public calendar + booking form
│   │   │   ├── DataDepartment.tsx  # Department CRUD
│   │   │   ├── DataFasilitas.tsx   # Facility CRUD + import
│   │   │   ├── DataMonitoring.tsx  # Monitoring + approval (role-based)
│   │   │   ├── DataRuangan.tsx     # Room CRUD
│   │   │   ├── DataUser.tsx        # User CRUD + import
│   │   │   ├── Header.tsx          # Header (responsive)
│   │   │   ├── Login.tsx           # Login page
│   │   │   └── Sidebar.tsx         # Sidebar (responsive, collapsible)
│   │   └── services/
│   │       ├── api.ts          # Axios instance configuration
│   │       └── apiService.ts   # API service layer (typed)
│   ├── public/                 # Static assets
│   ├── assets/                 # Asset files
│   ├── index.html              # HTML template
│   ├── vite.config.ts          # Vite configuration
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── postcss.config.js       # PostCSS configuration
│   ├── package.json
│   ├── tsconfig.json
│   ├── railway.toml
│   └── nixpacks.toml
│
├── package.json                # Root package
├── RUNNING_GUIDE.md            # Panduan menjalankan aplikasi
└── tech_stack.md               # Dokumentasi ini
```

---

## 🛠️ NPM Commands

### Backend Commands

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Jalankan backend dengan hot reload (tsx watch) |
| `npm run start` | Jalankan backend untuk production |
| `npm run build` | Install dependencies |
| `npm run db:push` | Push schema Drizzle ke database |
| `npm run db:seed` | Seed data awal ke database |
| `npm run db:studio` | Buka Drizzle Studio (GUI database) |

### Frontend Commands

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Jalankan Vite dev server |
| `npm run build` | Build untuk production |
| `npm run preview` | Preview production build |
| `npm run lint` | Jalankan ESLint |
| `npm run start` | Build + Preview (untuk deployment) |

---

## 🔧 Prasyarat Development

- **Node.js** v18+ (https://nodejs.org/)
- **PostgreSQL** v15+ (https://www.postgresql.org/download/)
- **npm** atau **yarn**
- **Telegram Bot** (buat via @BotFather)

---

## 📝 Catatan Tambahan

- Project ini menggunakan arsitektur **monorepo** dengan frontend dan backend terpisah
- **Full-stack TypeScript** untuk type safety end-to-end
- **Hono** dipilih karena performa tinggi dan ringan (mirip Express tapi lebih cepat)
- **Drizzle ORM** memberikan type-safe database queries
- **Vite** sebagai build tool modern yang sangat cepat
- **Tailwind CSS** untuk styling utility-first yang responsive
- **Telegram Bot API** untuk notifikasi (menggantikan email karena Railway memblokir port 587/SMTP)
- **Role-based access control** — approval kolom Head Dept dan General Affair dibatasi per role
- **Responsive design** — semua halaman mendukung mobile dan desktop

---

*Dokumentasi ini dibuat untuk memudahkan onboarding developer baru dan referensi teknis project PRM-IMM.*
