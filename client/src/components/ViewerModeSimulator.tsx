import React from 'react';

/**
 * ViewerModeSimulator has been completely disabled
 * This component now returns null in all environments
 * No view-only restrictions will be applied in development
 */
export const ViewerModeSimulator: React.FC = () => {
  // This component is completely disabled and does nothing
  return null;
};

export default ViewerModeSimulator;