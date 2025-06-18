import React from 'react';
import { formatDate } from '@/lib/utils';
import { Clock, Calendar, Hammer, Wrench, TestTube, CheckSquare, CheckCircle, Truck, Navigation, Package } from 'lucide-react';

interface ProjectPhaseInfoProps {
  project: any;
}

export const ProjectPhaseInfo: React.FC<ProjectPhaseInfoProps> = ({ project }) => {
  // Helper function to check if current date is past OP date
  const isCurrentDatePastOP = (currentDate: string | null, opDate: string | null): boolean => {
    if (!currentDate || !opDate) return false;
    
    try {
      const current = new Date(currentDate);
      const op = new Date(opDate);
      return current > op;
    } catch {
      return false;
    }
  };

  // Helper function to format OP date
  const formatOPDate = (opValue: string | null | undefined): string => {
    if (!opValue) return '';
    return formatDateOrText(opValue);
  };

  // Helper function to format date or return text value with timezone fix
  const formatDateOrText = (value: string | null | undefined): string => {
    if (!value) return 'TBD';

    // Handle text values like PENDING, N/A, TBD
    if (value === 'PENDING' || value === 'N/A' || value === 'TBD') {
      return value;
    }

    // Check if it's not a valid date format before trying to parse
    if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(value) && isNaN(Date.parse(value))) {
      return value; // Return as-is if it's not a recognizable date format
    }

    // Try to format as date with timezone fix
    try {
      // TIMEZONE FIX: Parse date in local timezone to prevent day-before display
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const safeDate = new Date(year, month - 1, day); // month is 0-indexed
        if (isNaN(safeDate.getTime())) {
          return value;
        }
        // Format manually to avoid timezone conversion
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[safeDate.getMonth()]} ${safeDate.getDate().toString().padStart(2, '0')}, ${safeDate.getFullYear()}`;
      }

      // Fallback for other date formats
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value; // Return original value if invalid date
      }
      return formatDate(value);
    } catch (error) {
      // If date formatting fails, return the original value
      return value;
    }
  };

  // Helper to safely get date from project, localStorage, or rawData
  const getPhaseDate = (fieldName: string): string | null => {
    // First check localStorage for text values like "N/A" or "PENDING"
    const storedValue = localStorage.getItem(`date_field_${project.id}_${fieldName}`);
    if (storedValue && (storedValue === 'N/A' || storedValue === 'PENDING')) {
      return storedValue;
    }

    // Special case for startDate and shipDate which should come from project first
    if (fieldName === 'startDate' && project.startDate) {
      return project.startDate;
    }

    if (fieldName === 'shipDate' && project.shipDate) {
      return project.shipDate;
    }

    // Try to get directly from project for other fields
    if (project[fieldName]) {
      return project[fieldName];
    }

    // Check localStorage for text values (N/A, PENDING) even if database field is null
    try {
      const storageKey = `dateField_${fieldName}`;
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue && (storedValue === 'N/A' || storedValue === 'PENDING')) {
        return storedValue;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Try to get from rawData
    if (project.rawData) {
      // Check different naming patterns
      const possibleKeys = [
        fieldName,
        fieldName.replace(/([A-Z])/g, '_$1').toUpperCase(), // camelCase to SNAKE_CASE
        fieldName.replace(/([A-Z])/g, ' $1').trim(), // camelCase to Sentence case
        fieldName.toUpperCase(),
        fieldName.toLowerCase()
      ];

      for (const key of possibleKeys) {
        if (project.rawData[key] !== undefined && project.rawData[key] !== null && 
            project.rawData[key] !== 'N/A' && project.rawData[key] !== '') {
          return project.rawData[key];
        }
      }

      // Try common alternative names
      const alternativeNames: Record<string, string[]> = {
        'startDate': ['START_DATE', 'START', 'Start Date', 'Start', 'BEGIN_DATE', 'Begin Date'],
        'fabricationStart': ['FAB_START', 'FAB_DATE', 'FABRICATION_START', 'Fabrication_Start', 'Fab Start'],
        'assemblyStart': ['ASSEMBLY_START', 'ASSEMBLY_DATE', 'Assembly_Start', 'Assembly Start'],
        'ntcTestingDate': ['NTC_TESTING', 'NTC_TEST_DATE', 'NTC Testing', 'NTC Test Date'],
        'qcStartDate': ['QC_START', 'QUALITY_CONTROL_START', 'QC Start', 'Quality Control Start'],
        'executiveReviewDate': ['EXECUTIVE_REVIEW', 'EXEC_REVIEW', 'EXEC_REVIEW_DATE', 'Executive Review'],
        'shipDate': ['SHIP', 'SHIPPING_DATE', 'Ship', 'Shipping Date', 'SHIP_DATE'],
        'deliveryDate': ['DELIVERY', 'DELIVERY_DATE', 'Delivery', 'Delivery Date']
      };

      const alternatives = alternativeNames[fieldName] || [];
      for (const alt of alternatives) {
        if (project.rawData[alt] !== undefined && project.rawData[alt] !== null && 
            project.rawData[alt] !== 'N/A' && project.rawData[alt] !== '') {
          return project.rawData[alt];
        }
      }
    }

    return null;
  };

  // Get the correct dates to display in timeline
  const contractDate = project.contractDate || null;
  const poDroppedDate = project.poDroppedDate || project.startDate || null; // Timeline Start
  const fabricationStart = getPhaseDate('fabricationStart');
  const assemblyStart = getPhaseDate('assemblyStart');
  const ntcTestingDate = getPhaseDate('ntcTestingDate');
  const qcStartDate = project.qcStartDate || null;
  const executiveReviewDate = getPhaseDate('executiveReviewDate');
  const shipDate = project.shipDate || null;
  const deliveryDate = getPhaseDate('deliveryDate');
  const wrapDate = getPhaseDate('wrapDate');

  // Only display if we have at least one phase date (including text values from localStorage)
  if (!contractDate && !poDroppedDate && !fabricationStart && !assemblyStart && !ntcTestingDate && 
      !qcStartDate && !executiveReviewDate && !shipDate && !deliveryDate && !wrapDate) {
    return null;
  }

  return (
    <div className="mt-6 bg-darkCard/50 border border-gray-800 rounded-lg p-3">
      <div className="text-sm text-gray-400 mb-2">Project Timeline</div>
      <div className="flex flex-wrap gap-3">
        {contractDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(contractDate, project.opContractDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-gray-400">CONTRACT DATE</div>
              <div className="text-sm font-medium">{formatDateOrText(contractDate)}</div>
              {project.opContractDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opContractDate)}</div>
              )}
            </div>
          </div>
        )}

        {poDroppedDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(poDroppedDate, project.opStartDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-gray-400">TIMELINE START</div>
              <div className="text-sm font-medium">{formatDateOrText(poDroppedDate)}</div>
              {project.opStartDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opStartDate)}</div>
              )}
            </div>
          </div>
        )}

        {fabricationStart && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(fabricationStart, project.opFabricationStart) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Hammer className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-xs text-gray-400">FAB START</div>
              <div className="text-sm font-medium">{formatDateOrText(fabricationStart)}</div>
              {project.opFabricationStart && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opFabricationStart)}</div>
              )}
            </div>
          </div>
        )}

        {assemblyStart && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(assemblyStart, project.opAssemblyStart) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Wrench className="h-4 w-4 text-indigo-400" />
            <div>
              <div className="text-xs text-gray-400">ASSEMBLY START</div>
              <div className="text-sm font-medium">{formatDateOrText(assemblyStart)}</div>
              {project.opAssemblyStart && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opAssemblyStart)}</div>
              )}
            </div>
          </div>
        )}

        {wrapDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(wrapDate, project.opWrapDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Package className="h-4 w-4 text-cyan-400" />
            <div>
              <div className="text-xs text-gray-400">WRAP DATE</div>
              <div className="text-sm font-medium">{formatDateOrText(wrapDate)}</div>
              {project.opWrapDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opWrapDate)}</div>
              )}
            </div>
          </div>
        )}

        {ntcTestingDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(ntcTestingDate, project.opNtcTestingDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <TestTube className="h-4 w-4 text-purple-400" />
            <div>
              <div className="text-xs text-gray-400">NTC TESTING</div>
              <div className="text-sm font-medium">{formatDateOrText(ntcTestingDate)}</div>
              {project.opNtcTestingDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opNtcTestingDate)}</div>
              )}
            </div>
          </div>
        )}

        {qcStartDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(qcStartDate, project.opQcStartDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <CheckSquare className="h-4 w-4 text-green-400" />
            <div>
              <div className="text-xs text-gray-400">QC START</div>
              <div className="text-sm font-medium">{formatDateOrText(qcStartDate)}</div>
              {project.opQcStartDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opQcStartDate)}</div>
              )}
            </div>
          </div>
        )}

        {executiveReviewDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(executiveReviewDate, project.opExecutiveReviewDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <CheckCircle className="h-4 w-4 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">EXECUTIVE REVIEW</div>
              <div className="text-sm font-medium">{formatDateOrText(executiveReviewDate)}</div>
              {project.opExecutiveReviewDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opExecutiveReviewDate)}</div>
              )}
            </div>
          </div>
        )}

        {shipDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(shipDate, project.opShipDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Truck className="h-4 w-4 text-orange-400" />
            <div>
              <div className="text-xs text-gray-400">SHIP</div>
              <div className="text-sm font-medium">{formatDateOrText(shipDate)}</div>
              {project.opShipDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opShipDate)}</div>
              )}
            </div>
          </div>
        )}

        {deliveryDate && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentDatePastOP(deliveryDate, project.opDeliveryDate) ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : 'bg-dark'}`}>
            <Navigation className="h-4 w-4 text-red-400" />
            <div>
              <div className="text-xs text-gray-400">DELIVERY</div>
              <div className="text-sm font-medium">{formatDateOrText(deliveryDate)}</div>
              {project.opDeliveryDate && (
                <div className="text-xs text-gray-500">OP: {formatOPDate(project.opDeliveryDate)}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};