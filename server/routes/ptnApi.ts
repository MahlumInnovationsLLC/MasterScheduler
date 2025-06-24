import type { Express } from "express";
import { storage } from "../storage";

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
      const endpoints = [
        `${connection.url}/api/export/projects`,
        `${connection.url}/api/export/teams`,
        `${connection.url}/api/export/issues`,
        `${connection.url}/api/export/alerts`,
        `${connection.url}/api/export/summary`
      ];

      const results: any = {
        projects: [],
        teams: [],
        issues: [],
        alerts: [],
        summary: null,
        lastUpdated: new Date().toISOString()
      };

      // Fetch data from each endpoint
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
            console.log(`⚠️ Non-JSON response from ${endpoint}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ Failed to fetch from ${endpoint}:`, (endpointError as Error).message);
        }
      }

      // Enhance projects with team and issue information
      if (results.projects.length > 0) {
        results.projects = results.projects.map((project: any) => ({
          ...project,
          teamInfo: results.teams.find((team: any) => team.projectId === project.id || team.project === project.name),
          activeIssues: results.issues.filter((issue: any) => issue.projectId === project.id || issue.project === project.name),
          alerts: results.alerts.filter((alert: any) => alert.projectId === project.id || alert.project === project.name)
        }));
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
      const statusEndpoint = `${connection.url}/api/export/status`;
      
      try {
        const response = await fetch(statusEndpoint, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(15000)
        });

        if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
          const statusData = await response.json();
          
          res.json({
            status: "connected",
            activeAlerts: statusData.activeAlerts || 0,
            criticalIssues: statusData.criticalIssues || 0,
            teams: statusData.teams || [],
            projects: statusData.projects || [],
            productionEfficiency: statusData.productionEfficiency || null,
            qualityMetrics: statusData.qualityMetrics || null,
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Fallback to summary endpoint
          const summaryResponse = await fetch(`${connection.url}/api/export/summary`, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(15000)
          });

          if (summaryResponse.ok && summaryResponse.headers.get("content-type")?.includes("application/json")) {
            const summaryData = await summaryResponse.json();
            
            res.json({
              status: "connected",
              activeAlerts: summaryData.alerts?.active || 0,
              criticalIssues: summaryData.issues?.critical || 0,
              teams: summaryData.teams || [],
              projects: summaryData.projects || [],
              lastUpdated: new Date().toISOString()
            });
          } else {
            throw new Error("No valid JSON response from PTN status or summary endpoints");
          }
        }
      } catch (fetchError) {
        res.json({
          status: "error",
          activeAlerts: 0,
          criticalIssues: 0,
          teams: [],
          projects: [],
          error: (fetchError as Error).message,
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