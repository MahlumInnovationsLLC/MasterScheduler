import { MailService } from '@sendgrid/mail';

// Initialize SendGrid with API key
const mailService = new MailService();

// Check for both possible API key names (NOMAD_SENDGRID_API_KEY is the one provided by user)
const apiKey = process.env.NOMAD_SENDGRID_API_KEY || process.env.SENDGRID_API_KEY || '';
if (apiKey) {
  console.log('SendGrid API key found, email service initialized');
} else {
  console.warn('No SendGrid API key found. Email functionality will not work.');
}
mailService.setApiKey(apiKey);

export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Sends an email using SendGrid
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Check if we have either SendGrid API key
  if (!process.env.NOMAD_SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY) {
    console.log('No SendGrid API key found. Email would have been sent to:', params.to);
    console.log('Subject:', params.subject);
    console.log('Content:', params.text || params.html);
    return false;
  }

  try {
    // Debug log to see what's happening with the email attempt
    console.log(`Attempting to send email to ${params.to} using SendGrid`);
    
    // For password reset emails, we need to disable click tracking
    // so the reset link isn't transformed by SendGrid
    await mailService.send({
      to: params.to,
      from: 'colter@mahluminnovations.com', // Verified sender
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false
        },
        openTracking: {
          enable: false
        },
        subscriptionTracking: {
          enable: false
        }
      }
    });
    console.log(`Email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string,
  appUrl: string
): Promise<boolean> {
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
  
  const subject = 'Nomad GCS Project Management - Password Reset';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="margin-bottom: 20px;">
        <span style="color: #3b82f6; font-weight: bold; font-size: 24px;">TIER<span style="color: #7c3aed;">IV</span><sup style="font-size: 10px; margin-left: 2px;">PRO</sup></span>
      </div>
      <h2 style="color: #333366;">Reset Your Password</h2>
      <p>You are receiving this email because we received a password reset request for your account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #333366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
      <p>If you did not request a password reset, no further action is required.</p>
      <p>This password reset link is only valid for the next 60 minutes.</p>
      <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Nomad GCS Project Management System</p>
    </div>
  `;
  
  const text = `
    Reset Your Password
    
    You are receiving this email because we received a password reset request for your account.
    
    Visit the following link to reset your password:
    ${resetUrl}
    
    If you did not request a password reset, no further action is required.
    
    This password reset link is only valid for the next 60 minutes.
    
    Nomad GCS Project Management System
  `;
  
  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
}