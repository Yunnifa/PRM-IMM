import nodemailer from 'nodemailer';
import 'dotenv/config';

async function testEmail() {
  console.log('🔧 Testing Office 365 SMTP email configuration...\n');

  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   User: ${user || 'NOT SET'}`);
  console.log(`   Pass: ${pass ? '****' : 'NOT SET'}`);

  if (!user || !pass) {
    console.error('\n❌ SMTP_USER or SMTP_PASS is not set!');
    console.log('\nSet these in your .env file:');
    console.log('  SMTP_HOST=smtp.office365.com');
    console.log('  SMTP_PORT=587');
    console.log('  SMTP_USER=your-email@banpuindo.co.id');
    console.log('  SMTP_PASS=your-password');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });

  console.log('\n📧 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');
  } catch (err: any) {
    console.error(`❌ SMTP verify failed: ${err.message}`);
    process.exit(1);
  }

  console.log('📧 Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: `"General Affairs IMM" <${user}>`,
      to: user, // send to self
      subject: `🧪 Test Email - PRM-IMM System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; text-align: center;">
            <h1>🧪 Test Email</h1>
          </div>
          <div style="padding: 20px;">
            <p style="color: #22c55e; font-size: 24px;">✅ Email configuration is working!</p>
            <p>This is a test email from the PRM-IMM Meeting Room Management System.</p>
            <p>Your Office 365 SMTP configuration is working correctly.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Sent at: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </p>
          </div>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${user}`);
    console.log('\n🎉 Office 365 SMTP is configured correctly!');
  } catch (error: any) {
    console.error(`\n❌ Failed to send: ${error.message}`);
    console.log('\nPossible issues:');
    console.log('1. Wrong password');
    console.log('2. Account security blocking SMTP');
    console.log('3. SMTP AUTH not enabled for the mailbox');
    process.exit(1);
  }
}

testEmail();
