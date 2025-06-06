interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from = 'noreply@nomadgcs.com' }: EmailOptions) {
  try {
    const apiKey = process.env.NOMAD_MAILPRO_API_KEY;
    const apiEndpoint = process.env.NOMAD_MAILPRO_API_ENDPOINT;
    
    if (!apiKey) {
      throw new Error('NOMAD_MAILPRO_API_KEY is not configured');
    }

    if (!apiEndpoint) {
      throw new Error('NOMAD_MAILPRO_API_ENDPOINT is not configured');
    }

    // Use fetch to make HTTP request to NOMAD_MAILPRO API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Email service error: ${response.status} - ${errorData}`);
    }

    console.log(`📧 Email sent successfully to ${to} via NOMAD_MAILPRO`);
    return { success: true };
  } catch (error) {
    console.error('📧 Email sending failed:', error);
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
    <title>Password Reset - NOMAD Manufacturing</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #3b82f6;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        .tagline {
            color: #64748b;
            font-size: 14px;
        }
        .content {
            padding: 0 20px;
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
        }
        .reset-button:hover {
            background-color: #2563eb;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
        .warning {
            color: #dc2626;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">NOMAD Manufacturing</div>
        <div class="tagline">Advanced Manufacturing Scheduling Platform</div>
    </div>
    
    <div class="content">
        <h2>Password Reset Request</h2>
        
        <p>Hello ${userName},</p>
        
        <p>We received a request to reset your password for your NOMAD Manufacturing account. If you didn't make this request, you can safely ignore this email.</p>
        
        <p>To reset your password, click the button below:</p>
        
        <div style="text-align: center;">
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
        <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
        
        <p class="warning">If you didn't request this password reset, please contact your system administrator immediately.</p>
        
        <p>Best regards,<br>
        The NOMAD Manufacturing Team</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message from NOMAD Manufacturing Scheduling Platform.</p>
        <p>© ${new Date().getFullYear()} NOMAD GCS. All rights reserved.</p>
    </div>
</body>
</html>
  `;
}