/**
 * Telegram Notification Service for PRM-IMM
 * Uses Telegram Bot API via HTTPS (port 443) — works on Railway.
 *
 * Flow:
 *  1. New meeting request → notify Head Dept of the requester's department
 *  2. Head Dept approves  → notify GA
 *  3. Head Dept rejects   → (no further notification)
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN  — token from @BotFather
 *   TELEGRAM_CHAT_ID    — fallback default chat id (optional)
 *
 * Approvers' Telegram chat IDs are stored in the `users` table field `telegramChatId`.
 */

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const BASE_URL = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;

export interface TelegramMeetingData {
  requestId: string;
  nama: string;
  whatsapp: string;
  department: string;
  tanggal: string;
  hari: string;
  jamMulai: string;
  jamBerakhir: string;
  jumlahPeserta: number;
  agenda: string;
  namaRuangan: string;
  fasilitas: string;
}

/**
 * Send a Telegram message to a single chat
 */
async function sendMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN()) {
    console.log('⚠️ Telegram skipped — TELEGRAM_BOT_TOKEN not set');
    return false;
  }

  try {
    const res = await fetch(`${BASE_URL()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (res.ok) {
      console.log(`✅ Telegram sent to ${chatId}`);
      return true;
    }

    const err = await res.text();
    console.error(`❌ Telegram API ${res.status} for ${chatId}: ${err}`);
    return false;
  } catch (error: any) {
    console.error(`❌ Telegram send error to ${chatId}: ${error.message}`);
    return false;
  }
}

/**
 * Build the formatted message for a new meeting request notification
 */
function buildMeetingRequestMessage(
  data: TelegramMeetingData,
  recipientName: string,
  roleLabel: string,
): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login?redirect=/monitoring`;

  return (
    `📅 <b>Permintaan Ruang Meeting Baru</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Halo <b>${recipientName}</b>,\n` +
    `Ada permintaan ruang meeting yang memerlukan persetujuan Anda sebagai <b>${roleLabel}</b>.\n\n` +
    `🆔 <b>ID:</b> ${data.requestId}\n` +
    `👤 <b>Pemohon:</b> ${data.nama}\n` +
    `🏢 <b>Department:</b> ${data.department}\n` +
    `📱 <b>WhatsApp:</b> ${data.whatsapp}\n` +
    `📅 <b>Tanggal:</b> ${data.hari}, ${data.tanggal}\n` +
    `⏰ <b>Waktu:</b> ${data.jamMulai} - ${data.jamBerakhir}\n` +
    `🏠 <b>Ruangan:</b> ${data.namaRuangan}\n` +
    `👥 <b>Peserta:</b> ${data.jumlahPeserta} orang\n` +
    `📋 <b>Agenda:</b> ${data.agenda}\n` +
    `🛠 <b>Fasilitas:</b> ${data.fasilitas}\n` +
    `⏳ <b>Status:</b> Menunggu Persetujuan\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <a href="${loginUrl}">Klik di sini untuk Lakukan Persetujuan</a>`
  );
}

/**
 * Build message notifying GA after Head Dept approval
 */
function buildGANotificationMessage(
  data: TelegramMeetingData,
  recipientName: string,
): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login?redirect=/monitoring`;

  return (
    `✅ <b>Head Dept Approved — Menunggu Persetujuan GA</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Halo <b>${recipientName}</b>,\n` +
    `Permintaan berikut telah disetujui oleh Head Department dan memerlukan persetujuan Anda sebagai <b>General Affairs</b>.\n\n` +
    `🆔 <b>ID:</b> ${data.requestId}\n` +
    `👤 <b>Pemohon:</b> ${data.nama}\n` +
    `🏢 <b>Department:</b> ${data.department}\n` +
    `📱 <b>WhatsApp:</b> ${data.whatsapp}\n` +
    `📅 <b>Tanggal:</b> ${data.hari}, ${data.tanggal}\n` +
    `⏰ <b>Waktu:</b> ${data.jamMulai} - ${data.jamBerakhir}\n` +
    `🏠 <b>Ruangan:</b> ${data.namaRuangan}\n` +
    `👥 <b>Peserta:</b> ${data.jumlahPeserta} orang\n` +
    `📋 <b>Agenda:</b> ${data.agenda}\n` +
    `🛠 <b>Fasilitas:</b> ${data.fasilitas}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <a href="${loginUrl}">Klik di sini untuk Lakukan Persetujuan</a>`
  );
}

export interface TelegramApprover {
  fullName: string;
  telegramChatId: string | null;
  role: 'head_dept' | 'ga';
}

/**
 * Notify Head Dept (of the same department as requester) when a new request is created.
 * Also sends to GA so they are aware, but GA acts only after Head Dept approves.
 */
export async function notifyNewRequest(
  data: TelegramMeetingData,
  approvers: TelegramApprover[],
): Promise<void> {
  // Only notify Head Dept at creation time
  const headDeptApprovers = approvers.filter(a => a.role === 'head_dept' && a.telegramChatId);

  for (const approver of headDeptApprovers) {
    const msg = buildMeetingRequestMessage(data, approver.fullName, 'Head Department');
    await sendMessage(approver.telegramChatId!, msg);
  }

  if (headDeptApprovers.length === 0) {
    // Fallback to default chat id
    const fallback = process.env.TELEGRAM_CHAT_ID;
    if (fallback) {
      const msg = buildMeetingRequestMessage(data, 'Admin', 'Head Department');
      await sendMessage(fallback, msg);
    } else {
      console.log('⚠️ No Head Dept Telegram recipients found');
    }
  }
}

/**
 * Notify GA users after Head Dept approves a request.
 */
export async function notifyGAAfterHeadApproval(
  data: TelegramMeetingData,
  gaApprovers: TelegramApprover[],
): Promise<void> {
  const gaWithChat = gaApprovers.filter(a => a.telegramChatId);

  for (const approver of gaWithChat) {
    const msg = buildGANotificationMessage(data, approver.fullName);
    await sendMessage(approver.telegramChatId!, msg);
  }

  if (gaWithChat.length === 0) {
    const fallback = process.env.TELEGRAM_CHAT_ID;
    if (fallback) {
      const msg = buildGANotificationMessage(data, 'General Affairs');
      await sendMessage(fallback, msg);
    } else {
      console.log('⚠️ No GA Telegram recipients found');
    }
  }
}

/**
 * Verify Telegram bot token is valid
 */
export async function verifyTelegramBot(): Promise<boolean> {
  if (!BOT_TOKEN()) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN not set');
    return false;
  }

  try {
    const res = await fetch(`${BASE_URL()}/getMe`);
    if (res.ok) {
      const json = await res.json() as { result?: { username?: string } };
      console.log(`✅ Telegram bot ready: @${json.result?.username}`);
      return true;
    }
    console.error('❌ Telegram bot verification failed:', await res.text());
    return false;
  } catch (err: any) {
    console.error('❌ Telegram bot verification error:', err.message);
    return false;
  }
}
