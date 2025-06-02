import { Router } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
// Clean slate - admin rights removed
import { storage } from '../storage';

const router = Router();

// Get storage info
router.get('/storage-info', async (req, res) => {
  try {
    // Get project counts from the database
    const projectCount = await storage.getProjectCount();
    const userCount = await storage.getUserCount();
    
    // Use database metrics for storage estimation
    // Storage size is calculated based on a simple formula
    const totalStorageUsed = Math.round((projectCount * 0.5) + (userCount * 0.2) + 10);
    
    res.json({
      totalStorageUsed,
      projectCount,
      userCount
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({ message: 'Error getting storage info' });
  }
});

// Database backup endpoint
router.post('/backup-database', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFilePath = path.join(backupDir, `backup-${timestamp}.sql`);
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return res.status(500).json({ success: false, message: 'Database URL not configured' });
    }
    
    // Parse connection string to get database details
    const match = databaseUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!match) {
      return res.status(500).json({ success: false, message: 'Invalid database URL format' });
    }
    
    const [, user, password, host, port, database] = match;
    
    // Create backup using pg_dump
    exec(
      `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -f ${backupFilePath}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error('Error creating database backup:', error);
          return res.status(500).json({ success: false, message: 'Error creating database backup' });
        }
        
        // Create a backup record
        storage.createBackupRecord({
          filename: path.basename(backupFilePath),
          size: fs.statSync(backupFilePath).size,
          createdAt: new Date()
        }).then(() => {
          res.json({
            success: true,
            message: 'Database backup created successfully',
            filename: path.basename(backupFilePath)
          });
        }).catch(err => {
          console.error('Error recording backup in database:', err);
          res.json({
            success: true,
            message: 'Database backup created, but failed to record in database',
            filename: path.basename(backupFilePath)
          });
        });
      }
    );
  } catch (error) {
    console.error('Error creating database backup:', error);
    res.status(500).json({ success: false, message: 'Error creating database backup' });
  }
});

// Database restore endpoint
router.post('/restore-database', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ success: false, message: 'Backup filename is required' });
    }
    
    const backupDir = path.join(__dirname, '../../backups');
    const backupFilePath = path.join(backupDir, filename);
    
    // Check if backup file exists
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }
    
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return res.status(500).json({ success: false, message: 'Database URL not configured' });
    }
    
    // Parse connection string to get database details
    const match = databaseUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!match) {
      return res.status(500).json({ success: false, message: 'Invalid database URL format' });
    }
    
    const [, user, password, host, port, database] = match;
    
    // Restore backup using pg_restore
    exec(
      `PGPASSWORD=${password} pg_restore -h ${host} -p ${port} -U ${user} -d ${database} -c ${backupFilePath}`,
      (error, stdout, stderr) => {
        if (error && !stderr.includes('WARNING')) {
          console.error('Error restoring database:', error);
          return res.status(500).json({ success: false, message: 'Error restoring database' });
        }
        
        // Record the restore operation
        storage.createRestoreRecord({
          filename: path.basename(backupFilePath),
          restoredAt: new Date()
        }).then(() => {
          res.json({
            success: true,
            message: 'Database restored successfully'
          });
        }).catch(err => {
          console.error('Error recording restore in database:', err);
          res.json({
            success: true,
            message: 'Database restored, but failed to record operation'
          });
        });
      }
    );
  } catch (error) {
    console.error('Error restoring database:', error);
    res.status(500).json({ success: false, message: 'Error restoring database' });
  }
});

// Get latest backup info
router.get('/latest-backup', async (req, res) => {
  try {
    const latestBackup = await storage.getLatestBackup();
    
    if (!latestBackup) {
      return res.json({ hasBackup: false });
    }
    
    res.json({
      hasBackup: true,
      filename: latestBackup.filename,
      createdAt: latestBackup.createdAt
    });
  } catch (error) {
    console.error('Error getting latest backup info:', error);
    res.status(500).json({ message: 'Error getting backup info' });
  }
});

// Get all backups
router.get('/backups', async (req, res) => {
  try {
    const backups = await storage.getBackups();
    res.json(backups);
  } catch (error) {
    console.error('Error getting backups:', error);
    res.status(500).json({ message: 'Error getting backups' });
  }
});

export default router;