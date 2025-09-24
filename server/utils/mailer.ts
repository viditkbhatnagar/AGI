// server/utils/mailer.ts
import nodemailer from 'nodemailer';

// Helper function to create email transporter (same as existing controllers)
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
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
  const transporter = createEmailTransporter();
  
  // Send to each recipient (following the pattern from live class controller)
  const emailPromises = to.map(recipient => 
    transporter.sendMail({
      from: process.env.SMTP_FROM || '"American Global Institute" <no-reply@agi.online>',
      to: recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
      subject,
      html: htmlContent,
    })
  );

  return Promise.all(emailPromises);
}