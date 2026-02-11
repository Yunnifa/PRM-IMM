import { Resend } from 'resend';
import { db } from '../db';
import { emailLogs } from '../db/schema';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Check if email service is configured
const isEmailConfigured = () => {
  if (resend) {
    console.log('✅ Email service ready (Resend)');
    return true;
  }
  console.warn('⚠️ RESEND_API_KEY not set - emails will be disabled');
  return false;
};

// Log on startup
isEmailConfigured();

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
  if (!resend) {
    console.log('⚠️ Email skipped - RESEND_API_KEY not configured');
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
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .info-box {
      background-color: #f8fafc;
      border-left: 4px solid #4F46E5;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-row {
      display: flex;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 140px;
      flex-shrink: 0;
    }
    .info-value {
      color: #1e293b;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 40px;
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: #fef3c7;
      color: #92400e;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Permintaan Ruang Meeting Baru</h1>
      <p>ID Permintaan: ${meetingData.requestId}</p>
    </div>
    
    <div class="content">
      <p class="greeting">
        Halo <strong>${approver.fullName}</strong>,
      </p>
      
      <p>
        Anda menerima permintaan peminjaman ruang meeting baru yang memerlukan persetujuan Anda sebagai <strong>${roleLabel}</strong>.
      </p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Nama Pemohon</span>
          <span class="info-value">${meetingData.nama}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Department</span>
          <span class="info-value">${meetingData.department}</span>
        </div>
        <div class="info-row">
          <span class="info-label">WhatsApp</span>
          <span class="info-value">${meetingData.whatsapp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tanggal</span>
          <span class="info-value">${meetingData.hari}, ${meetingData.tanggal}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Waktu</span>
          <span class="info-value">${meetingData.jamMulai} - ${meetingData.jamBerakhir}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ruangan</span>
          <span class="info-value">${meetingData.namaRuangan}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Jumlah Peserta</span>
          <span class="info-value">${meetingData.jumlahPeserta} orang</span>
        </div>
        <div class="info-row">
          <span class="info-label">Agenda</span>
          <span class="info-value">${meetingData.agenda}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fasilitas</span>
          <span class="info-value">${meetingData.fasilitas}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value"><span class="badge">⏳ Menunggu Persetujuan</span></span>
        </div>
      </div>
      
      <p>
        Silakan klik tombol di bawah untuk login ke sistem dan melakukan <strong>Approve</strong> atau <strong>Reject</strong> permintaan ini.
      </p>
      
      <div class="btn-container">
        <a href="${loginUrl}" class="btn">
          🔐 Login & Review Permintaan
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 13px;">
        Setelah login, Anda akan diarahkan ke halaman Monitoring untuk melihat detail dan memberikan persetujuan.
      </p>
    </div>
    
    <div class="footer">
      <p>Email ini dikirim secara otomatis oleh sistem PRM-IMM.</p>
      <p>© ${new Date().getFullYear()} PT Indominco Mandiri - Meeting Room Management System</p>
    </div>
  </div>
</body>
</html>
    `;

    const subject = `PRM-${meetingData.nama}-${meetingData.agenda}`;

    try {
      console.log(`📧 Sending email via Resend...`);
      console.log(`   To: ${approver.email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Role: ${roleLabel}`);
      
      const { data, error } = await resend.emails.send({
        from: 'PRM-IMM <noreply@resend.dev>',
        to: approver.email,
        subject: subject,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Email sent successfully!`);
      console.log(`   Message ID: ${data?.id}`);
      
      // Log successful email to database
      await logEmail({
        toEmail: approver.email,
        toName: approver.fullName,
        subject: subject,
        emailType: 'meeting_request',
        status: 'sent',
        messageId: data?.id,
      });
    } catch (error: any) {
      console.error(`❌ Failed to send email to ${approver.email}`);
      console.error(`   Error: ${error.message}`);
      
      // Log failed email to database
      await logEmail({
        toEmail: approver.email,
        toName: approver.fullName,
        subject: subject,
        emailType: 'meeting_request',
        status: 'failed',
        errorMessage: error.message,
      });
      // Don't throw - continue sending to other approvers
    }
  }
}

/**
 * Send approval/rejection notification to the requester
 */
export async function sendApprovalNotification(
  requesterEmail: string,
  requesterName: string,
  meetingData: MeetingRequestEmailData,
  approverRole: 'head_dept' | 'ga',
  action: 'approved' | 'rejected',
  notes?: string
): Promise<void> {
  if (!resend) {
    console.log('⚠️ Email skipped - RESEND_API_KEY not configured');
    return;
  }

  const roleLabel = approverRole === 'head_dept' ? 'Head Department' : 'General Affairs';
  const actionLabel = action === 'approved' ? 'Disetujui' : 'Ditolak';
  const actionColor = action === 'approved' ? '#10b981' : '#ef4444';
  const actionEmoji = action === 'approved' ? '✅' : '❌';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update Status Permintaan Ruang Meeting</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: ${actionColor};
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      background-color: ${action === 'approved' ? '#d1fae5' : '#fee2e2'};
      color: ${actionColor};
      border-radius: 20px;
      font-weight: 600;
      margin: 10px 0;
    }
    .info-box {
      background-color: #f8fafc;
      border-left: 4px solid ${actionColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .notes-box {
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${actionEmoji} Permintaan ${actionLabel}</h1>
    </div>
    
    <div class="content">
      <p>Halo <strong>${requesterName}</strong>,</p>
      
      <p>
        Permintaan ruang meeting Anda dengan ID <strong>${meetingData.requestId}</strong> telah 
        <span class="status-badge">${actionLabel}</span> 
        oleh <strong>${roleLabel}</strong>.
      </p>
      
      <div class="info-box">
        <p><strong>Detail Permintaan:</strong></p>
        <p>📅 ${meetingData.hari}, ${meetingData.tanggal}</p>
        <p>⏰ ${meetingData.jamMulai} - ${meetingData.jamBerakhir}</p>
        <p>🏢 ${meetingData.namaRuangan}</p>
        <p>📋 ${meetingData.agenda}</p>
      </div>
      
      ${notes ? `
      <div class="notes-box">
        <p><strong>📝 Catatan dari ${roleLabel}:</strong></p>
        <p>${notes}</p>
      </div>
      ` : ''}
      
      <p style="color: #64748b; font-size: 13px;">
        ${action === 'approved' 
          ? 'Silakan pastikan Anda hadir tepat waktu dan menggunakan ruangan sesuai jadwal yang disetujui.'
          : 'Jika Anda ingin mengajukan ulang, silakan buat permintaan baru melalui sistem.'}
      </p>
    </div>
    
    <div class="footer">
      <p>Email ini dikirim secara otomatis oleh sistem PRM-IMM.</p>
      <p>© ${new Date().getFullYear()} PT Indominco Mandiri - Meeting Room Management System</p>
    </div>
  </div>
</body>
</html>
  `;

  const subject = `PRM-${meetingData.nama}-${meetingData.agenda} (${actionLabel})`;

  try {
    console.log(`📧 Sending approval notification via Resend...`);
    console.log(`   To: ${requesterEmail}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Action: ${action}`);
    
    const { data, error } = await resend.emails.send({
      from: 'PRM-IMM <noreply@resend.dev>',
      to: requesterEmail,
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`✅ Approval notification sent successfully!`);
    console.log(`   Message ID: ${data?.id}`);
    
    // Log successful email to database
    await logEmail({
      toEmail: requesterEmail,
      toName: requesterName,
      subject: subject,
      emailType: 'approval_notification',
      status: 'sent',
      messageId: data?.id,
    });
  } catch (error: any) {
    console.error(`❌ Failed to send approval notification to ${requesterEmail}`);
    console.error(`   Error: ${error.message}`);
    
    // Log failed email to database
    await logEmail({
      toEmail: requesterEmail,
      toName: requesterName,
      subject: subject,
      emailType: 'approval_notification',
      status: 'failed',
      errorMessage: error.message,
    });
  }
}

/**
 * Verify email service connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  if (!resend) {
    console.log('⚠️ Email service not configured - RESEND_API_KEY missing');
    return false;
  }
  
  console.log('✅ Resend email service configured');
  return true;
}

export default {
  sendMeetingRequestNotification,
  sendApprovalNotification,
  verifyEmailConnection,
};
