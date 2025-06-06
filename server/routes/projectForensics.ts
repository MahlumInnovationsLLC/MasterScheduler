import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { trackChanges, createForensicsRecord, getForensicsContext } from "../forensics";

// Forensics-enabled project update endpoint
export function addProjectForensicsRoutes(app: Express, requireEditor: any, countWorkingDays: any) {
  // Enhanced PUT endpoint for updating projects with forensics tracking
  app.put("/api/projects/:id/with-forensics", requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Forensics-enabled PUT request for project ID: ${id}`, req.body);
      
      // Get the current project data
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get data from request
      const updateData = req.body;
      
      // Handle text values like "N/A" and "PENDING" by storing in separate text fields
      const dateTextFields: Record<string, string> = {
        'fabricationStart': 'fabricationStartText',
        'wrapDate': 'wrapDateText', 
        'ntcTestingDate': 'ntcTestingDateText',
        'executiveReviewDate': 'executiveReviewDateText',
        'deliveryDate': 'deliveryDateText'
      };
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === 'N/A' || updateData[key] === 'PENDING') {
          console.log(`Converting ${key} from "${updateData[key]}" to null for database`);
          
          // If this is a date field that supports text overrides, save to text field
          if (dateTextFields[key]) {
            updateData[dateTextFields[key]] = updateData[key]; // Save text value
            updateData[key] = null; // Clear the date field
            console.log(`Storing text value "${updateData[dateTextFields[key]]}" in ${dateTextFields[key]} field`);
          } else {
            updateData[key] = null;
          }
        } else {
          // If setting a real date value, clear any existing text override
          if (dateTextFields[key]) {
            updateData[dateTextFields[key]] = null;
          }
        }
      });
      
      // Process date fields specifically
      const dateFields = [
        'startDate', 'contractDate', 'estimatedCompletionDate', 'actualCompletionDate',
        'chassisETA', 'fabricationStart', 'paintStart', 'assemblyStart', 'wrapDate', 'ntcTestingDate',
        'qcStartDate', 'executiveReviewDate', 'shipDate', 'deliveryDate'
      ];
      
      // Handle each date field correctly with timezone adjustment
      dateFields.forEach(field => {
        if (field in updateData) {
          if (updateData[field] === null) {
            console.log(`Clearing date field ${field} to null`);
          } else if (updateData[field]) {
            console.log(`Storing date for ${field} exactly as provided: ${updateData[field]}`);
          }
        }
      });
      
      // Check if shipDate or deliveryDate has changed
      const shipDateChanged = 'shipDate' in updateData && 
                             currentProject.shipDate !== updateData.shipDate;
      
      const deliveryDateChanged = 'deliveryDate' in updateData && 
                                 currentProject.deliveryDate !== updateData.deliveryDate;
      
      // Calculate QC Days if both dates are present
      if (('qcStartDate' in updateData || currentProject.qcStartDate) && 
          ('shipDate' in updateData || currentProject.shipDate)) {
        const qcStartDate = 'qcStartDate' in updateData ? updateData.qcStartDate : currentProject.qcStartDate;
        const shipDate = 'shipDate' in updateData ? updateData.shipDate : currentProject.shipDate;
        
        if (qcStartDate && shipDate) {
          const qcDaysCount = countWorkingDays(qcStartDate, shipDate);
          updateData.qcDays = qcDaysCount;
          console.log(`Calculated QC Days for project ${id}: ${qcDaysCount} working days`);
        }
      }
      
      // Track changes for forensics before updating
      const changes = trackChanges(currentProject, updateData);
      
      // Update the project
      const project = await storage.updateProject(id, updateData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Create forensics record if there were changes
      if (changes.length > 0) {
        try {
          const forensicsContext = getForensicsContext(req, req.user);
          await createForensicsRecord(
            id,
            'project',
            id,
            'update',
            changes,
            forensicsContext
          );
          console.log(`Forensics: Tracked ${changes.length} changes for project ${id}`);
        } catch (forensicsError) {
          console.error('Error creating forensics record:', forensicsError);
          // Don't fail the request if forensics fails
        }
      }
      
      // If ship date or delivery date changed, check for delivery milestones to update
      if (shipDateChanged || deliveryDateChanged) {
        const dateToSync = updateData.deliveryDate || updateData.shipDate;
        
        try {
          // Get all billing milestones for this project
          const billingMilestones = await storage.getProjectBillingMilestones(id);
          const deliveryMilestones = billingMilestones.filter(
            milestone => milestone.name.toLowerCase().includes('delivery') || 
                        milestone.name.toLowerCase().includes('final payment') ||
                        milestone.name.toLowerCase().includes('completion')
          );
          
          if (deliveryMilestones.length > 0) {
            console.log(`Found ${deliveryMilestones.length} delivery milestones to update for project ${id}`);
            
            for (const milestone of deliveryMilestones) {
              try {
                await storage.updateBillingMilestone(milestone.id, {
                  targetInvoiceDate: dateToSync,
                  liveDate: dateToSync,
                  shipDateChanged: true
                });
                console.log(`Updated delivery milestone ${milestone.id} (${milestone.name}) with new date: ${dateToSync}`);
              } catch (milestoneError) {
                console.error(`Error updating milestone ${milestone.id}:`, milestoneError);
              }
            }
          }
        } catch (error) {
          console.error(`Error updating delivery milestones for project ${id}:`, error);
        }
      }
      
      res.json(project);
    } catch (error) {
      console.error(`Error updating project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error updating project" });
    }
  });
}