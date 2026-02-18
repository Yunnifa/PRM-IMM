# Sistem Penomoran ID - PRM-IMM

Dokumen ini menjelaskan sistem penomoran ID yang digunakan dalam project PRM-IMM untuk referensi implementasi pada project lain.

---

## 1. User (Pengguna)

### Struktur Tabel

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL UNIQUE,
    birth_date VARCHAR(10),           -- Format: YYYY-MM-DD
    department VARCHAR(100),
    telegram_chat_id VARCHAR(100),
    role role_enum NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Penomoran ID

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `SERIAL` (auto-increment) | Primary key, dimulai dari 1 dan auto-increment |

### Keterangan

- **ID User** menggunakan `SERIAL` (PostgreSQL auto-increment integer)
- ID bersifat sequential: 1, 2, 3, 4, ...
- ID tidak pernah di-reset meskipun ada user yang dihapus
- Soft delete menggunakan field `is_active` (1 = aktif, 0 = nonaktif)
- Username dan email harus **unique** sebagai identifier alternatif

### Contoh Data

| id | username | email | full_name |
|----|----------|-------|-----------|
| 1 | admin | admin@company.com | Administrator |
| 2 | john.doe | john@company.com | John Doe |
| 3 | jane.smith | jane@company.com | Jane Smith |

### Role Enum

```typescript
type Role = 'admin' | 'head_dept' | 'ga' | 'user';
```

| Role | Keterangan |
|------|------------|
| `admin` | Superadmin - full access |
| `head_dept` | Head Department - approve meeting per department |
| `ga` | General Affair - approve semua meeting |
| `user` | User biasa / public |

---

## 2. Department (Departemen)

### Struktur Tabel

```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Penomoran ID

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `SERIAL` (auto-increment) | Primary key, dimulai dari 1 dan auto-increment |

### Keterangan

- **ID Department** menggunakan `SERIAL` (auto-increment)
- Nama department harus **unique**
- Soft delete menggunakan field `is_active`

### Contoh Data

| id | name | description |
|----|------|-------------|
| 1 | IT Department | Teknologi Informasi |
| 2 | HR Department | Human Resources |
| 3 | Finance | Keuangan |
| 4 | General Affair | Urusan Umum |

---

## 3. Data Monitoring (Meeting Request)

### Struktur Tabel

```sql
CREATE TABLE meeting_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL UNIQUE,    -- Format: MTG-{number}
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    tanggal VARCHAR(10) NOT NULL,              -- Format: YYYY-MM-DD
    hari VARCHAR(20) NOT NULL,
    jam_mulai VARCHAR(5) NOT NULL,             -- Format: HH:MM
    jam_berakhir VARCHAR(5) NOT NULL,          -- Format: HH:MM
    jumlah_peserta INTEGER NOT NULL,
    agenda TEXT NOT NULL,
    nama_ruangan VARCHAR(100) NOT NULL,
    fasilitas TEXT NOT NULL,
    head_ga approval_status_enum NOT NULL DEFAULT 'pending',
    head_os approval_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Penomoran ID

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `SERIAL` (auto-increment) | Primary key internal database |
| `request_id` | `VARCHAR(50)` | **Human-readable ID** dengan format `MTG-{number}` |

### Logika Generate Request ID

```typescript
// Backend: routes/meetingRequests.ts

// Generate request ID
const count = await db.select().from(meetingRequests);
const requestId = `MTG-${count.length + 1}`;
```

**Penjelasan:**
1. Hitung total record yang ada di tabel `meeting_requests`
2. Tambahkan 1 untuk mendapatkan nomor baru
3. Format: `MTG-{nomor}`

### Contoh Data

| id | request_id | nama | department | tanggal |
|----|------------|------|------------|---------|
| 1 | MTG-1 | John Doe | IT Department | 2024-01-15 |
| 2 | MTG-2 | Jane Smith | HR Department | 2024-01-16 |
| 3 | MTG-3 | Bob Johnson | Finance | 2024-01-17 |

### Status Approval

```typescript
type ApprovalStatus = 'pending' | 'approved' | 'rejected';
```

| Field | Keterangan |
|-------|------------|
| `head_dept` | Approval dari Head Department |
| `ga` | Approval dari General Affair |

### Catatan Penting

- `id` (SERIAL) digunakan untuk relasi internal database
- `request_id` (MTG-X) digunakan untuk ditampilkan ke user sebagai referensi
- Request ID bersifat **unique** dan **sequential**
- Jika ada record yang dihapus, nomor tetap lanjut (tidak reset)

---

## 4. Meeting Request History

### Struktur Tabel

```sql
CREATE TABLE meeting_request_history (
    id SERIAL PRIMARY KEY,
    meeting_request_id INTEGER NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    action VARCHAR(255) NOT NULL,
    by VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20),
    status history_status_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Penomoran ID

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `SERIAL` | Auto-increment primary key |
| `meeting_request_id` | `INTEGER` | Foreign key ke tabel `meeting_requests` |

### History Status Enum

```typescript
type HistoryStatus = 'submitted' | 'approved' | 'rejected';
```

---

## 5. Tabel Pendukung Lainnya

### Rooms (Ruangan)

```sql
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    location VARCHAR(255),
    is_hybrid INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Facilities (Fasilitas)

```sql
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Room Facilities (Many-to-Many)

```sql
CREATE TABLE room_facilities (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## 6. Ringkasan Sistem Penomoran

| Entitas | Field ID | Tipe | Format | Contoh |
|---------|----------|------|--------|--------|
| User | `id` | SERIAL | Sequential integer | 1, 2, 3, ... |
| Department | `id` | SERIAL | Sequential integer | 1, 2, 3, ... |
| Meeting Request | `id` | SERIAL | Sequential integer | 1, 2, 3, ... |
| Meeting Request | `request_id` | VARCHAR | `MTG-{number}` | MTG-1, MTG-2, ... |
| Room | `id` | SERIAL | Sequential integer | 1, 2, 3, ... |
| Facility | `id` | SERIAL | Sequential integer | 1, 2, 3, ... |
| Meeting History | `id` | SERIAL | Sequential integer | 1, 2, 3, ... |

---

## 7. Best Practices untuk Implementasi

### Menggunakan SERIAL vs UUID

**SERIAL (digunakan di project ini):**
- ✅ Simple dan mudah dibaca
- ✅ Performa query lebih baik
- ❌ Bisa diprediksi
- ❌ Tidak cocok untuk distributed system

**UUID (alternatif):**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
- ✅ Tidak bisa diprediksi
- ✅ Cocok untuk distributed system
- ❌ Lebih panjang dan sulit dibaca

### Human-Readable ID Pattern

Untuk ID yang ditampilkan ke user (seperti `request_id`), gunakan format:

```
{PREFIX}-{NUMBER}
```

Contoh implementasi lain:
- Invoice: `INV-0001`, `INV-0002`
- Ticket: `TKT-2024-001`
- Order: `ORD-20240115-001` (dengan tanggal)

### Implementasi dengan Padding (Zero-padded)

```typescript
// Dengan padding 4 digit
const requestId = `MTG-${String(count + 1).padStart(4, '0')}`;
// Output: MTG-0001, MTG-0002, ...

// Dengan tahun
const year = new Date().getFullYear();
const requestId = `MTG-${year}-${String(count + 1).padStart(3, '0')}`;
// Output: MTG-2024-001, MTG-2024-002, ...
```

---

## 8. Drizzle ORM Schema (TypeScript)

Untuk implementasi menggunakan Drizzle ORM:

```typescript
import { pgTable, serial, varchar, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// Enum definitions
export const roleEnum = pgEnum('role', ['admin', 'head_dept', 'ga', 'user']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // ... field lainnya
});

// Departments Table
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  // ... field lainnya
});

// Meeting Requests Table
export const meetingRequests = pgTable('meeting_requests', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 50 }).notNull().unique(),
  // ... field lainnya
});
```

---

## 9. Kesimpulan

| Aspek | Implementasi |
|-------|--------------|
| Primary Key | `SERIAL` (auto-increment integer) |
| Human-readable ID | Format `PREFIX-NUMBER` |
| Soft Delete | Field `is_active` (1/0) |
| Unique Constraints | Pada field kunci seperti username, email, name |
| Timestamps | `created_at` dan `updated_at` |

Dokumen ini dapat digunakan sebagai referensi untuk mengimplementasikan sistem penomoran yang konsisten pada project lain.
