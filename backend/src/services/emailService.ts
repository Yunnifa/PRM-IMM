import nodemailer from 'nodemailer';
import { db } from '../db';
import { emailLogs } from '../db/schema';

// Configure Office 365 SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: 587,
  secure: false, // WAJIB false untuk port 587
  family: 4, // Force IPv4 — Railway IPv6 routing causes ENETUNREACH
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
  debug: true,
  logger: true,
});

// Verify on startup
transporter.verify()
  .then(() => console.log(`✅ Email transporter ready (${process.env.SMTP_HOST || 'smtp.office365.com'}:${process.env.SMTP_PORT || '587'})`))
  .catch((err) => console.error('❌ Email transporter error:', err.message));

/**
 * Log email to database
 */
async function logEmail(data: {
  toEmail: string;
  toName?: string;
  subject: string;
  emailType: string;
  meetingRequestId?: number;
  status: 'sent' | 'failed';
  messageId?: string;
  errorMessage?: string;
}) {
  try {
    await db.insert(emailLogs).values({
      toEmail: data.toEmail,
      toName: data.toName || null,
      subject: data.subject,
      emailType: data.emailType,
      meetingRequestId: data.meetingRequestId || null,
      status: data.status,
      messageId: data.messageId || null,
      errorMessage: data.errorMessage || null,
    });
  } catch (error) {
    console.error('Failed to log email to database:', error);
  }
}

interface MeetingRequestEmailData {
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

interface ApproverInfo {
  email: string;
  fullName: string;
  role: 'head_dept' | 'ga';
}

/**
 * Send email notification to Head Department and GA when a new meeting request is created
 */
export async function sendMeetingRequestNotification(
  meetingData: MeetingRequestEmailData,
  approvers: ApproverInfo[]
): Promise<void> {
  const senderEmail = process.env.SMTP_USER;
  if (!senderEmail) {
    console.log('⚠️ Email skipped - SMTP_USER not configured');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login?redirect=/monitoring`;

  for (const approver of approvers) {
    const roleLabel = approver.role === 'head_dept' ? 'Head Department' : 'General Affairs';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Permintaan Ruang Meeting Baru</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
    .container { background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
    .info-box { background-color: #f8fafc; border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .info-row { display: flex; margin-bottom: 12px; font-size: 14px; }
    .info-label { font-weight: 600; color: #64748b; width: 140px; flex-shrink: 0; }
    .info-value { color: #1e293b; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; }
    .badge { display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #92400e; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Permintaan Ruang Meeting Baru</h1>
      <p>ID Permintaan: ${meetingData.requestId}</p>
    </div>
    <div class="content">
      <p class="greeting">Halo <strong>${approver.fullName}</strong>,</p>
      <p>Anda menerima permintaan peminjaman ruang meeting baru yang memerlukan persetujuan Anda sebagai <strong>${roleLabel}</strong>.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Nama Pemohon</span><span class="info-value">${meetingData.nama}</span></div>
        <div class="info-row"><span class="info-label">Department</span><span class="info-value">${meetingData.department}</span></div>
        <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value">${meetingData.whatsapp}</span></div>
        <div class="info-row"><span class="info-label">Tanggal</span><span class="info-value">${meetingData.hari}, ${meetingData.tanggal}</span></div>
        <div class="info-row"><span class="info-label">Waktu</span><span class="info-value">${meetingData.jamMulai} - ${meetingData.jamBerakhir}</span></div>
        <div class="info-row"><span class="info-label">Ruangan</span><span class="info-value">${meetingData.namaRuangan}</span></div>
        <div class="info-row"><span class="info-label">Jumlah Peserta</span><span class="info-value">${meetingData.jumlahPeserta} orang</span></div>
        <div class="info-row"><span class="info-label">Agenda</span><span class="info-value">${meetingData.agenda}</span></div>
        <div class="info-row"><span class="info-label">Fasilitas</span><span class="info-value">${meetingData.fasilitas}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge">⏳ Menunggu Persetujuan</span></span></div>
      </div>
      <p>Silakan klik tombol di bawah untuk login ke sistem dan melakukan <strong>Approve</strong> atau <strong>Reject</strong> permintaan ini.</p>
      <div class="btn-container"><a href="${loginUrl}" class="btn">✅ Lakukan Persetujuan</a></div>
      <p style="color: #64748b; font-size: 13px;">Setelah login, Anda akan diarahkan ke halaman Monitoring untuk melihat detail dan memberikan persetujuan.</p>
    </div>
    <div class="footer">
      <p>Email ini dikirim secara otomatis oleh sistem PRM-IMM.</p>
      <p>© ${new Date().getFullYear()} PT Indominco Mandiri - Meeting Room Management System</p>
    </div>
  </div>
</body>
</html>`;

    const subject = `PRM-${meetingData.nama}-${meetingData.agenda}`;

    try {
      console.log(`📧 Sending email...`);
      console.log(`   To: ${approver.email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Role: ${roleLabel}`);
      
      const info = await transporter.sendMail({
        from: `"General Affairs IMM" <${senderEmail}>`,
        to: approver.email,
        subject,
        html: htmlContent,
      });

      console.log(`✅ Email sent! Message ID: ${info.messageId}`);
      
      await logEmail({
        toEmail: approver.email,
        toName: approver.fullName,
        subject,
        emailType: 'meeting_request',
        status: 'sent',
        messageId: info.messageId,
      });
    } catch (error: any) {
      console.error(`❌ Failed to send email to ${approver.email}: ${error.message}`);
      
      await logEmail({
        toEmail: approver.email,
        toName: approver.fullName,
        subject,
        emailType: 'meeting_request',
        status: 'failed',
        errorMessage: error.message,
      });
    }
  }
}

/**
 * Send approval/rejection notification to the requester
 * NOTE: Disabled — pemohon (guest user) cek status langsung di halaman Calendar.
 * Tidak ada notifikasi email untuk approval/rejection.
 */
export async function sendApprovalNotification(
  _requesterEmail: string,
  _requesterName: string,
  _meetingData: MeetingRequestEmailData,
  _approverRole: 'head_dept' | 'ga',
  _action: 'approved' | 'rejected',
  _notes?: string
): Promise<void> {
  // Pemohon tidak mendapat email notifikasi.
  // Mereka harus cek status di halaman Calendar.
  console.log('ℹ️ Approval notification skipped — pemohon cek status di Calendar');
  return;
}



/**
 * Verify email connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    console.log('📧 Verifying email connection...');
    console.log(`   Host: ${process.env.SMTP_HOST || 'smtp.office365.com'}`);
    console.log(`   Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`   User: ${process.env.SMTP_USER || 'NOT SET'}`);
    
    await transporter.verify();
    console.log('✅ Email service connected');
    return true;
  } catch (error: any) {
    console.error('❌ Email service error:', error.message);
    return false;
  }
}

export default {
  sendMeetingRequestNotification,
  sendApprovalNotification,
  verifyEmailConnection,
};
