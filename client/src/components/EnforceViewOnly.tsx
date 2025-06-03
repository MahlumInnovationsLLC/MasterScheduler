import React from 'react';

/**
 * This component is now disabled to prevent View Only mode enforcement
 * All authentication is handled through the proper auth system
 */
export const EnforceViewOnly: React.FC = () => {
  // Component disabled - no view-only mode enforcement
  console.log('EnforceViewOnly component is disabled - no restrictions applied');
  return null;
};

export default EnforceViewOnly;