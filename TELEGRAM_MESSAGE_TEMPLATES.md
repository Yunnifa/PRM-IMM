# Dokumentasi Template Pesan Telegram Bot PRM-IMM

File sumber: `backend/src/routes/telegram.ts`

---

## 1. Pesan Setelah `/start`

### Lokasi Kode
Fungsi `handleStart` (baris 55-65)

### Kode Template

```typescript
async function handleStart(chatId: string | number, firstName: string) {
  const text =
    `👋 <b>Selamat datang, ${firstName}!</b>\n\n` +
    `Saya adalah <b>Bot Notifikasi PRM-IMM</b> 🏢\n` +
    `Sistem Peminjaman Ruangan Meeting PT IMM.\n\n` +
    `Untuk menerima notifikasi persetujuan meeting, ` +
    `silakan hubungkan akun Anda:\n\n` +
    `👉 Ketik /department untuk memilih departemen Anda`;

  await sendText(chatId, text);
}
```

### Hasil Pesan
```
👋 Selamat datang, [NamaUser]!

Saya adalah Bot Notifikasi PRM-IMM 🏢
Sistem Peminjaman Ruangan Meeting PT IMM.

Untuk menerima notifikasi persetujuan meeting, silakan hubungkan akun Anda:

👉 Ketik /department untuk memilih departemen Anda
```

---

## 2. Pesan Setelah `/department`

### Lokasi Kode
Fungsi `handleDepartment` (baris 67-94)

### Kode Template

```typescript
async function handleDepartment(chatId: string | number) {
  // Fetch active departments from DB
  const deptList = await db.select({
    id: departments.id,
    name: departments.name,
  })
  .from(departments)
  .where(eq(departments.isActive, 1));

  if (deptList.length === 0) {
    await sendText(chatId, '⚠️ Belum ada departemen yang terdaftar di sistem.');
    return;
  }

  // Build inline keyboard — 2 columns
  const buttons = deptList.map(d => ({
    text: d.name,
    callback_data: `dept:${d.id}:${d.name}`,
  }));

  const keyboard: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }

  await sendText(
    chatId,
    '🏢 <b>Pilih Departemen Anda:</b>\n\nSilakan pilih departemen tempat Anda bekerja.',
    { inline_keyboard: keyboard },
  );
}
```

### Hasil Pesan
```
🏢 Pilih Departemen Anda:

Silakan pilih departemen tempat Anda bekerja.

[Inline Keyboard dengan tombol nama departemen, 2 kolom per baris]
```

---

## 3. Cara Get List Department

### Query Database

```typescript
import { db } from '../db';
import { departments } from '../db/schema';
import { eq } from 'drizzle-orm';

// Ambil semua departemen yang aktif
const deptList = await db.select({
  id: departments.id,
  name: departments.name,
})
.from(departments)
.where(eq(departments.isActive, 1));
```

### Penjelasan
- Menggunakan **Drizzle ORM** untuk query database
- Tabel: `departments`
- Filter: `isActive = 1` (hanya departemen aktif)
- Return: Array of `{ id: number, name: string }`

---

## 4. Cara Get List User di Departemen Tertentu

### Lokasi Kode
Fungsi `handleDepartmentSelection` (baris 96-148)

### Query Database

```typescript
import { db } from '../db';
import { users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Ambil semua user aktif di departemen tertentu
const userList = await db.select({
  id: users.id,
  fullName: users.fullName,
  role: users.role,
  username: users.username,
  telegramChatId: users.telegramChatId,
})
.from(users)
.where(
  and(
    eq(users.department, deptName),  // Filter by department name
    eq(users.isActive, 1)            // Hanya user aktif
  )
);
```

### Penjelasan
- Tabel: `users`
- Filter:
  - `department = 'NamaDepartemen'`
  - `isActive = 1`
- Return: Array of user objects dengan field:
  - `id` - ID user
  - `fullName` - Nama lengkap
  - `role` - Role user (`head_dept`, `ga`, `admin`, dll)
  - `username` - Username
  - `telegramChatId` - Chat ID telegram (null jika belum terhubung)

### Pesan Setelah Pilih Departemen

```typescript
await editMessage(
  chatId,
  messageId,
  `🏢 Departemen: <b>${deptName}</b>\n\n👤 <b>Pilih nama Anda:</b>\n<i>(✅ = sudah terhubung)</i>`,
  { inline_keyboard: keyboard },
);
```

### Hasil Pesan
```
🏢 Departemen: [NamaDepartemen]

👤 Pilih nama Anda:
(✅ = sudah terhubung)

[Inline Keyboard dengan daftar user, 1 per baris]
Format tombol: [RoleEmoji] [NamaUser] [✅ jika sudah terhubung]
```

---

## 5. Pesan Setelah User Berhasil Terhubung

### Lokasi Kode
Fungsi `handleUserSelection` (baris 150-202)

### Kode Template

```typescript
const roleLabel =
  updatedUser.role === 'head_dept' ? 'Head Department' :
  updatedUser.role === 'ga' ? 'General Affairs' :
  updatedUser.role === 'admin' ? 'Administrator' : 'User';

await editMessage(
  chatId,
  messageId,
  `✅ <b>Akun Berhasil Terhubung!</b>\n\n` +
  `👤 <b>Nama:</b> ${updatedUser.fullName}\n` +
  `🏢 <b>Departemen:</b> ${updatedUser.department || '-'}\n` +
  `🔑 <b>Role:</b> ${roleLabel}\n\n` +
  `Anda akan menerima notifikasi Telegram saat ada permintaan ruang meeting yang membutuhkan persetujuan Anda.\n\n` +
  `📌 Ketik /status untuk cek status\n` +
  `📌 Ketik /unlink untuk putuskan koneksi`,
);
```

---

## 6. Command Lainnya

### `/status` - Cek Status Koneksi (baris 222-250)

```typescript
// Jika terhubung:
`📊 <b>Status Koneksi</b>\n\n` +
`✅ Terhubung ke:\n` +
`👤 <b>${linked.fullName}</b>\n` +
`🏢 ${linked.department || '-'}\n` +
`🔑 ${roleLabel}\n\n` +
`Anda akan menerima notifikasi meeting otomatis.`

// Jika belum terhubung:
`📊 <b>Status Koneksi</b>\n\n` +
`❌ Belum terhubung ke akun manapun.\n\n` +
`👉 Ketik /department untuk menghubungkan akun.`
```

### `/unlink` - Putuskan Koneksi (baris 252-276)

```typescript
`🔓 <b>Koneksi Diputus</b>\n\n` +
`Akun <b>${linked.fullName}</b> sudah tidak terhubung dengan Telegram ini.\n\n` +
`👉 Ketik /department untuk menghubungkan ulang.`
```

### `/help` - Bantuan (baris 278-290)

```typescript
`📖 <b>Bantuan Bot PRM-IMM</b>\n\n` +
`Bot ini mengirimkan notifikasi otomatis untuk persetujuan ruang meeting.\n\n` +
`<b>Perintah:</b>\n` +
`/start — Mulai & selamat datang\n` +
`/department — Pilih departemen & hubungkan akun\n` +
`/status — Cek status koneksi\n` +
`/unlink — Putuskan koneksi akun\n` +
`/help — Tampilkan bantuan ini`
```

---

## Flow Webhook

Command ditangani di route webhook (`POST /api/telegram/webhook`):

```typescript
if (text === '/start') {
  await handleStart(chatId, firstName);
} else if (text === '/department') {
  await handleDepartment(chatId);
} else if (text === '/status') {
  await handleStatus(chatId, chatId);
} else if (text === '/unlink') {
  await handleUnlink(chatId, chatId);
} else if (text === '/help') {
  await handleHelp(chatId);
}
```

Callback query (tombol inline) ditangani dengan parsing `callback_data`:
- `dept:{id}:{name}` → Pilih departemen
- `user:{id}` → Pilih user
- `back:dept` → Kembali ke list departemen
