import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { db } from '../db';
import { emailLogs } from '../db/schema';

// Gmail API OAuth2 configuration
const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client for Gmail API
const createOAuth2Client = () => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  
  const oauth2Client = new OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );
  
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  
  return oauth2Client;
};

// Create transporter - prefer Gmail API OAuth2, fallback to SMTP
const createTransporter = async () => {
  const oauth2Client = createOAuth2Client();
  const userEmail = process.env.SMTP_USER || 'Generalaffairsimm@gmail.com';
  
  // Try Gmail API with OAuth2 first
  if (oauth2Client) {
    try {
      const accessToken = await oauth2Client.getAccessToken();
      
      if (accessToken.token) {
        console.log('🔐 Using Gmail API with OAuth2');
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: userEmail,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: accessToken.token,
          },
        });
      }
    } catch (err: any) {
      console.error('⚠️ OAuth2 failed, falling back to SMTP:', err.message);
    }
  }
  
  // Fallback to SMTP
  console.log('📧 Using SMTP with App Password');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: userEmail,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

// Initialize transporter
let transporter: nodemailer.Transporter | null = null;

const initTransporter = async () => {
  try {
    transporter = await createTransporter();
    await transporter.verify();
    console.log('✅ Email transporter ready');
    return true;
  } catch (err: any) {
    console.error('❌ Email transporter error:', err.message);
    return false;
  }
};

// Initialize on startup
initTransporter();

// Get transporter (reinitialize if needed for OAuth2 token refresh)
const getTransporter = async () => {
  if (!transporter) {
    await initTransporter();
  }
  return transporter;
};

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
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
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
      <p>© ${new Date().getFullYear()} PT Banpu Indo - Meeting Room Management System</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"PRM-IMM System" <${process.env.SMTP_USER || 'Generalaffairsimm@gmail.com'}>`,
      to: approver.email,
      subject: `PRM-${meetingData.nama}-${meetingData.agenda}`,
      html: htmlContent,
    };

    try {
      console.log(`📧 Sending email...`);
      console.log(`   From: ${mailOptions.from}`);
      console.log(`   To: ${mailOptions.to}`);
      console.log(`   Subject: ${mailOptions.subject}`);
      console.log(`   Role: ${roleLabel}`);
      
      const emailTransporter = await getTransporter();
      if (!emailTransporter) throw new Error('Email transporter not initialized');
      const info = await emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully!`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response: ${info.response}`);
      
      // Log successful email to database
      await logEmail({
        toEmail: approver.email,
        toName: approver.fullName,
        subject: mailOptions.subject,
        emailType: 'meeting_request',
        status: 'sent',
        messageId: info.messageId,
      });
    } catch (error: any) {
      console.error(`❌ Failed to send email to ${approver.email}`);
      console.error(`   Error Code: ${error.code || 'N/A'}`);
      console.error(`   Error Message: ${error.message}`);
      
      // Log failed email to database
      await logEmail({
        toEmail: approver.email,
        toName: approver.fullName,
        subject: mailOptions.subject,
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
      <p>© ${new Date().getFullYear()} PT Banpu Indo - Meeting Room Management System</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"PRM-IMM System" <${process.env.SMTP_USER || 'Generalaffairsimm@gmail.com'}>`,
    to: requesterEmail,
    subject: `PRM-${meetingData.nama}-${meetingData.agenda} (${actionLabel})`,
    html: htmlContent,
  };

  try {
    console.log(`📧 Sending approval notification...`);
    console.log(`   To: ${requesterEmail}`);
    console.log(`   Subject: ${mailOptions.subject}`);
    console.log(`   Action: ${action}`);
    
    const emailTransporter = await getTransporter();
    if (!emailTransporter) throw new Error('Email transporter not initialized');
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Approval notification sent successfully!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    
    // Log successful email to database
    await logEmail({
      toEmail: requesterEmail,
      toName: requesterName,
      subject: mailOptions.subject,
      emailType: 'approval_notification',
      status: 'sent',
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error(`❌ Failed to send approval notification to ${requesterEmail}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    console.error(`   Error Message: ${error.message}`);
    
    // Log failed email to database
    await logEmail({
      toEmail: requesterEmail,
      toName: requesterName,
      subject: mailOptions.subject,
      emailType: 'approval_notification',
      status: 'failed',
      errorMessage: error.message,
    });
  }
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    console.log('📧 Verifying email connection...');
    console.log(`   SMTP User: ${process.env.SMTP_USER || 'Generalaffairsimm@gmail.com'}`);
    console.log(`   OAuth2: ${process.env.GMAIL_CLIENT_ID ? 'Configured' : 'Not configured'}`);
    console.log(`   SMTP Pass: ${process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'Not set'}`);
    
    const emailTransporter = await getTransporter();
    if (!emailTransporter) {
      throw new Error('Email transporter not initialized');
    }
    await emailTransporter.verify();
    console.log('✅ Email service connected successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Email service connection failed');
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    console.error(`   Error Message: ${error.message}`);
    return false;
  }
}

export default {
  sendMeetingRequestNotification,
  sendApprovalNotification,
  verifyEmailConnection,
};
