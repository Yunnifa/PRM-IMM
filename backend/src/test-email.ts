import { Resend } from 'resend';
import 'dotenv/config';

// Test email configuration
async function testEmail() {
  console.log('🔧 Testing Resend email configuration...\n');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 're_****' + process.env.RESEND_API_KEY.slice(-4) : 'NOT SET');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('\n❌ RESEND_API_KEY is not set!');
    console.log('\nTo fix this:');
    console.log('1. Go to https://resend.com and sign up (free)');
    console.log('2. Create an API key at https://resend.com/api-keys');
    console.log('3. Set RESEND_API_KEY in your .env file or Railway variables');
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Test email - will be sent from Resend's test domain
  const testEmail = 'delivered@resend.dev'; // Resend test email that always succeeds

  console.log('\n📧 Attempting to send test email...\n');

  try {
    const { data, error } = await resend.emails.send({
      from: 'PRM-IMM <onboarding@resend.dev>',
      to: testEmail,
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
            <p class="success">✅ Email configuration is working!</p>
            <p>This is a test email from the PRM-IMM Meeting Room Management System.</p>
            <p>If you received this email, your Resend configuration is working correctly.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Sent at: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${data?.id}`);
    console.log(`   To: ${testEmail}`);
    console.log('\n🎉 Resend is configured correctly!');
    
  } catch (error: any) {
    console.error('\n❌ Failed to send test email');
    console.error(`   Error: ${error.message}`);
    console.log('\nPossible issues:');
    console.log('1. Invalid API key - check your RESEND_API_KEY');
    console.log('2. API key permissions - ensure it has send access');
    process.exit(1);
  }
}

testEmail();
