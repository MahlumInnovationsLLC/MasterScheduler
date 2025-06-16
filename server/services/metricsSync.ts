import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../db';
import { projects } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface ProjectMetrics {
  projectNumber: string;
  cpi: number;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  estimatedCost: number;
}

/**
 * Fetches project metrics data from the external metrics website
 */
export async function fetchMetricsData(): Promise<ProjectMetrics[]> {
  try {
    console.log('🔄 Fetching metrics data from http://metrics.nomadgcs.com/pea');
    
    const response = await axios.get('http://metrics.nomadgcs.com/pea', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const metricsData: ProjectMetrics[] = [];

    // Parse the HTML table or data structure
    // This will need to be adjusted based on the actual structure of the metrics website
    $('table tr').each((index, element) => {
      if (index === 0) return; // Skip header row
      
      const cells = $(element).find('td');
      if (cells.length >= 6) {
        const projectNumber = $(cells[0]).text().trim();
        const cpi = parseFloat($(cells[1]).text().trim()) || 0;
        const plannedValue = parseFloat($(cells[2]).text().replace(/[,$]/g, '')) || 0;
        const earnedValue = parseFloat($(cells[3]).text().replace(/[,$]/g, '')) || 0;
        const actualCost = parseFloat($(cells[4]).text().replace(/[,$]/g, '')) || 0;
        const estimatedCost = parseFloat($(cells[5]).text().replace(/[,$]/g, '')) || 0;

        if (projectNumber && !isNaN(cpi)) {
          metricsData.push({
            projectNumber,
            cpi,
            plannedValue,
            earnedValue,
            actualCost,
            estimatedCost
          });
        }
      }
    });

    console.log(`📊 Parsed ${metricsData.length} project metrics from website`);
    return metricsData;

  } catch (error) {
    console.error('❌ Error fetching metrics data:', error);
    
    // If it's a network error, provide helpful information
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('🌐 Network connectivity issue - metrics website may not be accessible from this environment');
    }
    
    throw error;
  }
}

/**
 * Updates project metrics in the database
 */
export async function updateProjectMetrics(metricsData: ProjectMetrics[]): Promise<void> {
  let updatedCount = 0;
  let notFoundCount = 0;

  for (const metrics of metricsData) {
    try {
      // Find project by project number
      const existingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.projectNumber, metrics.projectNumber))
        .limit(1);

      if (existingProjects.length > 0) {
        // Update the project with new metrics
        await db
          .update(projects)
          .set({
            cpi: metrics.cpi.toString(),
            plannedValue: metrics.plannedValue.toString(),
            earnedValue: metrics.earnedValue.toString(),
            actualCost: metrics.actualCost.toString(),
            estimatedCost: metrics.estimatedCost.toString(),
            metricsLastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(eq(projects.id, existingProjects[0].id));

        updatedCount++;
        console.log(`✅ Updated metrics for project ${metrics.projectNumber}`);
      } else {
        notFoundCount++;
        console.log(`⚠️  Project ${metrics.projectNumber} not found in database`);
      }
    } catch (error) {
      console.error(`❌ Error updating project ${metrics.projectNumber}:`, error);
    }
  }

  console.log(`📈 Metrics sync complete: ${updatedCount} updated, ${notFoundCount} not found`);
}

/**
 * Main synchronization function
 */
export async function syncProjectMetrics(): Promise<void> {
  console.log('🚀 Starting project metrics synchronization...');
  
  try {
    const metricsData = await fetchMetricsData();
    
    if (metricsData.length > 0) {
      await updateProjectMetrics(metricsData);
      console.log('✅ Project metrics synchronization completed successfully');
    } else {
      console.log('⚠️  No metrics data found to sync');
    }
  } catch (error) {
    console.error('❌ Project metrics synchronization failed:', error);
    throw error;
  }
}

/**
 * Alternative data parser for different website structures
 * This can be used if the website uses a different format (JSON API, different HTML structure, etc.)
 */
export async function parseAlternativeFormat(html: string): Promise<ProjectMetrics[]> {
  const $ = cheerio.load(html);
  const metricsData: ProjectMetrics[] = [];

  // Alternative parsing logic for different website structures
  // Try parsing as a data table with different selectors
  $('.data-row, .metric-row, tr[data-project]').each((index, element) => {
    const projectNumber = $(element).find('.project-number, [data-field="project"]').text().trim();
    const cpi = parseFloat($(element).find('.cpi, [data-field="cpi"]').text().trim()) || 0;
    const plannedValue = parseFloat($(element).find('.planned, [data-field="planned"]').text().replace(/[,$]/g, '')) || 0;
    const earnedValue = parseFloat($(element).find('.earned, [data-field="earned"]').text().replace(/[,$]/g, '')) || 0;
    const actualCost = parseFloat($(element).find('.actual, [data-field="actual"]').text().replace(/[,$]/g, '')) || 0;
    const estimatedCost = parseFloat($(element).find('.estimated, [data-field="estimated"]').text().replace(/[,$]/g, '')) || 0;

    if (projectNumber && !isNaN(cpi)) {
      metricsData.push({
        projectNumber,
        cpi,
        plannedValue,
        earnedValue,
        actualCost,
        estimatedCost
      });
    }
  });

  return metricsData;
}