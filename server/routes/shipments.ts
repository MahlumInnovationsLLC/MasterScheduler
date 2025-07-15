import { Router, Request, Response } from "express";
import { DatabaseStorage } from "../storage";

const router = Router();
const storage = new DatabaseStorage();

// Get upcoming shipments (next 10 projects ready to ship)
router.get("/upcoming-shipments", async (req: Request, res: Response) => {
  try {
    const projects = await storage.getProjects();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter projects with ship dates and sort by nearest ship date
    const upcomingProjects = projects
      .filter(project => {
        if (!project.shipDate || project.status === 'Delivered') return false;
        const shipDate = new Date(project.shipDate);
        return shipDate >= today; // Only future ship dates
      })
      .sort((a, b) => {
        const dateA = new Date(a.shipDate!);
        const dateB = new Date(b.shipDate!);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10) // Top 10
      .map(project => ({
        id: project.id,
        projectNumber: project.projectNumber,
        name: project.name,
        shipDate: project.shipDate,
        team: project.team,
        status: project.status
      }));
    
    res.json(upcomingProjects);
  } catch (error) {
    console.error("Error fetching upcoming shipments:", error);
    res.status(500).json({ error: "Failed to fetch upcoming shipments" });
  }
});

export { router as shipmentsRouter };