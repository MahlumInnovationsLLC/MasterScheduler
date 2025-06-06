import axios from 'axios';

interface MailProConfig {
  apiUrl: string;
  username: string;
  password: string;
}

interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailData {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

class MailProService {
  private config: MailProConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      apiUrl: process.env.MAILPRO_API_URL || 'https://api.mailpro.com/v1',
      username: process.env.MAILPRO_USERNAME || '',
      password: process.env.MAILPRO_PASSWORD || ''
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.config.apiUrl}/oauth/token`, 
        new URLSearchParams({
          'grant_type': 'password',
          'username': this.config.username,
          'password': this.config.password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
      
      return this.accessToken;
    } catch (error) {
      console.error('MailPro authentication failed:', error);
      throw new Error('Failed to authenticate with MailPro API');
    }
  }

  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const token = await this.getAccessToken();
      
      const payload = {
        to: emailData.to.map(recipient => ({
          email: recipient.email,
          name: recipient.name || recipient.email
        })),
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        textContent: emailData.textContent || this.stripHtml(emailData.htmlContent),
        sender: {
          name: process.env.MAILPRO_SENDER_NAME || 'Nomad GCS Meetings',
          email: process.env.MAILPRO_SENDER_EMAIL || 'meetings@nomadgcs.com'
        }
      };

      if (emailData.cc?.length) {
        payload.cc = emailData.cc.map(recipient => ({
          email: recipient.email,
          name: recipient.name || recipient.email
        }));
      }

      if (emailData.bcc?.length) {
        payload.bcc = emailData.bcc.map(recipient => ({
          email: recipient.email,
          name: recipient.name || recipient.email
        }));
      }

      const response = await axios.post(`${this.config.apiUrl}/smtp/email`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messageId || response.data.id
      };
    } catch (error: any) {
      console.error('MailPro send email failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send email'
      };
    }
  }

  generateMeetingInvitationTemplate(meeting: any, organizer: any, attendees: any[]): EmailTemplate {
    const meetingDate = new Date(meeting.scheduledTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const meetingTime = new Date(meeting.scheduledTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const subject = `Meeting Invitation: ${meeting.title}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .meeting-details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .btn { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .agenda-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Invitation</h1>
            <h2>${meeting.title}</h2>
          </div>
          <div class="content">
            <div class="meeting-details">
              <h3>Meeting Details</h3>
              <p><strong>Date:</strong> ${meetingDate}</p>
              <p><strong>Time:</strong> ${meetingTime}</p>
              <p><strong>Duration:</strong> ${meeting.duration || 60} minutes</p>
              <p><strong>Location:</strong> ${meeting.location || 'TBD'}</p>
              <p><strong>Organizer:</strong> ${organizer.firstName} ${organizer.lastName}</p>
            </div>
            
            ${meeting.description ? `
              <div class="meeting-details">
                <h3>Description</h3>
                <p>${meeting.description}</p>
              </div>
            ` : ''}
            
            ${meeting.agenda ? `
              <div class="meeting-details">
                <h3>Agenda</h3>
                ${JSON.parse(meeting.agenda).map((item: string) => 
                  `<div class="agenda-item">${item}</div>`
                ).join('')}
              </div>
            ` : ''}
            
            <div class="meeting-details">
              <h3>Attendees</h3>
              <ul>
                ${attendees.map(attendee => 
                  `<li>${attendee.firstName} ${attendee.lastName} (${attendee.email})</li>`
                ).join('')}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/meetings/${meeting.id}" class="btn">View Meeting Details</a>
            </div>
            
            <p><small>This is an automated message from Nomad GCS Meeting System.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      subject,
      htmlContent,
      textContent: this.stripHtml(htmlContent)
    };
  }

  generateMeetingReminderTemplate(meeting: any, organizer: any, reminderType: 'day' | 'hour'): EmailTemplate {
    const timeUntil = reminderType === 'day' ? '24 hours' : '2 hours';
    const subject = `Reminder: Meeting "${meeting.title}" in ${timeUntil}`;
    
    const meetingDate = new Date(meeting.scheduledTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const meetingTime = new Date(meeting.scheduledTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #fef3c7; padding: 20px; border-radius: 0 0 8px 8px; }
          .meeting-details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .btn { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Meeting Reminder</h1>
            <h2>${meeting.title}</h2>
          </div>
          <div class="content">
            <p><strong>Don't forget!</strong> You have a meeting coming up in ${timeUntil}.</p>
            
            <div class="meeting-details">
              <h3>Meeting Details</h3>
              <p><strong>Date:</strong> ${meetingDate}</p>
              <p><strong>Time:</strong> ${meetingTime}</p>
              <p><strong>Duration:</strong> ${meeting.duration || 60} minutes</p>
              <p><strong>Location:</strong> ${meeting.location || 'TBD'}</p>
              <p><strong>Organizer:</strong> ${organizer.firstName} ${organizer.lastName}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/meetings/${meeting.id}" class="btn">View Meeting Details</a>
            </div>
            
            <p><small>This is an automated reminder from Nomad GCS Meeting System.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      subject,
      htmlContent,
      textContent: this.stripHtml(htmlContent)
    };
  }

  generateTaskReminderTemplate(task: any, meeting: any, assignee: any): EmailTemplate {
    const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'No due date set';

    const subject = `Task Reminder: "${task.description}"`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #fee2e2; padding: 20px; border-radius: 0 0 8px 8px; }
          .task-details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .btn { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .priority-${task.priority} { 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.875rem;
            font-weight: bold;
          }
          .priority-high { background-color: #fecaca; color: #991b1b; }
          .priority-medium { background-color: #fed7aa; color: #9a3412; }
          .priority-low { background-color: #dcfce7; color: #166534; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Task Reminder</h1>
          </div>
          <div class="content">
            <p><strong>You have a task that needs attention!</strong></p>
            
            <div class="task-details">
              <h3>Task Details</h3>
              <p><strong>Description:</strong> ${task.description}</p>
              <p><strong>Due Date:</strong> ${dueDateStr}</p>
              <p><strong>Priority:</strong> <span class="priority-${task.priority}">${task.priority.toUpperCase()}</span></p>
              <p><strong>Status:</strong> ${task.status}</p>
              <p><strong>From Meeting:</strong> ${meeting.title}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/meetings/${meeting.id}" class="btn">View Task Details</a>
            </div>
            
            <p><small>This is an automated reminder from Nomad GCS Meeting System.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      subject,
      htmlContent,
      textContent: this.stripHtml(htmlContent)
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const mailProService = new MailProService();
export { MailProService, EmailTemplate, EmailRecipient, EmailData };