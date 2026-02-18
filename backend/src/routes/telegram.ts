import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const app = new OpenAPIHono();

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const BASE_URL = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;

// ─── Telegram API helpers ────────────────────────────────────

async function sendText(chatId: string | number, text: string, replyMarkup?: any) {
  await fetch(`${BASE_URL()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function answerCallback(callbackQueryId: string, text?: string) {
  await fetch(`${BASE_URL()}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
}

async function editMessage(chatId: string | number, messageId: number, text: string, replyMarkup?: any) {
  await fetch(`${BASE_URL()}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

// ─── Command Handlers ────────────────────────────────────────

async function handleStart(chatId: string | number, firstName: string) {
  // Check if already linked
  const [alreadyLinked] = await db.select({
    fullName: users.fullName,
    role: users.role,
    department: users.department,
  })
  .from(users)
  .where(eq(users.telegramChatId, String(chatId)));

  if (alreadyLinked) {
    const roleLabel =
      alreadyLinked.role === 'head_dept' ? 'General Affairs' :
      alreadyLinked.role === 'ga' ? 'General Affairs' :
      alreadyLinked.role === 'admin' ? 'Administrator' : 'User';

    await sendText(
      chatId,
      `👋 <b>Selamat datang kembali, ${firstName}!</b>\n\n` +
      `✅ Anda sudah terhubung sebagai:\n` +
      `👤 <b>${alreadyLinked.fullName}</b>\n` +
      `🏢 ${alreadyLinked.department || '-'}\n` +
      `🔑 ${roleLabel}\n\n` +
      `Anda akan menerima notifikasi meeting otomatis.\n\n` +
      `📌 /status — Cek status koneksi\n` +
      `📌 /unlink — Putuskan koneksi`,
    );
    return;
  }

  // Fetch users from General Affairs department
  const gaUsers = await db.select({
    id: users.id,
    fullName: users.fullName,
    role: users.role,
    department: users.department,
    telegramChatId: users.telegramChatId,
  })
  .from(users)
  .where(
    and(
      eq(users.isActive, 1)
    )
  );

  // Filter to users whose department contains 'General Affairs' or 'GA', plus admin
  const approvers = gaUsers.filter(u => 
    u.department?.toLowerCase()?.includes('general affair') ||
    u.department?.toLowerCase()?.includes('general affairs') ||
    u.role === 'admin'
  );

  if (approvers.length === 0) {
    await sendText(
      chatId,
      `👋 <b>Selamat datang, ${firstName}!</b>\n\n` +
      `Saya adalah <b>Bot Notifikasi PRM-IMM</b> 🏢\n\n` +
      `⚠️ Belum ada user di departemen General Affairs yang terdaftar di sistem.`,
    );
    return;
  }

  // Build inline keyboard with user names
  const buttons = approvers.map(u => {
    const roleLabel = u.role === 'ga' ? '🏗 GA' : u.role === 'head_dept' ? '👔 GA' : u.role === 'admin' ? '⚙️ Admin' : '👤';
    const linked = u.telegramChatId ? ' ✅' : '';
    return {
      text: `${roleLabel} ${u.fullName}${linked}`,
      callback_data: `user:${u.id}`,
    };
  });

  const keyboard: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < buttons.length; i += 1) {
    keyboard.push([buttons[i]]);
  }

  await sendText(
    chatId,
    `👋 <b>Selamat datang, ${firstName}!</b>\n\n` +
    `Saya adalah <b>Bot Notifikasi PRM-IMM</b> 🏢\n` +
    `Sistem Peminjaman Ruangan Meeting PT IMM.\n\n` +
    `🏢 <b>Departemen General Affairs</b>\n` +
    `Silakan pilih nama Anda di bawah untuk menerima notifikasi persetujuan meeting:\n\n` +
    `<i>(✅ = sudah terhubung)</i>`,
    { inline_keyboard: keyboard },
  );
}

// handleDepartment and handleDepartmentSelection removed — /start now directly shows approvers

async function handleUserSelection(
  chatId: string | number,
  messageId: number,
  callbackQueryId: string,
  userId: number,
  telegramChatId: string,
) {
  await answerCallback(callbackQueryId);

  // Check if this telegram chat is already linked to another user
  const [existingLink] = await db.select({
    id: users.id,
    fullName: users.fullName,
  })
  .from(users)
  .where(eq(users.telegramChatId, telegramChatId));

  if (existingLink && existingLink.id !== userId) {
    // Unlink old user first
    await db.update(users)
      .set({ telegramChatId: null })
      .where(eq(users.id, existingLink.id));
    console.log(`🔄 Unlinked Telegram from ${existingLink.fullName} (id:${existingLink.id})`);
  }

  // Link this telegram chat to the selected user
  await db.update(users)
    .set({ telegramChatId: telegramChatId })
    .where(eq(users.id, userId));

  // Fetch updated user info
  const [updatedUser] = await db.select({
    fullName: users.fullName,
    role: users.role,
    department: users.department,
  })
  .from(users)
  .where(eq(users.id, userId));

  if (!updatedUser) {
    await editMessage(chatId, messageId, '❌ User tidak ditemukan.');
    return;
  }

  const roleLabel =
    updatedUser.role === 'head_dept' ? 'General Affairs' :
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

  console.log(`✅ Telegram linked: chat ${telegramChatId} → ${updatedUser.fullName} (id:${userId})`);
}

async function handleStatus(chatId: string | number, telegramChatId: string) {
  const [linked] = await db.select({
    fullName: users.fullName,
    role: users.role,
    department: users.department,
  })
  .from(users)
  .where(eq(users.telegramChatId, telegramChatId));

  if (linked) {
    const roleLabel =
      linked.role === 'head_dept' ? 'General Affairs' :
      linked.role === 'ga' ? 'General Affairs' :
      linked.role === 'admin' ? 'Administrator' : 'User';

    await sendText(
      chatId,
      `📊 <b>Status Koneksi</b>\n\n` +
      `✅ Terhubung ke:\n` +
      `👤 <b>${linked.fullName}</b>\n` +
      `🏢 ${linked.department || '-'}\n` +
      `🔑 ${roleLabel}\n\n` +
      `Anda akan menerima notifikasi meeting otomatis.`,
    );
  } else {
    await sendText(
      chatId,
      `📊 <b>Status Koneksi</b>\n\n` +
      `❌ Belum terhubung ke akun manapun.\n\n` +
      `👉 Ketik /start untuk menghubungkan akun.`,
    );
  }
}

async function handleUnlink(chatId: string | number, telegramChatId: string) {
  const [linked] = await db.select({
    id: users.id,
    fullName: users.fullName,
  })
  .from(users)
  .where(eq(users.telegramChatId, telegramChatId));

  if (linked) {
    await db.update(users)
      .set({ telegramChatId: null })
      .where(eq(users.id, linked.id));

    await sendText(
      chatId,
      `🔓 <b>Koneksi Diputus</b>\n\n` +
      `Akun <b>${linked.fullName}</b> sudah tidak terhubung dengan Telegram ini.\n\n` +
      `👉 Ketik /start untuk menghubungkan ulang.`,
    );
    console.log(`🔓 Telegram unlinked: chat ${telegramChatId} ← ${linked.fullName}`);
  } else {
    await sendText(chatId, `ℹ️ Anda belum terhubung ke akun manapun.`);
  }
}

async function handleHelp(chatId: string | number) {
  await sendText(
    chatId,
    `📖 <b>Bantuan Bot PRM-IMM</b>\n\n` +
    `Bot ini mengirimkan notifikasi otomatis untuk persetujuan ruang meeting.\n\n` +
    `<b>Perintah:</b>\n` +
    `/start — Mulai & hubungkan akun\n` +
    `/status — Cek status koneksi\n` +
    `/unlink — Putuskan koneksi akun\n` +
    `/help — Tampilkan bantuan ini`,
  );
}

// ─── Webhook Route ───────────────────────────────────────────

const webhookRoute = createRoute({
  method: 'post',
  path: '/webhook',
  tags: ['Telegram'],
  request: {
    body: {
      content: { 'application/json': { schema: z.any() } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
      description: 'Webhook processed',
    },
  },
});

app.openapi(webhookRoute, async (c) => {
  try {
    const update = await c.req.json();

    // Handle callback_query (inline keyboard button press)
    if (update.callback_query) {
      const cbq = update.callback_query;
      const chatId = String(cbq.message?.chat?.id);
      const messageId = cbq.message?.message_id;
      const data = cbq.data as string;

      if (data.startsWith('user:')) {
        const userId = parseInt(data.split(':')[1]);
        await handleUserSelection(chatId, messageId, cbq.id, userId, chatId);
      }

      return c.json({ ok: true });
    }

    // Handle text message commands
    const message = update.message;
    if (!message?.text) return c.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'User';

    if (text === '/start') {
      await handleStart(chatId, firstName);
    } else if (text === '/status') {
      await handleStatus(chatId, chatId);
    } else if (text === '/unlink') {
      await handleUnlink(chatId, chatId);
    } else if (text === '/help') {
      await handleHelp(chatId);
    } else {
      await sendText(
        chatId,
        `🤖 Perintah tidak dikenali.\n\nKetik /help untuk melihat daftar perintah.`,
      );
    }
  } catch (err: any) {
    console.error('❌ Telegram webhook error:', err.message);
  }

  return c.json({ ok: true });
});

// ─── Setup webhook endpoint (call once to register) ─────────

const setupWebhookRoute = createRoute({
  method: 'get',
  path: '/setup-webhook',
  tags: ['Telegram'],
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } },
      description: 'Webhook setup result',
    },
  },
});

app.openapi(setupWebhookRoute, async (c) => {
  const backendUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${process.env.PORT || '3000'}`;

  const webhookUrl = `${backendUrl}/api/telegram/webhook`;

  const res = await fetch(`${BASE_URL()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const json = await res.json() as { ok: boolean; description?: string };

  if (json.ok) {
    console.log(`✅ Telegram webhook set to: ${webhookUrl}`);
    return c.json({ success: true, message: `Webhook set to ${webhookUrl}` });
  }

  return c.json({ success: false, message: json.description || 'Failed' });
});

export default app;
