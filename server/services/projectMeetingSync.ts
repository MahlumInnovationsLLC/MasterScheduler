import { storage } from '../storage';
import { Meeting, MeetingTask, Task, Project, InsertTask, InsertMeetingTask } from '@shared/schema';

class ProjectMeetingSyncService {
  
  /**
   * Sync meeting task to project activities
   * When a meeting task is created/updated with a project, create/update corresponding project task
   */
  async syncMeetingTaskToProject(meetingTask: MeetingTask): Promise<void> {
    if (!meetingTask.projectId) {
      console.log('Meeting task has no project ID, skipping sync');
      return;
    }

    try {
      const project = await storage.getProject(meetingTask.projectId);
      if (!project) {
        console.error(`Project ${meetingTask.projectId} not found for meeting task ${meetingTask.id}`);
        return;
      }

      const meeting = await storage.getMeeting(meetingTask.meetingId);
      if (!meeting) {
        console.error(`Meeting ${meetingTask.meetingId} not found for task ${meetingTask.id}`);
        return;
      }

      // Check if we already have a synced project task
      if (meetingTask.syncedTaskId) {
        // Update existing project task
        const existingTask = await storage.getTask(meetingTask.syncedTaskId);
        if (existingTask) {
          await storage.updateTask(meetingTask.syncedTaskId, {
            title: `Meeting Task: ${meetingTask.description}`,
            description: `From meeting "${meeting.title}" on ${new Date(meeting.datetime).toLocaleDateString()}\n\n${meetingTask.description}`,
            assignedToId: meetingTask.assignedToId,
            dueDate: meetingTask.dueDate,
            priority: meetingTask.priority,
            status: this.mapMeetingTaskStatusToProjectStatus(meetingTask.status),
          });
          console.log(`Updated synced project task ${meetingTask.syncedTaskId} for meeting task ${meetingTask.id}`);
        }
      } else {
        // Create new project task
        const newTask = await storage.createTask({
          title: `Meeting Task: ${meetingTask.description}`,
          description: `From meeting "${meeting.title}" on ${new Date(meeting.datetime).toLocaleDateString()}\n\n${meetingTask.description}`,
          projectId: meetingTask.projectId,
          assignedToId: meetingTask.assignedToId,
          dueDate: meetingTask.dueDate,
          priority: meetingTask.priority,
          status: this.mapMeetingTaskStatusToProjectStatus(meetingTask.status),
        });

        // Update meeting task with synced task ID
        await storage.updateMeetingTask(meetingTask.id, {
          syncedTaskId: newTask.id
        });

        console.log(`Created synced project task ${newTask.id} for meeting task ${meetingTask.id}`);
      }
    } catch (error) {
      console.error('Error syncing meeting task to project:', error);
    }
  }

  /**
   * Sync project task to meeting activities
   * When a project task is updated and has a meeting link, update the corresponding meeting task
   */
  async syncProjectTaskToMeeting(projectTask: Task): Promise<void> {
    try {
      // Find any meeting tasks that reference this project task
      const meetingTasks = await storage.getMeetingTasksByProjectTask(projectTask.id);
      
      for (const meetingTask of meetingTasks) {
        await storage.updateMeetingTask(meetingTask.id, {
          description: projectTask.title,
          assignedToId: projectTask.assignedToId,
          dueDate: projectTask.dueDate,
          priority: projectTask.priority,
          status: this.mapProjectTaskStatusToMeetingStatus(projectTask.status),
        });
        console.log(`Updated meeting task ${meetingTask.id} from project task ${projectTask.id}`);
      }
    } catch (error) {
      console.error('Error syncing project task to meeting:', error);
    }
  }

  /**
   * Link existing project to meeting
   * When a meeting is tagged with projects, ensure proper linkage
   */
  async linkProjectToMeeting(meetingId: number, projectIds: number[]): Promise<void> {
    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        console.error(`Meeting ${meetingId} not found`);
        return;
      }

      // Update meeting with related projects
      await storage.updateMeeting(meetingId, {
        relatedProjects: projectIds
      });

      // Create project activities for each linked project
      for (const projectId of projectIds) {
        const project = await storage.getProject(projectId);
        if (!project) continue;

        // Create a project task that references the meeting
        const taskDescription = `Meeting: ${meeting.title}`;
        const fullDescription = `Meeting scheduled for ${new Date(meeting.datetime).toLocaleString()}\n\nLocation: ${meeting.location || 'Not specified'}\nVirtual Link: ${meeting.virtualLink || 'None'}\n\nAgenda:\n${meeting.agenda?.join('\n') || 'No agenda specified'}\n\nDescription: ${meeting.description || 'No description'}`;

        const projectTask = await storage.createTask({
          title: taskDescription,
          description: fullDescription,
          projectId: projectId,
          assignedToId: meeting.organizerId,
          dueDate: new Date(meeting.datetime).toISOString().split('T')[0], // Convert to date string
          priority: 'medium',
          status: meeting.status === 'completed' ? 'completed' : 'in_progress',
        });

        console.log(`Created project task ${projectTask.id} for meeting ${meetingId} in project ${projectId}`);
      }
    } catch (error) {
      console.error('Error linking project to meeting:', error);
    }
  }

  /**
   * Get meetings related to a project
   */
  async getProjectMeetings(projectId: number): Promise<Meeting[]> {
    try {
      const meetings = await storage.getMeetingsByProject(projectId);
      return meetings;
    } catch (error) {
      console.error('Error getting project meetings:', error);
      return [];
    }
  }

  /**
   * Get project tasks that originated from meetings
   */
  async getProjectMeetingTasks(projectId: number): Promise<Task[]> {
    try {
      const tasks = await storage.getProjectTasks(projectId);
      // Filter tasks that have meeting references (title starts with "Meeting:")
      return tasks.filter(task => task.title.startsWith('Meeting:') || task.title.startsWith('Meeting Task:'));
    } catch (error) {
      console.error('Error getting project meeting tasks:', error);
      return [];
    }
  }

  /**
   * Remove project from meeting
   */
  async unlinkProjectFromMeeting(meetingId: number, projectId: number): Promise<void> {
    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting || !meeting.relatedProjects) return;

      // Remove project from meeting's related projects
      const updatedProjects = meeting.relatedProjects.filter(id => id !== projectId);
      await storage.updateMeeting(meetingId, {
        relatedProjects: updatedProjects
      });

      // Find and remove/update related project tasks
      const projectTasks = await storage.getProjectTasks(projectId);
      const meetingRelatedTasks = projectTasks.filter(task => 
        task.title.includes(meeting.title) || 
        (task.description && task.description.includes(`Meeting scheduled for ${new Date(meeting.datetime).toLocaleString()}`))
      );

      for (const task of meetingRelatedTasks) {
        // Mark task as completed or delete it based on status
        if (task.status === 'pending' || task.status === 'in_progress') {
          await storage.updateTask(task.id, { status: 'cancelled' });
        }
      }

      console.log(`Unlinked project ${projectId} from meeting ${meetingId}`);
    } catch (error) {
      console.error('Error unlinking project from meeting:', error);
    }
  }

  /**
   * Get project activity summary including meetings
   */
  async getProjectActivitySummary(projectId: number): Promise<{
    meetings: Meeting[];
    meetingTasks: Task[];
    totalMeetings: number;
    upcomingMeetings: number;
    pendingMeetingTasks: number;
  }> {
    try {
      const meetings = await this.getProjectMeetings(projectId);
      const meetingTasks = await this.getProjectMeetingTasks(projectId);
      
      const now = new Date();
      const upcomingMeetings = meetings.filter(meeting => 
        new Date(meeting.datetime) > now && meeting.status === 'scheduled'
      ).length;
      
      const pendingMeetingTasks = meetingTasks.filter(task => 
        task.status === 'pending' || task.status === 'in_progress'
      ).length;

      return {
        meetings,
        meetingTasks,
        totalMeetings: meetings.length,
        upcomingMeetings,
        pendingMeetingTasks,
      };
    } catch (error) {
      console.error('Error getting project activity summary:', error);
      return {
        meetings: [],
        meetingTasks: [],
        totalMeetings: 0,
        upcomingMeetings: 0,
        pendingMeetingTasks: 0,
      };
    }
  }

  /**
   * Auto-sync when meeting task status changes
   */
  async handleMeetingTaskStatusChange(meetingTaskId: number, newStatus: string): Promise<void> {
    try {
      const meetingTask = await storage.getMeetingTask(meetingTaskId);
      if (!meetingTask || !meetingTask.syncedTaskId) return;

      const projectStatus = this.mapMeetingTaskStatusToProjectStatus(newStatus);
      await storage.updateTask(meetingTask.syncedTaskId, { status: projectStatus });
      
      console.log(`Synced status change: meeting task ${meetingTaskId} (${newStatus}) -> project task ${meetingTask.syncedTaskId} (${projectStatus})`);
    } catch (error) {
      console.error('Error handling meeting task status change:', error);
    }
  }

  /**
   * Auto-sync when project task status changes
   */
  async handleProjectTaskStatusChange(projectTaskId: number, newStatus: string): Promise<void> {
    try {
      const meetingTasks = await storage.getMeetingTasksByProjectTask(projectTaskId);
      const meetingStatus = this.mapProjectTaskStatusToMeetingStatus(newStatus);
      
      for (const meetingTask of meetingTasks) {
        await storage.updateMeetingTask(meetingTask.id, { status: meetingStatus });
        console.log(`Synced status change: project task ${projectTaskId} (${newStatus}) -> meeting task ${meetingTask.id} (${meetingStatus})`);
      }
    } catch (error) {
      console.error('Error handling project task status change:', error);
    }
  }

  /**
   * Map meeting task status to project task status
   */
  private mapMeetingTaskStatusToProjectStatus(meetingStatus: string): string {
    switch (meetingStatus) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }

  /**
   * Map project task status to meeting task status
   */
  private mapProjectTaskStatusToMeetingStatus(projectStatus: string): string {
    switch (projectStatus) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }
}

export const projectMeetingSyncService = new ProjectMeetingSyncService();
export { ProjectMeetingSyncService };