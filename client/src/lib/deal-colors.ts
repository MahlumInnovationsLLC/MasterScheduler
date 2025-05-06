/**
 * Returns the appropriate CSS color class based on the deal stage
 */
export function getDealStageColor(stage: string): string {
  switch (stage) {
    case 'verbal_commit':
      return 'bg-orange-100 text-orange-800 border-orange-500';
    case 'site_core_activity':
      return 'bg-pink-100 text-pink-800 border-pink-500';
    case 'submit_decide':
      return 'bg-purple-100 text-purple-800 border-purple-500';
    case 'project_launch':
      return 'bg-blue-100 text-blue-800 border-blue-500';
    case 'not_started':
      return 'bg-gray-100 text-gray-800 border-gray-500';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-500';
  }
}

/**
 * Returns the appropriate CSS color class based on the priority
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-500';
    case 'high':
      return 'bg-amber-100 text-amber-800 border-amber-500';
    case 'medium':
      return 'bg-gray-100 text-gray-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}