# PTN API Integration Guide

## Current Issue
The PTN API currently returns project data as objects with numeric keys (e.g., `{"0":"2","1":"0","2":"2",...}`), making it impossible to extract meaningful project information.

## Required PTN API Response Format

### Projects Endpoint (`/api/export/projects`)
```json
{
  "projects": [
    {
      "id": "unique_project_id",
      "project_number": "805648",
      "project_name": "Mobile Forensic Lab Unit 12", 
      "description": "Brief project description",
      "status": "active|completed|in_progress|cancelled",
      "team_name": "Manufacturing Team Alpha",
      "priority": "HIGH|MEDIUM|LOW",
      "assigned_team": "Fabrication Team 1",
      "start_date": "2025-01-15",
      "estimated_completion": "2025-06-30"
    }
  ]
}
```

### Teams Endpoint (`/api/export/teams`)
```json
{
  "teams": [
    {
      "id": "team_id",
      "name": "Manufacturing Team Alpha",
      "members": 5,
      "current_project": "805648",
      "status": "active|inactive",
      "lead": "John Smith",
      "department": "Manufacturing"
    }
  ]
}
```

### Issues Endpoint (`/api/export/issues`)
```json
{
  "issues": [
    {
      "id": "issue_id",
      "project_id": "unique_project_id",
      "title": "Slide outs from Libby",
      "description": "Installation bracket alignment issues",
      "priority": "HIGH|MEDIUM|LOW",
      "status": "open|resolved|in_progress",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "created_date": "2025-01-20"
    }
  ]
}
```

### Summary Endpoint (`/api/export/summary`)
```json
{
  "summary": {
    "projects": {
      "total": 15,
      "active": 8,
      "completed": 5,
      "overdue": 2
    },
    "teams": {
      "total": 6,
      "active": 4,
      "utilization": 85
    },
    "issues": {
      "total": 25,
      "open": 18,
      "critical": 3,
      "high_priority": 12
    }
  }
}
```

## Benefits of This Format
1. **Structured Data**: Proper field names instead of numeric keys
2. **Project Names**: Real project titles instead of "Project undefined"
3. **Team Assignment**: Clear team-to-project relationships
4. **Issue Tracking**: Issues properly linked to specific projects
5. **Status Management**: Clear project and team status tracking

## Implementation Timeline
Once PTN API is updated to this format:
- Project names will display correctly
- Team assignments will show real data
- Issues will be properly categorized by project
- Status indicators will reflect actual project states
- All "Project undefined" displays will be resolved

## Testing
After API update, test with:
- `/api/ptn-projects` - Should show real project names
- `/api/ptn-production-status` - Should show accurate counts
- Meetings module Tier II tab - Should display structured project data