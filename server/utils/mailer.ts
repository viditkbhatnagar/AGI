// server/utils/mailer.ts
import nodemailer from 'nodemailer';
import path from 'path';

// Helper function to create email transporter (same as existing controllers)
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function sendEmail(
  to: { email: string; name?: string }[],
  subject: string,
  htmlContent: string
) {
  console.log('🔧 Email configuration check:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('Recipients:', to);
  
  const transporter = createEmailTransporter();
  
  // Send to each recipient (following the pattern from live class controller)
  const emailPromises = to.map(async (recipient) => {
    console.log(`📤 Sending email to: ${recipient.email}`);
    
    try {
      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"American Global Institute" <no-reply@agi.online>',
        to: recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
        subject,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            path: path.resolve('client/src/components/layout/AGI Logo.png'),
            cid: 'agiLogo',
          },
        ],
      });
      
      console.log(`✅ Email sent successfully to ${recipient.email}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${recipient.email}:`, error);
      throw error;
    }
  });

  return Promise.all(emailPromises);
}