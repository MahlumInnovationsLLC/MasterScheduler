import { Request, Response } from 'express';
import { syncProjectMetrics } from '../services/metricsSync';
import { schedulerService } from '../services/scheduler';

// Simple auth middleware for metrics endpoints
const simpleAuth = (req: Request, res: Response, next: any) => {
  // For now, allow access - in production you'd check user authentication
  next();
};

/**
 * Manually trigger metrics synchronization
 */
export const triggerMetricsSync = [
  simpleAuth,
  async (req: Request, res: Response) => {
    try {
      console.log('📊 Manual metrics sync triggered by admin user');
      await syncProjectMetrics();
      
      res.json({
        success: true,
        message: 'Metrics synchronization completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Manual metrics sync failed:', error);
      res.status(500).json({
        success: false,
        message: 'Metrics synchronization failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
];

/**
 * Get scheduler status
 */
export const getSchedulerStatus = [
  simpleAuth,
  async (req: Request, res: Response) => {
    try {
      const status = schedulerService.getStatus();
      
      res.json({
        success: true,
        scheduledJobs: status,
        nextSync: '5:00 AM daily',
        timezone: 'America/Denver',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error getting scheduler status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get scheduler status',
        error: error.message
      });
    }
  }
];

/**
 * Update scheduler configuration
 */
export const updateScheduler = [
  simpleAuth,
  async (req: Request, res: Response) => {
    try {
      const { cronExpression, jobName } = req.body;
      
      if (!cronExpression || !jobName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: cronExpression and jobName'
        });
      }

      const success = schedulerService.rescheduleJob(jobName, cronExpression);
      
      if (success) {
        res.json({
          success: true,
          message: `Scheduler updated for ${jobName}`,
          cronExpression,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Invalid job name: ${jobName}`
        });
      }
    } catch (error) {
      console.error('❌ Error updating scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update scheduler',
        error: error.message
      });
    }
  }
];