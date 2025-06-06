import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Create SMTP transporter using MailPro credentials
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.mailpro.com',
    port: 587, // STARTTLS port
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.MAILPRO_USER,
      pass: process.env.MAILPRO_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export async function sendEmail({ to, subject, html, from = 'colter@mahluminnovations.com' }: EmailOptions) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: from,
      to: to,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to} via MailPro SMTP`);
    console.log(`Message ID: ${result.messageId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

export function generatePasswordResetEmail(resetLink: string, userFirstName?: string) {
  const userName = userFirstName || 'User';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - TIER IV PRO</title>
    <style>
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #ffffff;
            background-color: #1f2937;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .container {
            background-color: #1f2937;
            border-radius: 8px;
            padding: 40px;
            border: 1px solid #374151;
        }
        
        .header {
            text-align: center;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        
        .logo {
            font-size: 48px;
            font-weight: bold;
            font-family: sans-serif;
            margin-bottom: 8px;
            line-height: 1;
        }
        
        .logo .tier {
            color: #ffffff;
        }
        
        .logo .iv {
            background: linear-gradient(90deg, #fbbf24, #f59e0b, #f59e0b, #fbbf24);
            background-size: 200% 200%;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 2s ease-in-out infinite;
        }
        
        .logo .pro {
            font-size: 16px;
            vertical-align: top;
            margin-left: 4px;
            background: linear-gradient(90deg, #d1d5db, #f3f4f6, #d1d5db);
            background-size: 200% 200%;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 2s ease-in-out infinite;
        }
        
        .tagline {
            color: #9ca3af;
            font-size: 14px;
            margin-top: 8px;
        }
        
        .content {
            color: #e5e7eb;
        }
        
        .content h2 {
            color: #ffffff;
            margin-bottom: 20px;
        }
        
        .reset-button {
            display: inline-block;
            background-color: #3b82f6;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
            transition: background-color 0.2s;
        }
        
        .reset-button:hover {
            background-color: #2563eb;
        }
        
        .info-box {
            background-color: #374151;
            border: 1px solid #4b5563;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        
        .info-box p {
            margin: 0 0 8px 0;
            color: #ffffff;
        }
        
        .info-box ul {
            margin: 8px 0 0 0;
            padding-left: 20px;
            color: #d1d5db;
        }
        
        .link-text {
            word-break: break-all;
            color: #60a5fa;
            background-color: #374151;
            padding: 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #374151;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
        }
        
        .warning {
            color: #fca5a5;
            font-weight: 600;
            background-color: #374151;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #ef4444;
        }
        
        .center {
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span class="tier">TIER</span><span class="iv">IV</span><span class="pro">PRO</span>
            </div>
            <div class="tagline">Advanced Manufacturing Scheduling Platform</div>
        </div>
        
        <div class="content">
            <h2>Password Reset Request</h2>
            
            <p>Hello ${userName},</p>
            
            <p>We received a request to reset your password for your TIER IV PRO account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <div class="center">
                <a href="${resetLink}" class="reset-button">Reset Your Password</a>
            </div>
            
            <div class="info-box">
                <p><strong>Important Security Information:</strong></p>
                <ul>
                    <li>This link will expire in 1 hour for security reasons</li>
                    <li>You can only use this link once</li>
                    <li>If the link has expired, request a new password reset</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-text">${resetLink}</div>
            
            <div class="warning">
                If you didn't request this password reset, please contact your system administrator immediately.
            </div>
            
            <p>Best regards,<br>
            The TIER IV PRO Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from TIER IV PRO Manufacturing Scheduling Platform.</p>
            <p>© ${new Date().getFullYear()} Mahlum Innovations. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}