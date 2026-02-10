import nodemailer from 'nodemailer';
import 'dotenv/config';

// Test email configuration
async function testEmail() {
  console.log('🔧 Testing email configuration...\n');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || 'Generalaffairsimm@gmail.com',
      pass: process.env.SMTP_PASS || '',
    },
  });

  // Test email addresses - update these with actual Head Dept and GA emails
  const testRecipients = [
    { email: 'test@example.com', role: 'Head Department' },  // Replace with actual email
    // { email: 'ga@example.com', role: 'General Affairs' },   // Replace with actual GA email
  ];

  console.log('\n📧 Attempting to send test email...\n');

  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    const info = await transporter.sendMail({
      from: `"PT IMM - General Affairs" <${process.env.SMTP_USER}>`,
      to: testRecipients.map(r => r.email).join(', '),
      subject: '🧪 Test Email - PRM-IMM System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; }
            .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px; }
            .success { color: #22c55e; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🧪 Test Email</h1>
            </div>
            <p class="success">✅ Email berhasil terkirim!</p>
            <p>Ini adalah email test dari sistem <strong>PRM-IMM (Meeting Room Management)</strong>.</p>
            <p>Jika Anda menerima email ini, berarti konfigurasi SMTP sudah benar.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Dikirim dari: ${process.env.SMTP_USER}<br>
              Waktu: ${new Date().toLocaleString('id-ID')}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📨 Recipients:', testRecipients.map(r => r.email).join(', '));
    
  } catch (error: any) {
    console.error('❌ Email test failed!\n');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Kemungkinan penyebab:');
      console.log('1. Password salah atau bukan App Password');
      console.log('2. 2-Step Verification belum diaktifkan di Gmail');
      console.log('3. App Password belum dibuat\n');
      console.log('Cara membuat App Password:');
      console.log('1. Buka https://myaccount.google.com/security');
      console.log('2. Aktifkan 2-Step Verification');
      console.log('3. Kembali ke Security > App passwords');
      console.log('4. Generate password untuk "Mail"');
      console.log('5. Update SMTP_PASS di .env dengan App Password tersebut');
    }
  }
}

testEmail();
