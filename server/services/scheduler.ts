import * as cron from 'node-cron';
import { syncProjectMetrics } from './metricsSync';

class SchedulerService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled tasks
   */
  public init(): void {
    this.scheduleMetricsSync();
    console.log('📅 Scheduler service initialized');
  }

  /**
   * Schedule the metrics synchronization to run at 5:00 AM daily
   */
  private scheduleMetricsSync(): void {
    // Schedule for 5:00 AM every day (0 5 * * *)
    const task = cron.schedule('0 5 * * *', async () => {
      console.log('⏰ Running scheduled metrics synchronization at 5:00 AM');
      try {
        await syncProjectMetrics();
        console.log('✅ Scheduled metrics sync completed successfully');
      } catch (error) {
        console.error('❌ Scheduled metrics sync failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Denver" // Adjust timezone as needed
    });

    this.scheduledJobs.set('metricsSync', task);
    console.log('📅 Metrics sync scheduled for 5:00 AM daily');
  }

  /**
   * Manually trigger metrics synchronization
   */
  public async triggerMetricsSync(): Promise<void> {
    console.log('🔄 Manually triggering metrics synchronization');
    await syncProjectMetrics();
  }

  /**
   * Stop all scheduled jobs
   */
  public stopAll(): void {
    this.scheduledJobs.forEach((task, name) => {
      task.stop();
      console.log(`⏹️  Stopped scheduled job: ${name}`);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Get status of all scheduled jobs
   */
  public getStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.scheduledJobs.forEach((task, name) => {
      status[name] = task.getStatus() === 'scheduled';
    });
    return status;
  }

  /**
   * Reschedule a specific job
   */
  public rescheduleJob(jobName: string, cronExpression: string): boolean {
    const existingJob = this.scheduledJobs.get(jobName);
    if (existingJob) {
      existingJob.stop();
      this.scheduledJobs.delete(jobName);
    }

    if (jobName === 'metricsSync') {
      const newTask = cron.schedule(cronExpression, async () => {
        console.log(`⏰ Running rescheduled metrics synchronization`);
        try {
          await syncProjectMetrics();
          console.log('✅ Rescheduled metrics sync completed successfully');
        } catch (error) {
          console.error('❌ Rescheduled metrics sync failed:', error);
        }
      }, {
        scheduled: true,
        timezone: "America/Denver"
      });

      this.scheduledJobs.set(jobName, newTask);
      console.log(`📅 Rescheduled ${jobName} with expression: ${cronExpression}`);
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();