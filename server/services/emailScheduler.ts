import { storage } from '../storage';
import { mailProService } from './mailpro';
import { Meeting, MeetingTask, User } from '@shared/schema';

class EmailSchedulerService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('Email scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('📧 Starting email scheduler service');
    
    // Check for pending notifications every 5 minutes
    this.schedulerInterval = setInterval(() => {
      this.processPendingNotifications();
    }, 5 * 60 * 1000);

    // Process immediately on start
    this.processPendingNotifications();
  }

  stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log('📧 Email scheduler service stopped');
  }

  async processPendingNotifications() {
    try {
      const pendingNotifications = await storage.getPendingEmailNotifications();
      
      if (pendingNotifications.length === 0) {
        return;
      }

      console.log(`📧 Processing ${pendingNotifications.length} pending email notifications`);

      for (const notification of pendingNotifications) {
        try {
          await this.processNotification(notification);
        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);
          await storage.updateMeetingEmailNotificationStatus(
            notification.id, 
            'failed', 
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  private async processNotification(notification: any) {
    const meeting = await storage.getMeeting(notification.meetingId);
    if (!meeting) {
      console.error(`Meeting ${notification.meetingId} not found for notification ${notification.id}`);
      await storage.updateMeetingEmailNotificationStatus(notification.id, 'failed', 'Meeting not found');
      return;
    }

    const organizer = await storage.getUser(meeting.organizerId);
    if (!organizer) {
      console.error(`Organizer ${meeting.organizerId} not found for meeting ${meeting.id}`);
      await storage.updateMeetingEmailNotificationStatus(notification.id, 'failed', 'Organizer not found');
      return;
    }

    let emailTemplate;
    let recipients = [{ email: notification.recipientEmail }];

    switch (notification.type) {
      case 'invitation':
        const attendees = await this.getMeetingAttendees(meeting.id);
        emailTemplate = mailProService.generateMeetingInvitationTemplate(meeting, organizer, attendees);
        break;

      case 'reminder':
        const reminderType = this.determineReminderType(meeting.datetime, notification.scheduledAt);
        emailTemplate = mailProService.generateMeetingReminderTemplate(meeting, organizer, reminderType);
        break;

      case 'task_due':
      case 'task_assigned':
        const task = await this.findRelatedTask(notification);
        if (task) {
          const assignee = await storage.getUser(task.assignedToId);
          if (assignee) {
            emailTemplate = mailProService.generateTaskReminderTemplate(task, meeting, assignee);
          }
        }
        break;

      default:
        console.error(`Unknown notification type: ${notification.type}`);
        await storage.updateMeetingEmailNotificationStatus(notification.id, 'failed', 'Unknown notification type');
        return;
    }

    if (!emailTemplate) {
      console.error(`Failed to generate email template for notification ${notification.id}`);
      await storage.updateMeetingEmailNotificationStatus(notification.id, 'failed', 'Failed to generate email template');
      return;
    }

    const result = await mailProService.sendEmail({
      to: recipients,
      subject: emailTemplate.subject,
      htmlContent: emailTemplate.htmlContent,
      textContent: emailTemplate.textContent
    });

    if (result.success) {
      console.log(`✅ Email sent successfully for notification ${notification.id}`);
      await storage.updateMeetingEmailNotificationStatus(notification.id, 'sent');
    } else {
      console.error(`❌ Failed to send email for notification ${notification.id}:`, result.error);
      await storage.updateMeetingEmailNotificationStatus(notification.id, 'failed', result.error);
    }
  }

  private async getMeetingAttendees(meetingId: number) {
    try {
      const attendeeRecords = await storage.getMeetingAttendees(meetingId);
      const attendees = [];

      for (const attendeeRecord of attendeeRecords) {
        const user = await storage.getUser(attendeeRecord.userId);
        if (user) {
          attendees.push({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          });
        }
      }

      return attendees;
    } catch (error) {
      console.error('Error fetching meeting attendees:', error);
      return [];
    }
  }

  private determineReminderType(meetingTime: Date, scheduledTime: Date): 'day' | 'hour' {
    const timeDiff = new Date(meetingTime).getTime() - new Date(scheduledTime).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff > 12 ? 'day' : 'hour';
  }

  private async findRelatedTask(notification: any): Promise<MeetingTask | null> {
    try {
      const tasks = await storage.getMeetingTasks(notification.meetingId);
      // For now, return the first task. In a real implementation, 
      // you might store the task ID in the notification record
      return tasks.length > 0 ? tasks[0] : null;
    } catch (error) {
      console.error('Error finding related task:', error);
      return null;
    }
  }

  async scheduleInvitations(meeting: Meeting, attendeeEmails: string[]) {
    for (const email of attendeeEmails) {
      await storage.createMeetingEmailNotification({
        meetingId: meeting.id,
        type: 'invitation',
        recipientEmail: email,
        scheduledAt: new Date(), // Send immediately
        status: 'pending'
      });
    }
  }

  async scheduleReminders(meeting: Meeting, attendeeEmails: string[], reminderSettings?: any) {
    const defaultSettings = {
      daysBefore: [1, 7],
      hoursBefore: [2]
    };

    const settings = reminderSettings || defaultSettings;
    const meetingTime = new Date(meeting.datetime);

    // Schedule day-before reminders
    for (const days of settings.daysBefore) {
      const reminderTime = new Date(meetingTime.getTime() - (days * 24 * 60 * 60 * 1000));
      
      for (const email of attendeeEmails) {
        await storage.createMeetingEmailNotification({
          meetingId: meeting.id,
          type: 'reminder',
          recipientEmail: email,
          scheduledAt: reminderTime,
          status: 'pending'
        });
      }
    }

    // Schedule hour-before reminders
    for (const hours of settings.hoursBefore) {
      const reminderTime = new Date(meetingTime.getTime() - (hours * 60 * 60 * 1000));
      
      for (const email of attendeeEmails) {
        await storage.createMeetingEmailNotification({
          meetingId: meeting.id,
          type: 'reminder',
          recipientEmail: email,
          scheduledAt: reminderTime,
          status: 'pending'
        });
      }
    }
  }

  async scheduleTaskReminders(task: MeetingTask, assigneeEmail: string) {
    if (!task.dueDate) return;

    const dueDate = new Date(task.dueDate);
    const reminderTime = new Date(dueDate.getTime() - (24 * 60 * 60 * 1000)); // 1 day before

    await storage.createMeetingEmailNotification({
      meetingId: task.meetingId,
      type: 'task_due',
      recipientEmail: assigneeEmail,
      scheduledAt: reminderTime,
      status: 'pending'
    });
  }
}

export const emailSchedulerService = new EmailSchedulerService();
export { EmailSchedulerService };