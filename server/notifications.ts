import { Request, Response } from 'express';
import { storage } from './storage';
import { InsertNotification } from '@shared/schema';

// Get notifications for a specific user
export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id || null;
    const { unreadOnly, limit } = req.query;

    const options = {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit as string) : undefined
    };

    // Get all notifications first
    const allNotifications = await storage.getNotifications(userId, options);
    
    // If userId is null or we're in admin mode, return all notifications
    if (!userId || (req.user as any)?.role === 'admin') {
      return res.json(allNotifications);
    }
    
    // Get user preferences to filter notifications
    const userPreferences = await storage.getUserPreferences(userId);
    
    // If no preferences exist, return all notifications
    if (!userPreferences) {
      return res.json(allNotifications);
    }
    
    // Filter notifications based on user preferences and department
    const filteredNotifications = allNotifications.filter(notification => {
      // Check if this user's department should receive this notification type
      const userDepartment = userPreferences.department || '';
      
      // Global/system notifications are always shown unless explicitly disabled
      if (notification.type === 'system') {
        return userPreferences.notifySystemUpdates !== false;
      }
      
      // Billing notifications - finance department always gets these regardless of preferences
      if (notification.type === 'billing') {
        if (userDepartment === 'finance') {
          return true; // Finance department always gets billing notifications
        }
        return userPreferences.notifyBillingUpdates !== false;
      }
      
      // Manufacturing notifications - manufacturing department always gets these
      if (notification.type === 'manufacturing') {
        if (userDepartment === 'manufacturing' || userDepartment === 'quality_control') {
          return true; // Manufacturing and QC departments always get manufacturing notifications
        }
        return userPreferences.notifyManufacturingUpdates !== false;
      }
      
      // Project notifications - project_management department always gets these
      if (notification.type === 'project') {
        if (userDepartment === 'project_management') {
          return true; // Project management department always gets project notifications
        }
        return userPreferences.notifyProjectUpdates !== false;
      }
      
      // If the notification type doesn't match any of the above, show it
      return true;
    });
    
    res.json(filteredNotifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

// Mark a notification as read
export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await storage.markNotificationAsRead(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
}

// Mark all notifications as read for the current user
export async function markAllNotificationsAsRead(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const success = await storage.markAllNotificationsAsRead(userId);
    if (success) {
      res.json({ message: 'All notifications marked as read' });
    } else {
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
}

// Delete a notification
export async function deleteNotification(req: Request, res: Response) {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const success = await storage.deleteNotification(notificationId);
    if (success) {
      res.json({ message: 'Notification deleted' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Failed to delete notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
}

// Get unread notification count for the current user
export async function getUnreadNotificationCount(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // If admin, return total count
    if ((req.user as any)?.role === 'admin') {
      const count = await storage.getUnreadNotificationCount(userId);
      return res.json({ count });
    }
    
    // Get user preferences to filter notifications
    const userPreferences = await storage.getUserPreferences(userId);
    
    // If no preferences exist, return all unread notifications count
    if (!userPreferences) {
      const count = await storage.getUnreadNotificationCount(userId);
      return res.json({ count });
    }
    
    // Get all notifications for this user
    const notifications = await storage.getNotifications(userId, { unreadOnly: true });
    
    // Filter notifications based on user preferences and department
    const filteredNotifications = notifications.filter(notification => {
      // Check if this user's department should receive this notification type
      const userDepartment = userPreferences.department || '';
      
      // Global/system notifications are always shown unless explicitly disabled
      if (notification.type === 'system') {
        return userPreferences.notifySystemUpdates !== false;
      }
      
      // Billing notifications - finance department always gets these regardless of preferences
      if (notification.type === 'billing') {
        if (userDepartment === 'finance') {
          return true; // Finance department always gets billing notifications
        }
        return userPreferences.notifyBillingUpdates !== false;
      }
      
      // Manufacturing notifications - manufacturing department always gets these
      if (notification.type === 'manufacturing') {
        if (userDepartment === 'manufacturing' || userDepartment === 'quality_control') {
          return true; // Manufacturing and QC departments always get manufacturing notifications
        }
        return userPreferences.notifyManufacturingUpdates !== false;
      }
      
      // Project notifications - project_management department always gets these
      if (notification.type === 'project') {
        if (userDepartment === 'project_management') {
          return true; // Project management department always gets project notifications
        }
        return userPreferences.notifyProjectUpdates !== false;
      }
      
      // If the notification type doesn't match any of the above, show it
      return true;
    });
    
    res.json({ count: filteredNotifications.length });
  } catch (error) {
    console.error('Failed to get unread notification count:', error);
    res.status(500).json({ message: 'Failed to get unread notification count' });
  }
}

// Create notification for testing purposes (typically notifications are created by system events)
export async function createNotification(req: Request, res: Response) {
  try {
    const notification = req.body as InsertNotification;
    const createdNotification = await storage.createNotification(notification);
    res.status(201).json(createdNotification);
  } catch (error) {
    console.error('Failed to create notification:', error);
    res.status(500).json({ message: 'Failed to create notification' });
  }
}

// Generate notifications for upcoming billing milestones
export async function generateBillingNotifications() {
  try {
    const milestones = await storage.getBillingMilestones();
    const today = new Date();
    
    // Get upcoming milestones due in the next 7 days
    const upcomingMilestones = milestones.filter(milestone => {
      if (milestone.status !== 'upcoming') return false;
      
      const targetDate = new Date(milestone.targetInvoiceDate);
      const timeDiff = targetDate.getTime() - today.getTime();
      const daysDiff = timeDiff / (1000 * 3600 * 24);
      
      return daysDiff >= 0 && daysDiff <= 7;
    });
    
    // Create notifications for upcoming milestones
    for (const milestone of upcomingMilestones) {
      const targetDate = new Date(milestone.targetInvoiceDate);
      const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      // Get the project
      const project = await storage.getProject(milestone.projectId);
      if (!project) continue;
      
      // Check if notification already exists
      const existingNotifications = await storage.getNotifications(undefined, { limit: 100 });
      const exists = existingNotifications.some(n => 
        n.relatedMilestoneId === milestone.id && 
        !n.isRead &&
        n.type === 'billing'
      );
      
      if (!exists) {
        await storage.createNotification({
          title: `Billing milestone due ${daysDiff <= 1 ? 'today' : `in ${daysDiff} days`}`,
          message: `${milestone.name} for ${project.name} (${project.projectNumber}) is due on ${new Date(milestone.targetInvoiceDate).toLocaleDateString()}. Amount: $${Number(milestone.amount).toLocaleString()}`,
          type: 'billing',
          priority: daysDiff <= 1 ? 'high' : daysDiff <= 3 ? 'medium' : 'low',
          userId: null, // Send to all users
          relatedMilestoneId: milestone.id,
          relatedProjectId: project.id,
          link: `/billing/${milestone.id}`
        });
      }
    }
    
    return upcomingMilestones.length;
  } catch (error) {
    console.error('Failed to generate billing notifications:', error);
    return 0;
  }
}

// Generate notifications for manufacturing schedules starting soon
export async function generateManufacturingNotifications() {
  try {
    const schedules = await storage.getManufacturingSchedules();
    const today = new Date();
    
    // Get upcoming schedules starting in the next 3 days
    const upcomingSchedules = schedules.filter(schedule => {
      if (schedule.status !== 'scheduled') return false;
      
      const startDate = new Date(schedule.startDate);
      const timeDiff = startDate.getTime() - today.getTime();
      const daysDiff = timeDiff / (1000 * 3600 * 24);
      
      return daysDiff >= 0 && daysDiff <= 3;
    });
    
    // Create notifications for upcoming schedules
    for (const schedule of upcomingSchedules) {
      const startDate = new Date(schedule.startDate);
      const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      // Get the project and bay
      const project = await storage.getProject(schedule.projectId);
      const bay = await storage.getManufacturingBay(schedule.bayId);
      if (!project || !bay) continue;
      
      // Check if notification already exists
      const existingNotifications = await storage.getNotifications(undefined, { limit: 100 });
      const exists = existingNotifications.some(n => 
        n.relatedScheduleId === schedule.id && 
        !n.isRead &&
        n.type === 'manufacturing'
      );
      
      if (!exists) {
        await storage.createNotification({
          title: `Manufacturing scheduled ${daysDiff <= 1 ? 'today' : `in ${daysDiff} days`}`,
          message: `${project.name} (${project.projectNumber}) is scheduled to start in Bay ${bay.bayNumber} on ${startDate.toLocaleDateString()}`,
          type: 'manufacturing',
          priority: daysDiff <= 1 ? 'high' : 'medium',
          userId: null, // Send to all users
          relatedScheduleId: schedule.id,
          relatedProjectId: project.id,
          link: `/manufacturing/${schedule.id}`
        });
      }
    }
    
    return upcomingSchedules.length;
  } catch (error) {
    console.error('Failed to generate manufacturing notifications:', error);
    return 0;
  }
}