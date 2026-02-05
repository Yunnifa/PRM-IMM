# PRM-IMM Backend API

Backend API untuk sistem manajemen peminjaman ruangan meeting menggunakan Hono.js, PostgreSQL, dan Drizzle ORM.

## Tech Stack

- **Framework**: Hono.js (Fast, lightweight web framework)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (No Alembic - menggunakan Drizzle Kit untuk migrations)
- **Validation**: Zod
- **API Documentation**: Swagger UI / OpenAPI 3.0
- **Deployment Ready**: Railway, Vercel, Cloudflare Workers

## Kenapa Drizzle ORM?

Drizzle ORM dipilih karena:
- ✅ **Lebih mudah dari Alembic** - Schema-first approach yang simple
- ✅ **Compatible dengan Hono.js** - TypeScript native
- ✅ **Perfect untuk Railway** - Auto-migration support
- ✅ **Terintegrasi dengan PgAdmin4** - Direct SQL queries
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Push & Pull Schema** - Tidak perlu manual migration files

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database

Buat database PostgreSQL menggunakan PgAdmin4:

```sql
CREATE DATABASE prm_imm;
```

### 3. Environment Variables

Copy `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/prm_imm
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
```

### 4. Push Database Schema

Drizzle ORM menggunakan `drizzle-kit push` untuk sync schema (tanpa Alembic):

```bash
npm run db:push
```

Atau jalankan langsung:

```bash
npx drizzle-kit push
```

Perintah ini akan:
- Membuat semua tabel
- Membuat enums
- Membuat relations
- Tanpa file migration manual!

### 5. (Optional) Drizzle Studio

Untuk melihat database secara visual:

```bash
npm run db:studio
```

Buka browser di `https://local.drizzle.studio`

### 6. Run Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## API Documentation

Setelah server berjalan, akses:

- **Swagger UI**: http://localhost:3000/swagger
- **OpenAPI JSON**: http://localhost:3000/api/openapi.json

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID

### Departments

- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department

### Rooms

- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create room

### Facilities

- `GET /api/facilities` - Get all facilities
- `POST /api/facilities` - Create facility

### Meeting Requests

- `GET /api/meeting-requests` - Get all meeting requests
- `POST /api/meeting-requests` - Create meeting request
- `PATCH /api/meeting-requests/:id/approval` - Update approval status

## Database Schema

### Tables

1. **users** - User accounts dengan roles
2. **departments** - Department data
3. **rooms** - Meeting room data
4. **facilities** - Facility master data
5. **room_facilities** - Room-Facility relations
6. **meeting_requests** - Peminjaman ruangan requests
7. **meeting_request_history** - History tracking

### User Roles

- `admin` - Full access
- `head_ga` - Approve/Reject GA
- `head_os` - Approve/Reject OS
- `user` - Submit requests

## Drizzle Commands

### Generate Migrations (Optional)

Jika ingin pakai migration files:

```bash
npx drizzle-kit generate
```

### Push Schema (Recommended)

Langsung sync schema ke database:

```bash
npx drizzle-kit push
```

### Pull Schema

Pull schema dari database existing:

```bash
npx drizzle-kit pull
```

### Introspect Database

Lihat struktur database:

```bash
npx drizzle-kit introspect
```

## Deployment ke Railway

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login

```bash
railway login
```

### 3. Initialize Project

```bash
railway init
```

### 4. Add PostgreSQL

Di Railway dashboard:
- Add New Service → PostgreSQL
- Copy DATABASE_URL

### 5. Set Environment Variables

```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="your-secret"
railway variables set FRONTEND_URL="https://your-frontend.com"
```

### 6. Deploy

```bash
railway up
```

### 7. Run Migrations

```bash
railway run npm run db:push
```

## Production Build

```bash
npm run build
npm start
```

## Testing API

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "password123",
    "fullName": "John Doe",
    "whatsapp": "6281234567890",
    "department": "IT Department"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123"
  }'
```

### Create Meeting Request

```bash
curl -X POST http://localhost:3000/api/meeting-requests \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "nama": "John Doe",
    "whatsapp": "6281234567890",
    "department": "IT Department",
    "tanggal": "2026-02-10",
    "hari": "Senin",
    "jamMulai": "09:00",
    "jamBerakhir": "11:00",
    "jumlahPeserta": 10,
    "agenda": "Team Meeting",
    "namaRuangan": "Meeting Room A",
    "fasilitas": "Projector, Whiteboard"
  }'
```

## PgAdmin4 Connection

1. Buka PgAdmin4
2. Create New Server
3. Connection Details:
   - Host: localhost (atau Railway host)
   - Port: 5432
   - Database: prm_imm
   - Username: your_username
   - Password: your_password

## Troubleshooting

### Error: DATABASE_URL not set

Pastikan file `.env` ada dan berisi DATABASE_URL yang benar.

### Error: Cannot connect to database

Pastikan PostgreSQL berjalan:

```bash
# Windows (Services)
# Linux/Mac
sudo service postgresql start
```

### Error: Table does not exist

Jalankan push schema:

```bash
npm run db:push
```

## License

MIT
