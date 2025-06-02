import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';

const router = express.Router();

// Get all role permissions
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { role } = req.query;
    
    if (role && typeof role === 'string') {
      // Get permissions for a specific role
      const permissions = await storage.getRolePermissions(role);
      return res.json(permissions);
    } else {
      // Get all permissions
      const permissions = await storage.getRolePermissions();
      return res.json(permissions);
    }
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Get permissions for a specific category and role
router.get('/category/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    const { role } = req.query;
    
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ error: 'Role parameter is required' });
    }
    
    const permissions = await storage.getRolePermissionsByCategory(role, category);
    return res.json(permissions);
  } catch (error) {
    console.error('Error fetching category permissions:', error);
    return res.status(500).json({ error: 'Failed to fetch category permissions' });
  }
});

// Get a specific permission by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await storage.getRolePermission(parseInt(id));
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    return res.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    return res.status(500).json({ error: 'Failed to fetch permission' });
  }
});

// Create a new permission
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const schema = z.object({
      role: z.string(),
      category: z.string(),
      feature: z.string(),
      canView: z.boolean().optional().default(false),
      canEdit: z.boolean().optional().default(false),
      canCreate: z.boolean().optional().default(false),
      canDelete: z.boolean().optional().default(false),
      canImport: z.boolean().optional().default(false),
      canExport: z.boolean().optional().default(false),
      specialPermissions: z.record(z.any()).optional(),
    });
    
    const validated = schema.safeParse(req.body);
    
    if (!validated.success) {
      return res.status(400).json({ error: 'Invalid permission data', details: validated.error });
    }
    
    const permission = await storage.createRolePermission(validated.data);
    return res.status(201).json(permission);
  } catch (error) {
    console.error('Error creating permission:', error);
    return res.status(500).json({ error: 'Failed to create permission' });
  }
});

// Update a permission
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      role: z.string().optional(),
      category: z.string().optional(),
      feature: z.string().optional(),
      canView: z.boolean().optional(),
      canEdit: z.boolean().optional(),
      canCreate: z.boolean().optional(),
      canDelete: z.boolean().optional(),
      canImport: z.boolean().optional(),
      canExport: z.boolean().optional(),
      specialPermissions: z.record(z.any()).optional(),
    });
    
    const validated = schema.safeParse(req.body);
    
    if (!validated.success) {
      return res.status(400).json({ error: 'Invalid permission data', details: validated.error });
    }
    
    const permission = await storage.updateRolePermission(parseInt(id), validated.data);
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    return res.json(permission);
  } catch (error) {
    console.error('Error updating permission:', error);
    return res.status(500).json({ error: 'Failed to update permission' });
  }
});

// Delete a permission
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteRolePermission(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return res.status(500).json({ error: 'Failed to delete permission' });
  }
});

// Bulk update permissions for a role
router.post('/bulk-update/:role', isAuthenticated, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }
    
    const count = await storage.bulkUpdateRolePermissions(role, permissions);
    return res.json({ success: true, updatedCount: count });
  } catch (error) {
    console.error('Error bulk updating permissions:', error);
    return res.status(500).json({ error: 'Failed to update permissions' });
  }
});

export default router;