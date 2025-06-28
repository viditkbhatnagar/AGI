import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { renderContactFormHtml } from '../utils/emailTemplates';

interface ContactFormData {
  supportType: string;
  name: string;
  email: string;
  message: string;
}

// Helper function to create email transporter (same as live class controller)
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

export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const { supportType, name, email, message }: ContactFormData = req.body;

    // Validate required fields
    if (!supportType || !name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: supportType, name, email, message'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate support type
    const validSupportTypes = ['technical', 'course', 'billing', 'other'];
    if (!validSupportTypes.includes(supportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid support type'
      });
    }

    // Create email content
    const submittedAt = new Date();
    const emailContent = renderContactFormHtml({
      supportType,
      name,
      email,
      message,
      submittedAt
    });

    // Email subject based on support type
    const subjectMap = {
      technical: 'Technical Support Request',
      course: 'Course Content Inquiry', 
      billing: 'Billing/Enrollment Request',
      other: 'General Inquiry'
    };
    
    const subject = `[Contact Form] ${subjectMap[supportType as keyof typeof subjectMap]} - ${name}`;

    // Create plain text version for email
    const plainTextMessage = `
New Contact Form Submission

Support Type: ${subjectMap[supportType as keyof typeof subjectMap]}
Name: ${name}
Email: ${email}
Submitted: ${submittedAt.toLocaleString()}

Message:
${message}

Please respond to this inquiry promptly.
You can reply directly to ${email}.
    `.trim();

    // Send email using Nodemailer (same as live class emails)
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'intern@learnersuae.com',
      subject: subject,
      text: plainTextMessage,
      html: emailContent,
    });

    // Log the submission
    console.log(`✅ Contact form submitted by ${name} (${email}) - Type: ${supportType}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We\'ll get back to you as soon as possible.'
    });

  } catch (error) {
    console.error('❌ Error submitting contact form:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      message: 'Failed to send your message. Please try again or contact us directly.'
    });
  }
}; 