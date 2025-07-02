import React from 'react';
import { 
  LayoutDashboard, 
  Folders, 
  Building2, 
  DollarSign, 
  BarChart3, 
  Calendar, 
  Users, 
  CheckSquare, 
  ClipboardList, 
  Upload, 
  FileText, 
  Package, 
  Settings, 
  Wrench,
  Archive,
  Truck,
  Target,
  Filter,
  Search,
  Edit,
  Plus,
  Eye,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  PieChart,
  TrendingUp,
  Shield
} from 'lucide-react';
import { ModuleHelpContent } from '@/components/ModuleHelpButton';

// Dashboard Help Content
export const dashboardHelpContent: ModuleHelpContent = {
  title: "Dashboard",
  description: "Overview of your manufacturing operations and key metrics",
  icon: <LayoutDashboard className="h-5 w-5 text-blue-600" />,
  quickStart: [
    "View real-time project status cards showing active, completed, and at-risk projects",
    "Monitor manufacturing bay utilization and capacity through the visual schedule",
    "Check upcoming billing milestones and revenue forecasts",
    "Review high-priority tasks and notifications in the activity feed"
  ],
  sections: [
    {
      title: "Project Status Overview",
      icon: <Folders className="h-4 w-4" />,
      content: "The dashboard provides a comprehensive view of all active projects with status indicators, progress tracking, and risk assessment.",
      subsections: [
        {
          title: "Status Cards",
          content: "Color-coded cards show project health at a glance:",
          steps: [
            "Green: Projects on track with no issues",
            "Yellow: Projects with minor delays or attention needed",
            "Red: Critical projects requiring immediate action",
            "Click any card to view detailed project information"
          ]
        },
        {
          title: "Progress Tracking",
          content: "Visual progress bars show completion percentage across manufacturing phases:",
          steps: [
            "Fabrication progress based on start and target dates",
            "Production phase completion status",
            "Quality assurance and testing progress",
            "Final delivery timeline tracking"
          ]
        }
      ]
    },
    {
      title: "Manufacturing Bay Schedule",
      icon: <Building2 className="h-4 w-4" />,
      content: "Interactive visual schedule showing bay capacity and project assignments across your manufacturing facility.",
      subsections: [
        {
          title: "Bay Utilization",
          content: "Color-coded bars indicate current capacity usage:",
          steps: [
            "Green: Normal capacity (under 80%)",
            "Yellow: High capacity (80-100%)",
            "Red: Over capacity (above 100%)",
            "Click and drag to reschedule projects between bays"
          ]
        },
        {
          title: "Timeline View",
          content: "Switch between different time perspectives:",
          steps: [
            "Daily view for detailed short-term planning",
            "Weekly view for operational scheduling",
            "Monthly view for capacity planning",
            "Quarterly view for strategic resource allocation"
          ]
        }
      ]
    },
    {
      title: "Financial Metrics",
      icon: <DollarSign className="h-4 w-4" />,
      content: "Track billing milestones, revenue forecasts, and financial performance indicators.",
      subsections: [
        {
          title: "Billing Pipeline",
          content: "Monitor upcoming invoices and payment schedules:",
          steps: [
            "View milestone-based billing schedules",
            "Track payment status and overdue amounts",
            "Forecast monthly and quarterly revenue",
            "Identify potential cash flow issues"
          ]
        }
      ]
    }
  ],
  tips: [
    "Use the search bar in the navigation to quickly find specific projects or information",
    "Click on any metric card to drill down into detailed reports",
    "Set up email notifications for critical project status changes",
    "Customize your dashboard view by adjusting time ranges and filters"
  ],
  troubleshooting: [
    {
      issue: "Dashboard loading slowly or showing outdated information",
      solution: "Refresh the page or check your internet connection. Data updates every 5 minutes automatically."
    },
    {
      issue: "Can't see certain projects or bays in the schedule",
      solution: "Check your user permissions and department access settings in the Settings menu."
    }
  ]
};

// Projects Help Content
export const projectsHelpContent: ModuleHelpContent = {
  title: "Projects",
  description: "Comprehensive project management with tracking, scheduling, and collaboration tools",
  icon: <Folders className="h-5 w-5 text-blue-600" />,
  quickStart: [
    "View all active projects in the main table with sorting and filtering options",
    "Create new projects using the '+ New Project' button",
    "Edit project details by clicking the edit icon or double-clicking cells",
    "Track project progress through manufacturing phases and delivery milestones"
  ],
  sections: [
    {
      title: "Project Management",
      icon: <Edit className="h-4 w-4" />,
      content: "Create, edit, and manage projects throughout their entire lifecycle from initial planning to final delivery.",
      subsections: [
        {
          title: "Creating Projects",
          content: "Add new manufacturing projects to the system:",
          steps: [
            "Click 'New Project' button in the top toolbar",
            "Enter project number, name, and description",
            "Set customer information and project manager",
            "Define manufacturing phases and target dates",
            "Assign initial resources and priority level"
          ]
        },
        {
          title: "Editing Project Details",
          content: "Update project information inline or through detailed forms:",
          steps: [
            "Double-click any cell in the project table to edit",
            "Use the edit button for comprehensive project forms",
            "Track changes with automatic audit logging",
            "Set project status and progress milestones"
          ]
        },
        {
          title: "Project Status Tracking",
          content: "Monitor project health and progress indicators:",
          steps: [
            "Active: Projects currently in production",
            "On Hold: Temporarily paused projects",
            "Delivered: Successfully completed projects",
            "Cancelled: Terminated projects with documentation"
          ]
        }
      ]
    },
    {
      title: "Manufacturing Phases",
      icon: <Target className="h-4 w-4" />,
      content: "Track projects through each manufacturing phase with automated date calculations and progress monitoring.",
      subsections: [
        {
          title: "Phase Timeline",
          content: "Standard manufacturing phases with automatic scheduling:",
          steps: [
            "Fabrication Start: Initial manufacturing phase",
            "PAINT Start: Surface preparation and coating (7 days before production)",
            "Production Start: Main assembly and manufacturing",
            "IT Start: System integration and testing (7 days before NTC)",
            "NTC Testing: Network and compliance testing",
            "QC Start: Quality control and final inspection",
            "Ship Date: Delivery and logistics coordination"
          ]
        },
        {
          title: "Date Management",
          content: "Automated date calculations with manual override capabilities:",
          steps: [
            "Original Plan (OP) dates track initial scheduling",
            "Current dates reflect real-time adjustments",
            "Working day calculations exclude weekends",
            "Change requests trigger formal approval process"
          ]
        }
      ]
    },
    {
      title: "Collaboration Features",
      icon: <Users className="h-4 w-4" />,
      content: "Team collaboration tools for project communication and documentation.",
      subsections: [
        {
          title: "Notes and Documentation",
          content: "Comprehensive project documentation system:",
          steps: [
            "General project notes for overall communication",
            "Phase-specific notes (FAB, Production, etc.)",
            "Change request documentation",
            "Meeting notes and action items"
          ]
        },
        {
          title: "Team Assignments",
          content: "Assign team members and track responsibilities:",
          steps: [
            "Assign project managers and leads",
            "Set department responsibilities",
            "Track team workload and capacity",
            "Monitor task completion and deadlines"
          ]
        }
      ]
    }
  ],
  tips: [
    "Use the search and filter tools to quickly locate specific projects",
    "Set up automated email notifications for project milestone changes",
    "Export project data to Excel for external analysis and reporting",
    "Use the CCB (Change Control Board) process for formal schedule changes",
    "Color-coded status indicators help identify projects needing attention"
  ],
  troubleshooting: [
    {
      issue: "Unable to edit project dates or information",
      solution: "Check your user permissions. Only users with Editor or Admin roles can modify project data."
    },
    {
      issue: "Project dates not calculating correctly",
      solution: "Verify that working day calculations are properly configured and weekend exclusions are active."
    },
    {
      issue: "Can't see all projects in the list",
      solution: "Check filter settings and ensure you have access to all project categories through your user permissions."
    }
  ]
};

// Bay Scheduling Help Content
export const baySchedulingHelpContent: ModuleHelpContent = {
  title: "Bay Scheduling",
  description: "Visual manufacturing bay scheduling with drag-and-drop project management",
  icon: <Building2 className="h-5 w-5 text-blue-600" />,
  quickStart: [
    "View manufacturing bays in a visual timeline format",
    "Drag and drop projects between bays to reschedule",
    "Monitor bay capacity and utilization in real-time",
    "Create new manufacturing schedules by dragging unscheduled projects"
  ],
  sections: [
    {
      title: "Visual Scheduling",
      icon: <Calendar className="h-4 w-4" />,
      content: "Interactive drag-and-drop interface for managing manufacturing bay assignments and timelines.",
      subsections: [
        {
          title: "Bay Overview",
          content: "Visual representation of all manufacturing bays:",
          steps: [
            "Each bay shows current projects and capacity",
            "Color-coded bars indicate different projects",
            "Timeline view shows project duration and overlap",
            "Capacity indicators warn of over-scheduling"
          ]
        },
        {
          title: "Drag and Drop Scheduling",
          content: "Move projects between bays and time slots:",
          steps: [
            "Click and drag project bars to different bays",
            "Resize project duration by dragging edges",
            "Auto-calculation of manufacturing phases",
            "Conflict detection and resolution suggestions"
          ]
        },
        {
          title: "Capacity Management",
          content: "Monitor and optimize bay utilization:",
          steps: [
            "Real-time capacity calculations per bay",
            "Team-based scheduling for optimal workflow",
            "Utilization percentages and warnings",
            "Bottleneck identification and resolution"
          ]
        }
      ]
    },
    {
      title: "Timeline Views",
      icon: <Clock className="h-4 w-4" />,
      content: "Multiple time perspectives for different planning needs and operational requirements.",
      subsections: [
        {
          title: "Day View",
          content: "Detailed daily scheduling for immediate operations:",
          steps: [
            "Hour-by-hour project scheduling",
            "Resource allocation and team assignments",
            "Real-time progress tracking",
            "Immediate conflict resolution"
          ]
        },
        {
          title: "Week View", 
          content: "Weekly operational planning and coordination:",
          steps: [
            "Project start and completion within the week",
            "Cross-bay coordination and dependencies",
            "Resource planning and allocation",
            "Weekly capacity optimization"
          ]
        },
        {
          title: "Month View",
          content: "Strategic monthly capacity planning:",
          steps: [
            "Long-term project scheduling",
            "Capacity forecasting and planning",
            "Resource requirement analysis",
            "Strategic decision making support"
          ]
        }
      ]
    },
    {
      title: "Manufacturing Phases",
      icon: <Target className="h-4 w-4" />,
      content: "Detailed manufacturing phase management with visual progress indicators.",
      subsections: [
        {
          title: "Phase Visualization",
          content: "Color-coded phase representation within project bars:",
          steps: [
            "FAB phase: Blue section showing fabrication work",
            "PAINT phase: Green section for surface preparation",
            "PRODUCTION phase: Orange section for main assembly",
            "IT/NTC/QC phases: Final testing and quality phases"
          ]
        },
        {
          title: "Progress Tracking",
          content: "Real-time progress monitoring within each phase:",
          steps: [
            "Visual progress bars within each project",
            "Percentage completion indicators",
            "Phase handoff tracking",
            "Milestone achievement monitoring"
          ]
        }
      ]
    }
  ],
  tips: [
    "Use the timeline controls to switch between day, week, month, and quarter views",
    "Hold Shift while dragging to copy projects instead of moving them",
    "Right-click on project bars for quick action menus",
    "Use the search function to quickly locate specific projects in the schedule",
    "Color-coded capacity indicators help identify overloaded bays"
  ],
  troubleshooting: [
    {
      issue: "Can't drag projects between bays",
      solution: "Ensure you have Edit permissions and the project isn't locked. Try refreshing the page if drag functionality isn't working."
    },
    {
      issue: "Schedule showing incorrect dates after moving projects",
      solution: "Date calculations update automatically. If dates appear wrong, check project constraints and dependencies."
    },
    {
      issue: "Bay capacity showing as over 100% but projects fit",
      solution: "Capacity calculations include team workload. Multiple projects in one bay may exceed 100% based on team assignments."
    }
  ]
};

// Meetings Help Content
export const meetingsHelpContent: ModuleHelpContent = {
  title: "Meetings Dashboard",
  description: "Meeting management, project readiness tracking, and critical issue resolution",
  icon: <Calendar className="h-5 w-5 text-purple-600" />,
  quickStart: [
    "Schedule meetings with team members and stakeholders using the Create Meeting button",
    "Monitor Tier III projects ready for production handoff in the Project Readiness tab",
    "Track Tier IV critical issues requiring immediate attention and escalation",
    "Review PTN integration data for real-time production status updates"
  ],
  sections: [
    {
      title: "Meeting Scheduling",
      icon: <Calendar className="h-4 w-4" />,
      content: "Create and manage meetings with automatic agenda generation and attendee notifications. Schedule regular project reviews, milestone discussions, and critical issue resolution sessions."
    },
    {
      title: "Tier II Production Overview",
      icon: <BarChart3 className="h-4 w-4" />,
      content: "Monitor overall production metrics and team performance through PTN integration. View real-time production status, active alerts, and critical issues across all manufacturing teams."
    },
    {
      title: "Tier III Project Readiness",
      icon: <CheckSquare className="h-4 w-4" />,
      content: "Track projects approaching key handoff dates within the next 10 days. Monitor fabrication progress with interactive progress bars, manage FAB notes, and ensure smooth transitions between manufacturing phases."
    },
    {
      title: "Tier IV Critical Issues",
      icon: <AlertTriangle className="h-4 w-4" />,
      content: "Manage high-priority projects with delivery dates within 5 days or critical status. Track elevated concerns, schedule change requests, and coordinate immediate action items."
    },
    {
      title: "CCB Management",
      icon: <Shield className="h-4 w-4" />,
      content: "Submit and track Change Control Board requests for project schedule modifications. Monitor approval status and implementation of approved changes across all project phases."
    }
  ],
  features: [
    {
      name: "Meeting Creation",
      description: "Schedule meetings with customizable agendas, automatic attendee invitations, and integration with project timelines"
    },
    {
      name: "Project Progress Tracking",
      description: "Interactive FAB progress bars with manual adjustment capabilities and automatic date-based calculations"
    },
    {
      name: "Critical Issue Escalation",
      description: "Automated escalation workflows for projects approaching delivery deadlines or facing critical roadblocks"
    },
    {
      name: "PTN Integration",
      description: "Real-time production data integration showing team status, alerts, and manufacturing metrics"
    },
    {
      name: "FAB Notes Management",
      description: "Dedicated fabrication notes for projects in active FAB phase with clear separation from general project notes"
    }
  ],
  workflows: [
    {
      title: "Schedule Project Review Meeting",
      steps: [
        "Click 'Create Meeting' button in the Meetings tab",
        "Select meeting type and add relevant attendees",
        "Set agenda items focusing on project milestones",
        "Schedule recurring meetings for ongoing projects",
        "Send invitations and track attendance"
      ]
    },
    {
      title: "Track Project Readiness",
      steps: [
        "Review Tier III projects in the Project Readiness tab",
        "Monitor projects approaching handoff dates",
        "Update FAB progress using interactive progress bars",
        "Add fabrication-specific notes for active FAB projects",
        "Coordinate handoff meetings with receiving teams"
      ]
    },
    {
      title: "Manage Critical Issues",
      steps: [
        "Identify Tier IV projects with critical status",
        "Review elevated concerns and action items",
        "Submit CCB requests for schedule changes if needed",
        "Track resolution progress and update stakeholders",
        "Document lessons learned for future projects"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "PTN data not loading",
      solution: "Check network connectivity and PTN system status. Data refreshes automatically every 5 minutes during business hours."
    },
    {
      issue: "FAB progress not updating",
      solution: "Ensure project has valid fabrication start and assembly start dates. Progress is calculated based on current date relative to these milestones."
    },
    {
      issue: "Meeting invitations not sending",
      solution: "Verify email addresses and check email service configuration. Ensure all attendees have valid email addresses in the system."
    }
  ]
};

// Manufacturing Help Content
export const manufacturingHelpContent: ModuleHelpContent = {
  title: "Manufacturing Bay Schedule",
  description: "Manage and track production schedules and bay assignments",
  icon: <Building2 className="h-5 w-5 text-orange-600" />,
  quickStart: [
    "View overall bay utilization and capacity metrics in the stats cards",
    "Use the Gantt chart to visualize project timelines and identify conflicts",
    "Filter schedules by date range, bay, or project status",
    "Access AI insights for optimization recommendations"
  ],
  sections: [
    {
      title: "Bay Utilization Overview",
      icon: <Building2 className="h-4 w-4" />,
      content: "Monitor real-time bay utilization, capacity planning, and resource allocation across all manufacturing bays with visual indicators for optimal efficiency."
    },
    {
      title: "Schedule Management",
      icon: <Calendar className="h-4 w-4" />,
      content: "Create, modify, and track manufacturing schedules with drag-and-drop functionality. Identify conflicts and optimize resource allocation across multiple projects."
    },
    {
      title: "Gantt Chart Visualization",
      icon: <BarChart3 className="h-4 w-4" />,
      content: "Interactive timeline view showing project schedules, dependencies, and critical path analysis for better production planning and coordination."
    },
    {
      title: "AI Insights",
      icon: <Target className="h-4 w-4" />,
      content: "Leverage AI-powered recommendations for schedule optimization, conflict resolution, and capacity planning to improve overall manufacturing efficiency."
    }
  ],
  workflows: [
    {
      title: "Schedule New Project",
      steps: [
        "Select available bay from the utilization overview",
        "Use Gantt chart to identify optimal time slots",
        "Drag project onto schedule or use manual entry",
        "Verify no conflicts with existing schedules",
        "Confirm resource availability and capacity"
      ]
    },
    {
      title: "Optimize Bay Utilization",
      steps: [
        "Review utilization metrics in overview cards",
        "Identify underutilized or overbooked bays",
        "Use AI insights for optimization suggestions",
        "Adjust schedules to balance workload",
        "Monitor impact on overall efficiency"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Schedule conflicts appearing",
      solution: "Use the conflict detection system to identify overlapping schedules. Adjust start/end times or reassign to different bays."
    },
    {
      issue: "Bay utilization showing incorrect data",
      solution: "Ensure all schedules have accurate start/end dates and verify bay capacity settings in the system configuration."
    }
  ]
};

// Reports Help Content
export const reportsHelpContent: ModuleHelpContent = {
  title: "Reports & Analytics",
  description: "Comprehensive reporting and analytics for all aspects of your manufacturing operations",
  icon: <BarChart3 className="h-5 w-5 text-green-600" />,
  quickStart: [
    "Select report type from the tabs: Financial, Project Status, Manufacturing, Future Predictions, or Analytics",
    "Use time range filters to focus on specific periods (3 months, 6 months, year-to-date)",
    "Export reports in multiple formats including CSV, PDF, and DOCX",
    "Monitor key metrics through interactive charts and visualizations"
  ],
  sections: [
    {
      title: "Financial Reports",
      icon: <DollarSign className="h-4 w-4" />,
      content: "Track billing milestones, revenue forecasts, and financial performance with detailed breakdowns by project, time period, and payment status."
    },
    {
      title: "Project Status Analytics",
      icon: <Folders className="h-4 w-4" />,
      content: "Monitor project health, delivery performance, and schedule adherence with comprehensive project lifecycle analysis and risk assessment."
    },
    {
      title: "Manufacturing Performance",
      icon: <Building2 className="h-4 w-4" />,
      content: "Analyze bay utilization, production efficiency, and manufacturing capacity with real-time metrics and historical trend analysis."
    },
    {
      title: "Future Predictions",
      icon: <TrendingUp className="h-4 w-4" />,
      content: "Forecast bay availability, capacity planning, and delivery predictions for the next 6 months with AI-powered analytics."
    },
    {
      title: "Nomad GCS Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      content: "Internal performance tracking including phase handoff analysis, schedule change control, and delivery variance reporting."
    }
  ],
  workflows: [
    {
      title: "Generate Monthly Financial Report",
      steps: [
        "Select 'Financial Reports' tab",
        "Set time range to last month or custom period",
        "Review billing milestone status and revenue metrics",
        "Export report in preferred format (PDF/CSV)",
        "Share with stakeholders via email or download"
      ]
    },
    {
      title: "Analyze Manufacturing Efficiency",
      steps: [
        "Navigate to 'Manufacturing Performance' tab",
        "Review bay utilization charts and capacity metrics",
        "Identify bottlenecks or underutilized resources",
        "Access Future Predictions for capacity planning",
        "Generate recommendations for optimization"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Charts not loading data",
      solution: "Ensure date ranges are valid and data exists for the selected period. Check network connectivity and refresh the page."
    },
    {
      issue: "Export functionality not working",
      solution: "Verify browser allows downloads and check for popup blockers. Try a different export format if one fails."
    },
    {
      issue: "Prediction data appears inaccurate",
      solution: "Predictions are based on current project schedules. Update project timelines and manufacturing schedules for more accurate forecasts."
    }
  ]
};

// My Tasks Help Content
export const myTasksHelpContent: ModuleHelpContent = {
  title: "My Tasks",
  description: "Manage all your assigned tasks across projects, meetings, and concerns",
  icon: <CheckSquare className="h-5 w-5 text-green-600" />,
  quickStart: [
    "View all your assigned tasks in one centralized location",
    "Filter tasks by status, priority, or type to focus your work",
    "Use the search bar to quickly find specific tasks",
    "Click task cards to navigate directly to related projects or meetings"
  ],
  sections: [
    {
      title: "Task Dashboard",
      icon: <CheckSquare className="h-4 w-4" />,
      content: "Overview of all your assigned tasks with status tracking and organization.",
      subsections: [
        {
          title: "Task Status Overview",
          content: "Quick view of your task distribution:",
          steps: [
            "Total tasks shows your complete workload",
            "Active tasks need immediate attention",
            "Pending tasks are waiting to be started",
            "In Progress shows your current work",
            "Completed tasks track your accomplishments",
            "Overdue tasks require urgent attention"
          ]
        },
        {
          title: "Task Types",
          content: "Different categories of tasks you may be assigned:",
          steps: [
            "Project Tasks: Specific work items within manufacturing projects",
            "Meeting Tasks: Action items and follow-ups from meetings",
            "Elevated Concerns: High-priority issues requiring attention"
          ]
        }
      ]
    },
    {
      title: "Filtering & Search",
      icon: <Filter className="h-4 w-4" />,
      content: "Powerful tools to organize and find your tasks efficiently.",
      subsections: [
        {
          title: "Status Filters",
          content: "Filter tasks by their current status:",
          steps: [
            "All Status: View every task regardless of completion",
            "Active: See only pending and in-progress tasks",
            "Completed: Review your finished work",
            "Overdue: Focus on tasks past their due date"
          ]
        },
        {
          title: "Priority Filters",
          content: "Organize tasks by importance level:",
          steps: [
            "Urgent: Critical tasks requiring immediate attention",
            "High: Important tasks with significant impact",
            "Medium: Standard priority tasks",
            "Low: Tasks that can be completed when time allows"
          ]
        },
        {
          title: "Type Filters",
          content: "Focus on specific types of work:",
          steps: [
            "Project Tasks: Manufacturing and project-related work",
            "Meeting Tasks: Follow-ups and action items from meetings",
            "Elevated Concerns: Critical issues and concerns"
          ]
        }
      ]
    },
    {
      title: "Task Management",
      icon: <Calendar className="h-4 w-4" />,
      content: "Tools for organizing and prioritizing your work effectively.",
      subsections: [
        {
          title: "Sorting Options",
          content: "Organize tasks to match your workflow:",
          steps: [
            "Sort by Priority: See most important tasks first",
            "Sort by Due Date: Focus on upcoming deadlines",
            "Sort by Created Date: View tasks in chronological order",
            "Use ascending or descending order as needed"
          ]
        },
        {
          title: "Task Information",
          content: "Each task card provides essential details:",
          steps: [
            "Task title and description for clarity",
            "Due date with overdue indicators",
            "Priority level with color coding",
            "Project or meeting context",
            "Assignment information showing who assigned the task"
          ]
        }
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Tasks not appearing in the list",
      solution: "Check your filter settings and search query. Use 'Clear Filters' to reset all filters if needed."
    },
    {
      issue: "Recently assigned tasks not showing",
      solution: "Refresh the page to load the latest task assignments. Tasks may take a moment to sync across the system."
    },
    {
      issue: "Cannot access task details or related projects",
      solution: "Verify you have proper permissions for the associated project or meeting. Contact your administrator if access issues persist."
    },
    {
      issue: "Task counts don't match what you see in the list",
      solution: "Task counts include all tasks while the list may be filtered. Check your filter settings or clear filters to see all tasks."
    }
  ],
  tips: [
    "Use the priority filter to focus on urgent and high-priority tasks first",
    "Check the overdue section regularly to stay on top of missed deadlines",
    "The task counter in the header shows your active task count at all times",
    "Project numbers and meeting references help you quickly identify task context",
    "Clear filters regularly to ensure you're seeing all your assigned tasks"
  ]
};

// Billing Milestones Help Content
export const billingHelpContent: ModuleHelpContent = {
  title: "Billing Milestones",
  description: "Manage project billing milestones and track financial progress",
  icon: <DollarSign className="h-5 w-5 text-green-600" />,
  quickStart: [
    "View all billing milestones across projects with status and amounts",
    "Track invoice generation and payment status for each milestone",
    "Filter milestones by status, date range, or project to focus on specific items",
    "Generate financial reports and export billing data"
  ],
  sections: [
    {
      title: "Milestone Overview",
      icon: <DollarSign className="h-4 w-4" />,
      content: "Track all billing milestones with comprehensive financial status monitoring and payment tracking.",
      subsections: [
        {
          title: "Milestone Status",
          content: "Understanding different milestone states:",
          steps: [
            "Pending: Milestones not yet due or invoiced",
            "Ready: Milestones ready for invoice generation",
            "Invoiced: Invoices sent to customers",
            "Paid: Completed milestones with payments received"
          ]
        }
      ]
    },
    {
      title: "Financial Reporting",
      icon: <BarChart3 className="h-4 w-4" />,
      content: "Generate comprehensive financial reports and track revenue metrics across all projects."
    }
  ],
  workflows: [
    {
      title: "Process Monthly Billing",
      steps: [
        "Review all milestones due for the current month",
        "Verify milestone completion and deliverables",
        "Generate invoices for ready milestones",
        "Track payment status and follow up on overdue items",
        "Export billing reports for accounting"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Milestones not showing expected amounts",
      solution: "Verify project billing configuration and milestone percentages. Check if project total amounts are correctly set."
    },
    {
      issue: "Invoice generation failing",
      solution: "Ensure all required project and customer information is complete. Check for missing billing addresses or terms."
    }
  ]
};

// On Time Delivery Help Content
export const onTimeDeliveryHelpContent: ModuleHelpContent = {
  title: "On Time Delivery",
  description: "Monitor project delivery performance and schedule adherence",
  icon: <Clock className="h-5 w-5 text-blue-600" />,
  quickStart: [
    "Track delivery performance across all active and completed projects",
    "Identify projects at risk of schedule delays",
    "Monitor phase handoff performance and timeline adherence",
    "Generate delivery performance reports and analytics"
  ],
  sections: [
    {
      title: "Delivery Tracking",
      icon: <Clock className="h-4 w-4" />,
      content: "Monitor project delivery timelines and identify schedule risks with real-time tracking and alerts.",
      subsections: [
        {
          title: "Schedule Status",
          content: "Project delivery status indicators:",
          steps: [
            "On Time: Projects meeting scheduled delivery dates",
            "At Risk: Projects showing potential for delays",
            "Delayed: Projects past their scheduled delivery",
            "Completed: Successfully delivered projects"
          ]
        }
      ]
    },
    {
      title: "Performance Analytics",
      icon: <TrendingUp className="h-4 w-4" />,
      content: "Analyze delivery trends, identify bottlenecks, and track improvement over time."
    }
  ],
  workflows: [
    {
      title: "Weekly Delivery Review",
      steps: [
        "Review all projects with upcoming delivery dates",
        "Identify projects showing schedule risks",
        "Coordinate with manufacturing teams on critical projects",
        "Update delivery forecasts and customer communications",
        "Generate weekly delivery status reports"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Delivery dates not updating",
      solution: "Ensure project schedules are properly maintained. Check manufacturing schedule updates and milestone completion."
    },
    {
      issue: "Performance metrics showing incorrect data",
      solution: "Verify project delivery dates are accurate and manufacturing schedules are up to date."
    }
  ]
};

// Delivered Projects Help Content
export const deliveredProjectsHelpContent: ModuleHelpContent = {
  title: "Delivered Projects",
  description: "Review completed projects and analyze delivery performance",
  icon: <CheckSquare className="h-5 w-5 text-green-600" />,
  quickStart: [
    "Browse all successfully delivered projects with completion details",
    "Analyze delivery performance against original schedules",
    "Review project outcomes and customer satisfaction metrics",
    "Export delivery data for performance analysis"
  ],
  sections: [
    {
      title: "Project Archive",
      icon: <Archive className="h-4 w-4" />,
      content: "Complete record of delivered projects with detailed completion information and performance metrics.",
      subsections: [
        {
          title: "Delivery Metrics",
          content: "Key performance indicators for completed projects:",
          steps: [
            "Actual vs. Planned delivery dates",
            "Manufacturing phase completion times",
            "Quality metrics and customer satisfaction",
            "Cost performance and profitability analysis"
          ]
        }
      ]
    },
    {
      title: "Performance Analysis",
      icon: <PieChart className="h-4 w-4" />,
      content: "Analyze delivery trends and identify improvement opportunities through historical data review."
    }
  ],
  workflows: [
    {
      title: "Monthly Delivery Review",
      steps: [
        "Filter projects delivered in the target month",
        "Review delivery performance against schedules",
        "Identify successful practices and areas for improvement",
        "Generate monthly delivery performance reports",
        "Share insights with manufacturing and project teams"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Missing projects in delivered list",
      solution: "Verify project status is properly set to 'Delivered' and delivery dates are recorded."
    },
    {
      issue: "Performance metrics appear incorrect",
      solution: "Check project timeline data and ensure all manufacturing phases have accurate completion dates."
    }
  ]
};

// Benchmarks Help Content
export const benchmarksHelpContent: ModuleHelpContent = {
  title: "Benchmarks",
  description: "Track supply chain performance and vendor benchmarks",
  icon: <Target className="h-5 w-5 text-purple-600" />,
  quickStart: [
    "Monitor vendor performance and supply chain metrics",
    "Track delivery times, quality ratings, and cost performance",
    "Compare suppliers and identify top performers",
    "Generate supplier scorecards and performance reports"
  ],
  sections: [
    {
      title: "Vendor Performance",
      icon: <Truck className="h-4 w-4" />,
      content: "Comprehensive tracking of supplier performance across quality, delivery, and cost metrics.",
      subsections: [
        {
          title: "Performance Metrics",
          content: "Key supplier evaluation criteria:",
          steps: [
            "On-time delivery rates and reliability",
            "Quality scores and defect rates",
            "Cost competitiveness and pricing trends",
            "Responsiveness and communication quality"
          ]
        }
      ]
    },
    {
      title: "Supply Chain Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      content: "Analyze supply chain trends and identify optimization opportunities for cost and performance."
    }
  ],
  workflows: [
    {
      title: "Quarterly Supplier Review",
      steps: [
        "Collect performance data for all active suppliers",
        "Calculate benchmark scores and rankings",
        "Identify top performers and underperformers",
        "Generate supplier scorecards and feedback",
        "Plan supplier development or replacement actions"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Benchmark data not updating",
      solution: "Ensure supplier performance data is being regularly recorded. Check data collection processes and automation."
    },
    {
      issue: "Incomplete supplier comparisons",
      solution: "Verify all suppliers have complete performance data. Update missing information for accurate benchmarking."
    }
  ]
};

// Material Management Help Content
export const materialManagementHelpContent: ModuleHelpContent = {
  title: "Material Management",
  description: "Track inventory, materials, and supply chain operations",
  icon: <Package className="h-5 w-5 text-orange-600" />,
  quickStart: [
    "Monitor inventory levels and material availability",
    "Track material movements and job assignments",
    "Manage material status through production phases",
    "Generate inventory reports and material forecasts"
  ],
  sections: [
    {
      title: "Inventory Tracking",
      icon: <Package className="h-4 w-4" />,
      content: "Real-time visibility into material inventory with status tracking and availability monitoring.",
      subsections: [
        {
          title: "Material Status",
          content: "Different stages of material processing:",
          steps: [
            "IN QC: Materials undergoing quality inspection",
            "IN WORK: Materials actively being processed",
            "Inventory Job Cart: Materials prepared for projects",
            "SHIPPED: Materials delivered to customers"
          ]
        }
      ]
    },
    {
      title: "Supply Planning",
      icon: <TrendingUp className="h-4 w-4" />,
      content: "Forecast material needs and plan procurement based on production schedules and inventory levels."
    }
  ],
  workflows: [
    {
      title: "Weekly Inventory Review",
      steps: [
        "Check inventory levels against minimum stock requirements",
        "Review material movements and project assignments",
        "Identify materials needed for upcoming projects",
        "Generate purchase orders for low-stock items",
        "Update material forecasts and planning data"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Material status not updating",
      solution: "Verify material movements are being properly recorded. Check system integrations and data entry processes."
    },
    {
      issue: "Inventory counts don't match physical stock",
      solution: "Perform cycle counts and reconcile discrepancies. Update system records to match physical inventory."
    }
  ]
};

// Engineering Help Content
export const engineeringHelpContent: ModuleHelpContent = {
  title: "Engineering Resource Planner",
  description: "Manage engineering resources and project assignments",
  icon: <Wrench className="h-5 w-5 text-blue-600" />,
  quickStart: [
    "View engineering team capacity and project assignments",
    "Track engineering phase progress across projects",
    "Manage resource allocation and workload balancing",
    "Monitor engineering deliverables and timelines"
  ],
  sections: [
    {
      title: "Resource Planning",
      icon: <Users className="h-4 w-4" />,
      content: "Optimize engineering team assignments and track capacity utilization across all active projects.",
      subsections: [
        {
          title: "Team Capacity",
          content: "Engineering resource management:",
          steps: [
            "Monitor individual engineer workloads",
            "Track project phase assignments",
            "Identify resource conflicts and bottlenecks",
            "Plan future resource needs"
          ]
        }
      ]
    },
    {
      title: "Project Tracking",
      icon: <ClipboardList className="h-4 w-4" />,
      content: "Monitor engineering deliverables and ensure timely completion of design and development phases."
    }
  ],
  workflows: [
    {
      title: "Resource Allocation Review",
      steps: [
        "Review current engineering assignments",
        "Identify upcoming project requirements",
        "Assess team capacity and availability",
        "Reallocate resources to balance workloads",
        "Update project timelines based on resource availability"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Resource conflicts showing for same engineer",
      solution: "Review project timelines and adjust assignments. Consider splitting tasks or adjusting schedules to resolve conflicts."
    },
    {
      issue: "Team capacity calculations appear incorrect",
      solution: "Verify engineer availability and project assignment data. Check for overlapping assignments or missing time allocations."
    }
  ]
};

// Import Data Help Content
export const importDataHelpContent: ModuleHelpContent = {
  title: "Import Data",
  description: "Import project data and information from external sources",
  icon: <Upload className="h-5 w-5 text-green-600" />,
  quickStart: [
    "Import project data from CSV and Excel files",
    "Bulk upload manufacturing schedules and assignments",
    "Import billing milestones and financial data",
    "Validate imported data before system integration"
  ],
  sections: [
    {
      title: "Data Import",
      icon: <Upload className="h-4 w-4" />,
      content: "Bulk import capabilities for projects, schedules, and financial data with validation and error handling.",
      subsections: [
        {
          title: "Import Types",
          content: "Supported data import formats:",
          steps: [
            "Project data: Basic project information and details",
            "Manufacturing schedules: Bay assignments and timelines",
            "Billing milestones: Financial milestones and amounts",
            "Team assignments: Resource allocation and responsibilities"
          ]
        }
      ]
    },
    {
      title: "Data Validation",
      icon: <Shield className="h-4 w-4" />,
      content: "Comprehensive validation ensures data integrity and identifies errors before import completion."
    }
  ],
  workflows: [
    {
      title: "Project Data Import",
      steps: [
        "Prepare data file using provided templates",
        "Select appropriate import type and file",
        "Review validation results and fix any errors",
        "Confirm import and monitor processing status",
        "Verify imported data accuracy in the system"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Import failing with validation errors",
      solution: "Review error messages and fix data formatting issues. Ensure all required fields are properly filled."
    },
    {
      issue: "Imported data not appearing in system",
      solution: "Check import status and logs. Verify data was successfully processed and refresh the relevant modules."
    }
  ]
};

// Export Data Help Content
export const exportDataHelpContent: ModuleHelpContent = {
  title: "Export Data",
  description: "Export reports and data in various formats",
  icon: <Download className="h-5 w-5 text-purple-600" />,
  quickStart: [
    "Export project data and reports in CSV, PDF, and Excel formats",
    "Generate custom reports with filtered data",
    "Schedule automated report generation and delivery",
    "Share reports with stakeholders and team members"
  ],
  sections: [
    {
      title: "Report Generation",
      icon: <FileText className="h-4 w-4" />,
      content: "Comprehensive reporting capabilities with multiple export formats and customization options.",
      subsections: [
        {
          title: "Export Formats",
          content: "Available export options:",
          steps: [
            "CSV: Spreadsheet-compatible data for analysis",
            "PDF: Professional reports for sharing",
            "Excel: Advanced formatting and calculations",
            "Word: Detailed documentation and reports"
          ]
        }
      ]
    },
    {
      title: "Custom Reports",
      icon: <Settings className="h-4 w-4" />,
      content: "Create customized reports with specific data filters, date ranges, and formatting preferences."
    }
  ],
  workflows: [
    {
      title: "Monthly Report Generation",
      steps: [
        "Select report type and data scope",
        "Set date range and filter criteria",
        "Choose export format and customization options",
        "Generate report and review output",
        "Distribute reports to relevant stakeholders"
      ]
    }
  ],
  troubleshooting: [
    {
      issue: "Export process taking too long",
      solution: "Reduce data scope or date range. Consider breaking large exports into smaller batches."
    },
    {
      issue: "Exported data missing information",
      solution: "Check filter settings and ensure all required data is included in the export criteria."
    }
  ]
};

// Calendar Help Content
export const calendarHelpContent: ModuleHelpContent = {
  title: "Calendar",
  description: "Schedule and manage project timelines, meetings, and important dates",
  icon: <Calendar className="h-5 w-5 text-purple-600" />,
  quickStart: [
    "View project schedules and key milestones in a calendar format",
    "Schedule meetings and project reviews with team members",
    "Track important deadlines and delivery dates",
    "Coordinate manufacturing bay schedules with project timelines"
  ],
  sections: [
    {
      title: "Calendar View",
      icon: <Calendar className="h-4 w-4" />,
      content: "Visual timeline management for projects, meetings, and manufacturing schedules with drag-and-drop functionality.",
      subsections: [
        {
          title: "View Options",
          content: "Different calendar display modes:",
          steps: [
            "Month view: Complete overview of all events and deadlines",
            "Week view: Detailed daily schedule with hourly breakdowns",
            "Day view: Focus on specific dates with detailed scheduling",
            "Agenda view: List format showing upcoming events chronologically"
          ]
        }
      ]
    },
    {
      title: "Event Management",
      icon: <Plus className="h-4 w-4" />,
      content: "Create and manage meetings, project milestones, and manufacturing deadlines with automated notifications."
    }
  ],
  workflows: [
    {
      title: "Weekly Schedule Review",
      steps: [
        "Open calendar in week view for the upcoming week",
        "Review all scheduled meetings and project deadlines",
        "Check for scheduling conflicts and resource availability",
        "Add new meetings or adjust existing schedules as needed",
        "Send calendar updates to relevant team members"
      ]
    }
  ],
  tips: [
    "Use color coding to differentiate between project types and priorities",
    "Set reminder notifications for critical deadlines and meetings",
    "Sync calendar with manufacturing bay schedules for better coordination"
  ],
  troubleshooting: [
    {
      issue: "Calendar events not displaying correctly",
      solution: "Refresh the page and verify your time zone settings in user preferences."
    },
    {
      issue: "Unable to schedule meetings",
      solution: "Check that you have appropriate permissions and all required attendees are available."
    }
  ]
};

// Priorities Help Content
export const prioritiesHelpContent: ModuleHelpContent = {
  title: "Priorities",
  description: "Manage project priorities and urgent task assignments",
  icon: <Target className="h-5 w-5 text-red-600" />,
  quickStart: [
    "Set and adjust project priority levels based on urgency and impact",
    "Track high-priority tasks requiring immediate attention",
    "Manage priority access permissions for different user roles",
    "Monitor priority changes and their impact on schedules"
  ],
  sections: [
    {
      title: "Priority Management",
      icon: <Target className="h-4 w-4" />,
      content: "Systematic approach to prioritizing projects and tasks based on business impact, deadlines, and resource availability.",
      subsections: [
        {
          title: "Priority Levels",
          content: "Standard priority classification system:",
          steps: [
            "Critical: Immediate action required, significant business impact",
            "High: Important projects with tight deadlines",
            "Medium: Standard priority projects with normal timelines",
            "Low: Non-urgent projects that can be deferred if needed"
          ]
        }
      ]
    },
    {
      title: "Access Control",
      icon: <Shield className="h-4 w-4" />,
      content: "Manage who can view and modify priority-sensitive projects based on role permissions and departmental access."
    }
  ],
  workflows: [
    {
      title: "Priority Assessment",
      steps: [
        "Review all active projects and their current status",
        "Assess business impact and customer requirements",
        "Evaluate resource availability and schedule constraints",
        "Assign appropriate priority levels to each project",
        "Communicate priority changes to affected teams"
      ]
    }
  ],
  tips: [
    "Regularly review and update priorities based on changing business needs",
    "Consider both deadline urgency and strategic business value when setting priorities",
    "Use priority filters to focus on the most critical tasks first"
  ],
  troubleshooting: [
    {
      issue: "Cannot access priority management features",
      solution: "Verify you have appropriate user permissions. Contact your administrator if access is needed."
    },
    {
      issue: "Priority changes not reflected in project views",
      solution: "Refresh the page or clear browser cache. Priority updates may take a few moments to sync."
    }
  ]
};

// Quality Assurance Help Content
export const qualityAssuranceHelpContent: ModuleHelpContent = {
  title: "Quality Assurance",
  description: "Manage quality control processes, non-conformance reports, and corrective actions",
  icon: <CheckSquare className="h-5 w-5 text-green-600" />,
  quickStart: [
    "Create and track non-conformance reports (NCRs) for quality issues",
    "Manage corrective and preventive actions (CAPA) for process improvements",
    "Monitor quality metrics and compliance standards across projects",
    "Generate quality reports and audit documentation"
  ],
  sections: [
    {
      title: "Non-Conformance Reports",
      icon: <AlertTriangle className="h-4 w-4" />,
      content: "Document and track quality issues through the complete resolution process with automated workflows.",
      subsections: [
        {
          title: "NCR Process",
          content: "Standard workflow for quality issue resolution:",
          steps: [
            "Identify and document the non-conformance issue",
            "Assign responsibility and set resolution timeline",
            "Implement corrective actions and verify effectiveness",
            "Close NCR with approval and documentation",
            "Follow up with preventive measures if needed"
          ]
        }
      ]
    },
    {
      title: "Quality Metrics",
      icon: <BarChart3 className="h-4 w-4" />,
      content: "Track quality performance indicators, defect rates, and compliance metrics across all manufacturing processes."
    },
    {
      title: "Corrective Actions",
      icon: <Wrench className="h-4 w-4" />,
      content: "Implement and monitor corrective and preventive actions to address root causes and prevent recurrence of quality issues."
    }
  ],
  workflows: [
    {
      title: "Quality Issue Resolution",
      steps: [
        "Create NCR documenting the specific quality issue",
        "Assign to appropriate team member for investigation",
        "Analyze root cause and develop corrective action plan",
        "Implement corrections and verify effectiveness",
        "Document resolution and update quality metrics",
        "Implement preventive measures to avoid recurrence"
      ]
    }
  ],
  tips: [
    "Document all quality issues thoroughly with photos and detailed descriptions",
    "Assign realistic timelines for corrective action completion",
    "Follow up on completed actions to ensure long-term effectiveness"
  ],
  troubleshooting: [
    {
      issue: "Cannot create new NCR",
      solution: "Verify you have quality assurance permissions and all required fields are completed."
    },
    {
      issue: "Quality metrics not updating",
      solution: "Ensure all NCRs are properly closed and verified. Contact system administrator if data sync issues persist."
    }
  ]
};

// Export all help content
export const moduleHelpRegistry = {
  dashboard: dashboardHelpContent,
  projects: projectsHelpContent,
  'bay-scheduling': baySchedulingHelpContent,
  meetings: meetingsHelpContent,
  manufacturing: manufacturingHelpContent,
  reports: reportsHelpContent,
  'my-tasks': myTasksHelpContent,
  billing: billingHelpContent,
  'on-time-delivery': onTimeDeliveryHelpContent,
  'delivered-projects': deliveredProjectsHelpContent,
  benchmarks: benchmarksHelpContent,
  'material-management': materialManagementHelpContent,
  engineering: engineeringHelpContent,
  import: importDataHelpContent,
  'export-reports': exportDataHelpContent,
  calendar: calendarHelpContent,
  priorities: prioritiesHelpContent,
  'quality-assurance': qualityAssuranceHelpContent
};