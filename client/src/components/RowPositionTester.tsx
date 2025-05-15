import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface RowPositionTesterProps {
  schedules: any[];
  onScheduleChange: (
    scheduleId: number, 
    bayId: number, 
    startDate: string, 
    endDate: string, 
    totalHours?: number, 
    rowIndex?: number
  ) => Promise<any>;
}

/**
 * Component that tests the row positioning by automatically moving a project to a different row
 */
const RowPositionTester: React.FC<RowPositionTesterProps> = ({ 
  schedules,
  onScheduleChange
}) => {
  const { toast } = useToast();

  const runRowPositionTest = () => {
    // Find any project in Bay 1-2 for testing
    // First try to find any project already in Bay 1
    let testProject = schedules.find(s => s.bayId === 1);
    
    if (!testProject) {
      // If no projects in Bay 1, try Bay 2
      testProject = schedules.find(s => s.bayId === 2);
    }
    
    if (!testProject) {
      // If still no project, try to find any project in the schedule
      testProject = schedules[0];
    }
    
    if (!testProject) {
      toast({
        title: "Test Project Not Found",
        description: "Couldn't find any project in the schedule for testing",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Found test project:", testProject);
    
    // Log test initiation details
    console.log("🧪 RUNNING AUTOMATED DROP TEST");
    console.log("🧪 Selected test project:", testProject);
    
    // Determine current row and new target row
    const currentRow = testProject.row || 0;
    const targetRow = currentRow === 2 ? 1 : 2; // If row is 2, use 1, otherwise use 2
    
    console.log(`🧪 Current project state: Bay ${testProject.bayId}, Row ${currentRow}`);
    console.log(`🧪 Target position: Row ${targetRow}`);
    
    // Set global document test attributes for verification
    document.body.setAttribute('data-test-mode', 'true');
    document.body.setAttribute('data-test-project-id', testProject.id.toString());
    document.body.setAttribute('data-test-target-row', targetRow.toString());
    document.body.setAttribute('data-absolute-row-index', targetRow.toString());
    document.body.setAttribute('data-forced-row-index', targetRow.toString());
    document.body.setAttribute('data-exact-row-from-y', targetRow.toString());
    
    // Display test banner
    const testBanner = document.createElement('div');
    testBanner.style.position = 'fixed';
    testBanner.style.top = '60px';
    testBanner.style.left = '50%';
    testBanner.style.transform = 'translateX(-50%)';
    testBanner.style.padding = '10px 20px';
    testBanner.style.backgroundColor = 'rgba(234, 88, 12, 0.9)';
    testBanner.style.color = 'white';
    testBanner.style.borderRadius = '4px';
    testBanner.style.fontWeight = 'bold';
    testBanner.style.zIndex = '9999';
    testBanner.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    testBanner.innerHTML = `
      <div style="font-size:14px; text-align:center;">
        🧪 AUTOMATED ROW DROP TEST
      </div>
      <div style="font-size:12px;">
        Moving project ${testProject.projectNumber} from row ${currentRow} to row ${targetRow}
      </div>
    `;
    document.body.appendChild(testBanner);
    
    // Simulate moving project to target row in the same bay
    onScheduleChange(
      testProject.id,
      testProject.bayId,
      testProject.startDate,
      testProject.endDate,
      testProject.totalHours !== null ? Number(testProject.totalHours) : 1000,
      targetRow // Target row index (0-based)
    )
    .then(result => {
      console.log('🧪 ROW POSITION TEST RESULT:', result);
      
      // Important: Extract row value directly from the returned schedule object
      // This ensures we get the actual value stored in the database
      const resultData = result;
      
      console.log('🧪 COMPLETE RAW API RESPONSE:', result);
      
      // Get row from different possible locations in the response
      const returnedRow = 
        // Either from result directly (if it's the schedule object)
        (typeof result?.row === 'number' ? result.row : 
        // Or from result.data if wrapped
        (typeof result?.data?.row === 'number' ? result.data.row : 
        // Or from a nested schedule object (common pattern)
        (typeof result?.schedule?.row === 'number' ? result.schedule.row : 
        // Last resort, try to parse from string representation
        (result && typeof result === 'object' ? 
          (() => {
            try {
              const resultJson = JSON.stringify(result);
              const match = resultJson.match(/"row":(\d+)/);
              return match && match[1] ? parseInt(match[1]) : 'unknown';
            } catch (error) {
              console.error('Error parsing row from result:', error);
              return 'unknown';
            }
          })() : 'unknown'))));
          
      console.log('🧪 EXTRACTED ROW VALUE:', returnedRow);
      
      const verificationInfo = {
        projectNumber: testProject.projectNumber,
        projectId: testProject.id,
        bayId: testProject.bayId,
        requestedRow: targetRow,
        savedRow: returnedRow,
        matchStatus: returnedRow === targetRow ? '✅ EXACT MATCH' : '❌ MISMATCH'
      };
      
      console.log('🧪 ROW POSITION VERIFICATION:', verificationInfo);
      
      // Update banner with results
      testBanner.style.backgroundColor = returnedRow === targetRow 
        ? 'rgba(22, 163, 74, 0.9)' // Green if match
        : 'rgba(220, 38, 38, 0.9)'; // Red if mismatch
        
      testBanner.innerHTML = `
        <div style="font-size:14px; text-align:center;">
          ${returnedRow === targetRow ? '✅ ROW POSITION TEST PASSED' : '❌ ROW POSITION TEST FAILED'}
        </div>
        <div style="font-size:12px;">
          Project: ${testProject.projectNumber || testProject.id}<br>
          Requested Row: ${targetRow}<br>
          Actual Saved Row: ${returnedRow}<br>
          Bay: ${testProject.bayId}
        </div>
      `;
      
      // Clean up after 5 seconds
      setTimeout(() => {
        if (document.body.contains(testBanner)) {
          document.body.removeChild(testBanner);
        }
      }, 5000);
      
      toast({
        title: resultData?.row == targetRow ? "Test Passed" : "Test Failed",
        description: resultData?.row == targetRow ? 
          `Project was moved to exact row ${targetRow} as requested` : 
          `Expected row ${targetRow} but got row ${resultData?.row ?? 'unknown'}`,
        variant: resultData?.row == targetRow ? "default" : "destructive",
      });
    })
    .catch(error => {
      console.error('🧪 TEST ERROR:', error);
      
      if (document.body.contains(testBanner)) {
        document.body.removeChild(testBanner);
      }
      
      toast({
        title: "Test Failed",
        description: "Error during row position test. See console for details.",
        variant: "destructive"
      });
    });
  };

  return (
    <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded border border-gray-200">
      <Button
        variant="default"
        className="bg-amber-500 hover:bg-amber-600 text-white"
        onClick={runRowPositionTest}
      >
        🧪 Test Row Positioning
      </Button>
      <div className="text-xs text-gray-500">
        Tests pixel-perfect row positioning by automatically moving a project between rows
      </div>
    </div>
  );
};

export default RowPositionTester;