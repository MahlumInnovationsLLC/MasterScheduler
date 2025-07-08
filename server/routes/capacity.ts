import { Router } from "express";
import type { AppRequest } from "../types";
import { insertDepartmentCapacitySchema, insertTeamMemberSchema, insertCapacityProfileSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Note: Authentication will be handled by the main routes file when mounting this router

// Department Capacity Routes
router.get("/departments", async (req: AppRequest, res) => {
  try {
    const departments = await req.storage.getDepartmentCapacities();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching department capacities:", error);
    res.status(500).json({ message: "Failed to fetch department capacities" });
  }
});

router.get("/departments/:id", async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const department = await req.storage.getDepartmentCapacity(id);
    
    if (!department) {
      return res.status(404).json({ message: "Department capacity not found" });
    }
    
    res.json(department);
  } catch (error) {
    console.error("Error fetching department capacity:", error);
    res.status(500).json({ message: "Failed to fetch department capacity" });
  }
});

router.post("/departments", async (req: AppRequest, res) => {
  try {
    const data = insertDepartmentCapacitySchema.parse(req.body);
    const department = await req.storage.createDepartmentCapacity(data);
    res.json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error creating department capacity:", error);
    res.status(500).json({ message: "Failed to create department capacity" });
  }
});

router.put("/departments/:id",  async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertDepartmentCapacitySchema.partial().parse(req.body);
    const department = await req.storage.updateDepartmentCapacity(id, data);
    
    if (!department) {
      return res.status(404).json({ message: "Department capacity not found" });
    }
    
    res.json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error updating department capacity:", error);
    res.status(500).json({ message: "Failed to update department capacity" });
  }
});

router.delete("/departments/:id",  async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await req.storage.deleteDepartmentCapacity(id);
    
    if (!success) {
      return res.status(404).json({ message: "Department capacity not found" });
    }
    
    res.json({ message: "Department capacity deleted successfully" });
  } catch (error) {
    console.error("Error deleting department capacity:", error);
    res.status(500).json({ message: "Failed to delete department capacity" });
  }
});

// Team Members Routes
router.get("/team-members", async (req: AppRequest, res) => {
  try {
    const { bayId, departmentId, isActive } = req.query;
    
    const filters: any = {};
    if (bayId) filters.bayId = parseInt(bayId as string);
    if (departmentId) filters.departmentId = parseInt(departmentId as string);
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    
    const members = await req.storage.getTeamMembers(filters);
    res.json(members);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

router.get("/team-members/:id", async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const member = await req.storage.getTeamMember(id);
    
    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }
    
    res.json(member);
  } catch (error) {
    console.error("Error fetching team member:", error);
    res.status(500).json({ message: "Failed to fetch team member" });
  }
});

router.post("/team-members",  async (req: AppRequest, res) => {
  try {
    const data = insertTeamMemberSchema.parse(req.body);
    const member = await req.storage.createTeamMember(data);
    res.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error creating team member:", error);
    res.status(500).json({ message: "Failed to create team member" });
  }
});

router.put("/team-members/:id",  async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertTeamMemberSchema.partial().parse(req.body);
    const member = await req.storage.updateTeamMember(id, data);
    
    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }
    
    res.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error updating team member:", error);
    res.status(500).json({ message: "Failed to update team member" });
  }
});

router.delete("/team-members/:id",  async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await req.storage.deleteTeamMember(id);
    
    if (!success) {
      return res.status(404).json({ message: "Team member not found" });
    }
    
    res.json({ message: "Team member deleted successfully" });
  } catch (error) {
    console.error("Error deleting team member:", error);
    res.status(500).json({ message: "Failed to delete team member" });
  }
});

// Capacity Profiles Routes
router.get("/profiles", async (req: AppRequest, res) => {
  try {
    const profiles = await req.storage.getCapacityProfiles();
    res.json(profiles);
  } catch (error) {
    console.error("Error fetching capacity profiles:", error);
    res.status(500).json({ message: "Failed to fetch capacity profiles" });
  }
});

router.get("/profiles/:id", async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const profile = await req.storage.getCapacityProfile(id);
    
    if (!profile) {
      return res.status(404).json({ message: "Capacity profile not found" });
    }
    
    res.json(profile);
  } catch (error) {
    console.error("Error fetching capacity profile:", error);
    res.status(500).json({ message: "Failed to fetch capacity profile" });
  }
});

router.post("/profiles",  async (req: AppRequest, res) => {
  try {
    const data = insertCapacityProfileSchema.parse(req.body);
    const profile = await req.storage.createCapacityProfile(data);
    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error creating capacity profile:", error);
    res.status(500).json({ message: "Failed to create capacity profile" });
  }
});

router.put("/profiles/:id",  async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertCapacityProfileSchema.partial().parse(req.body);
    const profile = await req.storage.updateCapacityProfile(id, data);
    
    if (!profile) {
      return res.status(404).json({ message: "Capacity profile not found" });
    }
    
    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error updating capacity profile:", error);
    res.status(500).json({ message: "Failed to update capacity profile" });
  }
});

router.delete("/profiles/:id",  async (req: AppRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await req.storage.deleteCapacityProfile(id);
    
    if (!success) {
      return res.status(404).json({ message: "Capacity profile not found" });
    }
    
    res.json({ message: "Capacity profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting capacity profile:", error);
    res.status(500).json({ message: "Failed to delete capacity profile" });
  }
});

// Department Capacity History Routes
router.get("/departments/:id/history", async (req: AppRequest, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    
    const history = await req.storage.getDepartmentCapacityHistory(
      departmentId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(history);
  } catch (error) {
    console.error("Error fetching department capacity history:", error);
    res.status(500).json({ message: "Failed to fetch department capacity history" });
  }
});

router.post("/departments/:id/history",  async (req: AppRequest, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const data = {
      ...req.body,
      departmentId
    };
    
    const history = await req.storage.createDepartmentCapacityHistory(data);
    res.json(history);
  } catch (error) {
    console.error("Error creating department capacity history:", error);
    res.status(500).json({ message: "Failed to create department capacity history" });
  }
});

// Capacity Calculations Route
router.get("/calculations", async (req: AppRequest, res) => {
  try {
    // Get all active team members and departments
    const [teamMembers, departments, bays, schedules, projects] = await Promise.all([
      req.storage.getTeamMembers({ isActive: true }),
      req.storage.getDepartmentCapacities(),
      req.storage.getManufacturingBays(),
      req.storage.getManufacturingSchedules(),
      req.storage.getProjects()
    ]);

    // Calculate production team capacity (by bay)
    const productionCapacity = bays.map(bay => {
      const bayMembers = teamMembers.filter(m => m.bayId === bay.id);
      const assemblyMembers = bayMembers.filter(m => m.role === 'Assembly');
      const electricalMembers = bayMembers.filter(m => m.role === 'Electrical');
      
      const totalWeeklyHours = bayMembers.reduce((sum, member) => {
        return sum + (member.hoursPerWeek || 40) * (member.efficiencyRate || 100) / 100;
      }, 0);

      // Calculate current utilization based on scheduled projects
      const baySchedules = schedules.filter(s => s.bayId === bay.id);
      const activeSchedules = baySchedules.filter(s => {
        const now = new Date();
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return start <= now && end >= now;
      });

      return {
        bayId: bay.id,
        bayName: bay.name,
        team: bay.team,
        assemblyCount: assemblyMembers.length,
        electricalCount: electricalMembers.length,
        totalMembers: bayMembers.length,
        weeklyCapacityHours: totalWeeklyHours,
        activeProjects: activeSchedules.length,
        utilizationPercentage: activeSchedules.length > 0 ? Math.min(100, (activeSchedules.length / 2) * 100) : 0
      };
    });

    // Calculate department capacity
    const departmentCapacityCalc = departments.map(dept => {
      const deptMembers = teamMembers.filter(m => m.departmentId === dept.id);
      
      const totalWeeklyHours = deptMembers.reduce((sum, member) => {
        return sum + (member.hoursPerWeek || 40) * (member.efficiencyRate || 100) / 100;
      }, 0);

      // Calculate phase-specific project load
      let activeProjectsCount = 0;
      const now = new Date();
      
      if (dept.departmentType === 'fabrication') {
        activeProjectsCount = projects.filter(p => {
          if (!p.fabricationStart || p.status === 'delivered') return false;
          const fabStart = new Date(p.fabricationStart);
          const prodStart = p.productionStart ? new Date(p.productionStart) : null;
          return fabStart <= now && (!prodStart || prodStart > now);
        }).length;
      } else if (dept.departmentType === 'paint') {
        activeProjectsCount = projects.filter(p => {
          if (!p.paintStart || !p.productionStart || p.status === 'delivered') return false;
          const paintStart = new Date(p.paintStart);
          const prodStart = new Date(p.productionStart);
          return paintStart <= now && prodStart > now;
        }).length;
      } else if (dept.departmentType === 'it') {
        activeProjectsCount = projects.filter(p => {
          if (!p.itStart || !p.ntcTesting || p.status === 'delivered') return false;
          const itStart = new Date(p.itStart);
          const ntcStart = new Date(p.ntcTesting);
          return itStart <= now && ntcStart > now;
        }).length;
      } else if (dept.departmentType === 'ntc') {
        activeProjectsCount = projects.filter(p => {
          if (!p.ntcTesting || !p.qualityControl || p.status === 'delivered') return false;
          const ntcStart = new Date(p.ntcTesting);
          const qcStart = new Date(p.qualityControl);
          return ntcStart <= now && qcStart > now;
        }).length;
      } else if (dept.departmentType === 'qa') {
        activeProjectsCount = projects.filter(p => {
          if (!p.qualityControl || p.status === 'delivered') return false;
          const qcStart = new Date(p.qualityControl);
          return qcStart <= now;
        }).length;
      }

      return {
        departmentId: dept.id,
        departmentName: dept.departmentName,
        departmentType: dept.departmentType,
        totalMembers: deptMembers.length,
        weeklyCapacityHours: totalWeeklyHours || dept.weeklyCapacityHours,
        utilizationTarget: dept.utilizationTarget,
        activeProjects: activeProjectsCount,
        utilizationPercentage: totalWeeklyHours > 0 ? Math.min(100, (activeProjectsCount * 40 / totalWeeklyHours) * 100) : 0
      };
    });

    res.json({
      productionCapacity,
      departmentCapacity: departmentCapacityCalc,
      totalTeamMembers: teamMembers.length,
      summary: {
        totalProductionCapacity: productionCapacity.reduce((sum, bay) => sum + bay.weeklyCapacityHours, 0),
        totalDepartmentCapacity: departmentCapacityCalc.reduce((sum, dept) => sum + dept.weeklyCapacityHours, 0),
        averageUtilization: [...productionCapacity, ...departmentCapacityCalc].reduce((sum, item) => sum + item.utilizationPercentage, 0) / (productionCapacity.length + departmentCapacityCalc.length)
      }
    });
  } catch (error) {
    console.error("Error calculating capacity:", error);
    res.status(500).json({ message: "Failed to calculate capacity" });
  }
});

export default router;