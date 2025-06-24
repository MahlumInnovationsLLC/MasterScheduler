import type { Express } from "express";
import { storage } from "../storage";
import { 
  mockPTNProjects, 
  mockPTNTeams, 
  mockPTNIssues, 
  mockPTNAlerts, 
  mockPTNSummary,
  mockProductionStatus 
} from "../mockPtnData";

// Enhanced PTN API endpoints with better error handling and data structures
export function setupPTNRoutes(app: Express) {
  
  // Get PTN projects with detailed information
  app.get("/api/ptn-projects", async (req, res) => {
    try {
      const connection = await storage.getPTNConnection();
      if (!connection || !connection.isEnabled) {
        return res.json({ 
          projects: [], 
          teams: [],
          issues: [],
          alerts: [],
          error: "PTN connection not configured or disabled" 
        });
      }

      console.log(`🔄 Fetching detailed PTN projects from ${connection.url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "NomadGCS-TierIV/1.0"
      };
      
      if (connection.apiKey) {
        headers["X-API-Key"] = connection.apiKey;
      }

      // Try multiple endpoints to get comprehensive data
      // Remove the duplicate /api/ path since connection.url already includes it
      const baseUrl = connection.url.replace(/\/api$/, '');
      const endpoints = [
        `${baseUrl}/api/export/projects`,
        `${baseUrl}/api/export/teams`, 
        `${baseUrl}/api/export/issues`,
        `${baseUrl}/api/export/alerts`,
        `${baseUrl}/api/export/summary`
      ];

      const results: any = {
        projects: [],
        teams: [],
        issues: [],
        alerts: [],
        summary: null,
        lastUpdated: new Date().toISOString()
      };

      // Fetch data from each endpoint with fallback to mock data
      let hasValidData = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: "GET", 
            headers,
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          const contentType = response.headers.get("content-type");
          console.log(`Response from ${endpoint}: ${response.status}, content-type: ${contentType}`);

          if (response.ok && contentType?.includes("application/json")) {
            const data = await response.json();
            hasValidData = true;
            
            // Map data based on endpoint
            if (endpoint.includes('/projects')) {
              results.projects = Array.isArray(data) ? data : (data.projects || []);
            } else if (endpoint.includes('/teams')) {
              results.teams = Array.isArray(data) ? data : (data.teams || []);
            } else if (endpoint.includes('/issues')) {
              results.issues = Array.isArray(data) ? data : (data.issues || []);
            } else if (endpoint.includes('/alerts')) {
              results.alerts = Array.isArray(data) ? data : (data.alerts || []);
            } else if (endpoint.includes('/summary')) {
              results.summary = data;
            }
            
            console.log(`✅ Successfully fetched data from ${endpoint}`);
          } else {
            console.log(`⚠️ Non-JSON response from ${endpoint} - using mock data for development`);
          }
        } catch (endpointError) {
          console.log(`⚠️ Failed to fetch from ${endpoint}:`, (endpointError as Error).message);
        }
      }

      // If no valid data was retrieved, return empty structure with detailed error
      if (!hasValidData) {
        console.log(`❌ No valid JSON data retrieved from PTN endpoints`);
        return res.json({
          projects: [],
          teams: [],
          issues: [],
          alerts: [],
          error: `PTN API authentication required. The server is responding with JSON but requires a valid API key.`,
          debugInfo: {
            baseUrl: baseUrl,
            attemptedEndpoints: endpoints,
            connectionUrl: connection.url
          },
          lastUpdated: new Date().toISOString()
        });
      }

      // Enhance projects with team and issue information and use proper project numbers
      if (results.projects.length > 0) {
        results.projects = results.projects.map((project: any) => {
          // Map PTN project structure to display structure
          const mappedProject = {
            ...project,
            displayId: project.project_number || project.projectNumber || project.id,
            displayName: project.project_number || project.projectNumber || project.name || `Project ${project.id}`,
            status: project.status || 'active',
            teamInfo: null,
            activeIssues: [],
            alerts: []
          };

          // Find team information using various possible field names
          const team = results.teams.find((team: any) => 
            team.projectId === project.id || 
            team.project_id === project.id ||
            team.project === project.name ||
            team.current_project === project.project_number ||
            team.currentProject === project.project_number
          );

          if (team) {
            mappedProject.teamInfo = {
              id: team.id || team.team_id,
              name: team.name || team.team_name,
              lead: team.lead || team.team_lead || team.leadName,
              members: team.members || team.member_count || team.memberCount,
              currentProject: team.current_project || team.currentProject,
              needs: team.needs || team.team_needs || team.active_needs || []
            };
          }

          // Find related issues using various field patterns
          mappedProject.activeIssues = results.issues.filter((issue: any) => 
            issue.projectId === project.id || 
            issue.project_id === project.id ||
            issue.project === project.name ||
            issue.project_number === project.project_number
          );

          // Find related alerts
          mappedProject.alerts = results.alerts.filter((alert: any) => 
            alert.projectId === project.id || 
            alert.project_id === project.id ||
            alert.project === project.name ||
            alert.project_number === project.project_number
          );

          return mappedProject;
        });
      }

      res.json(results);
      
    } catch (error) {
      console.error("Error fetching detailed PTN projects:", error);
      res.json({
        projects: [],
        teams: [],
        issues: [],
        alerts: [],
        error: (error as Error).message,
        lastUpdated: new Date().toISOString()
      });
    }
  });

  // Get PTN production status with alerts and issues
  app.get("/api/ptn-production-status", async (req, res) => {
    try {
      const connection = await storage.getPTNConnection();
      if (!connection || !connection.isEnabled) {
        return res.json({ 
          status: "disconnected",
          activeAlerts: 0,
          criticalIssues: 0,
          teams: [],
          projects: [],
          error: "PTN connection not configured" 
        });
      }

      console.log(`🔄 Fetching PTN production status from ${connection.url}`);
      
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "NomadGCS-TierIV/1.0"
      };
      
      if (connection.apiKey) {
        headers["X-API-Key"] = connection.apiKey;
      }

      // Get real-time status data  
      const baseUrl = connection.url.replace(/\/api$/, '');
      const statusEndpoint = `${baseUrl}/api/export/summary`; // Use summary endpoint instead of status
      
      try {
        const response = await fetch(statusEndpoint, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(15000)
        });

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType?.includes("application/json")) {
          const summaryData = await response.json();
          
          // Get additional data for comprehensive status
          const projectsResponse = await fetch(`${baseUrl}/api/export/projects`, { method: "GET", headers });
          const teamsResponse = await fetch(`${baseUrl}/api/export/teams`, { method: "GET", headers });
          
          let projects = [];
          let teams = [];
          
          if (projectsResponse.ok && projectsResponse.headers.get("content-type")?.includes("application/json")) {
            projects = await projectsResponse.json();
          }
          
          if (teamsResponse.ok && teamsResponse.headers.get("content-type")?.includes("application/json")) {
            teams = await teamsResponse.json();
          }
          
          // Map projects with proper project numbers
          const mappedProjects = projects.slice(0, 10).map((project: any) => ({
            id: project.project_number || project.projectNumber || project.id,
            name: project.project_number || project.projectNumber || `Project ${project.id}`,
            status: project.status || 'active',
            team: project.team_name || project.teamName || 'Unassigned'
          }));
          
          res.json({
            status: "connected",
            activeAlerts: projects.filter((p: any) => p.status === 'warning' || p.priority === 'HIGH').length,
            criticalIssues: projects.filter((p: any) => p.status === 'error' || p.severity === 'CRITICAL').length,
            teams: teams,
            projects: mappedProjects,
            productionEfficiency: summaryData.productionEfficiency || 85,
            qualityMetrics: summaryData.qualityMetrics || null,
            lastUpdated: new Date().toISOString()
          });
        } else {
          console.log(`⚠️ PTN status endpoint returned ${contentType}, falling back to summary data`);
          res.json({
            status: "error",
            activeAlerts: 0,
            criticalIssues: 0,
            teams: [],
            projects: [],
            error: `PTN status endpoint returned ${contentType} instead of JSON`,
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (fetchError) {
        res.json({
          status: "error",
          activeAlerts: 0,
          criticalIssues: 0,
          teams: [],
          projects: [],
          error: `PTN API connection failed: ${(fetchError as Error).message}. Check PTN server status and endpoint configuration.`,
          debugInfo: {
            baseUrl: baseUrl,
            statusEndpoint: statusEndpoint,
            connectionUrl: connection.url
          },
          lastUpdated: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error("Error fetching PTN production status:", error);
      res.json({
        status: "error",
        activeAlerts: 0,
        criticalIssues: 0,
        teams: [],
        projects: [],
        error: (error as Error).message,
        lastUpdated: new Date().toISOString()
      });
    }
  });
}