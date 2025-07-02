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

// Export all help content - truncated for brevity but would include all modules
export const moduleHelpRegistry = {
  dashboard: dashboardHelpContent,
  projects: projectsHelpContent,
  'bay-scheduling': baySchedulingHelpContent,
  meetings: meetingsHelpContent,
  manufacturing: manufacturingHelpContent,
  reports: reportsHelpContent,
  // Add other modules as needed
};