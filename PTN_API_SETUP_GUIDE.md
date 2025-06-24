# PTN API Setup Guide

The TIER IV Pro application is trying to connect to your PTN (Production Tracking Network) system but is receiving HTML responses instead of JSON data. Here's how to fix this:

## Current Issue
- PTN endpoints are returning HTML instead of JSON
- URLs being tested: `https://ptn.nomadgcsai.com/api/export/*`
- Expected endpoints that should return JSON data:
  - `/api/export/projects`
  - `/api/export/teams`
  - `/api/export/issues`
  - `/api/export/alerts`
  - `/api/export/summary`
  - `/api/export/status`

## Required PTN Server Configuration

### 1. API Endpoints Setup
Your PTN server needs to expose these REST API endpoints:

```
GET /api/export/projects
GET /api/export/teams
GET /api/export/issues
GET /api/export/alerts
GET /api/export/summary
GET /api/export/status
```

### 2. Expected JSON Response Format

**Projects endpoint (`/api/export/projects`):**
```json
[
  {
    "id": "project-123",
    "name": "Project Name",
    "description": "Project description",
    "status": "active|warning|complete",
    "progress": 75,
    "priority": "HIGH|MEDIUM|LOW",
    "teamId": "team-1"
  }
]
```

**Teams endpoint (`/api/export/teams`):**
```json
[
  {
    "id": "team-1", 
    "name": "Team Name",
    "status": "active|inactive",
    "members": 5,
    "currentProject": "Project Name",
    "efficiency": 85,
    "lead": "Team Lead Name"
  }
]
```

**Issues endpoint (`/api/export/issues`):**
```json
[
  {
    "id": "issue-1",
    "title": "Issue Title", 
    "description": "Issue description",
    "severity": "HIGH|MEDIUM|LOW",
    "projectId": "project-123",
    "reportedAt": "2025-06-24T10:00:00Z",
    "status": "open|in_progress|resolved"
  }
]
```

**Summary endpoint (`/api/export/summary`):**
```json
{
  "totalActiveProjects": 3,
  "totalTeamNeeds": 12,
  "pendingNeeds": 4,
  "partsTracked": 156,
  "projects": {
    "active": 3,
    "warning": 1,
    "total": 3
  },
  "teamNeeds": {
    "totalNeeds": 12,
    "pending": 4,
    "fulfilled": 8
  },
  "lastUpdated": "2025-06-24T16:00:00Z"
}
```

### 3. Server Configuration Requirements

**Content-Type Headers:**
- All API responses must return `Content-Type: application/json`
- Currently returning `Content-Type: text/html; charset=UTF-8`

**CORS Configuration:**
```javascript
// Enable CORS for the TIER IV Pro application
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
  next();
});
```

**API Key Authentication:**
- Accept `X-API-Key` header for authentication
- Validate the key before returning data

### 4. Quick Fix Options

**Option A: Create API Middleware**
If your PTN system doesn't have these endpoints, create a middleware layer:

```javascript
// Express.js example
app.get('/api/export/projects', (req, res) => {
  // Query your PTN database
  const projects = getProjectsFromDatabase();
  res.json(projects);
});

app.get('/api/export/teams', (req, res) => {
  const teams = getTeamsFromDatabase();
  res.json(teams);
});
```

**Option B: Update Existing Endpoints**
If you have existing endpoints, ensure they:
1. Return JSON instead of HTML
2. Use the expected URL paths
3. Include proper CORS headers

### 5. Testing Your API

Test your endpoints with curl:
```bash
curl -H "X-API-Key: your-api-key" \
     -H "Accept: application/json" \
     https://ptn.nomadgcsai.com/api/export/projects

# Should return JSON, not HTML
```

### 6. Debugging Steps

1. **Check your PTN server logs** when TIER IV Pro makes requests
2. **Verify the URLs** - ensure `/api/export/*` paths exist
3. **Test authentication** - verify X-API-Key header is processed
4. **Check routing** - ensure requests reach the correct handlers
5. **Validate JSON output** - use a JSON validator on your responses

## Common Issues

1. **HTML instead of JSON**: API endpoints are returning web pages instead of data
2. **404 Not Found**: API endpoints don't exist at expected paths
3. **CORS errors**: Missing CORS headers blocking requests
4. **Authentication failures**: X-API-Key not being validated properly

## Next Steps

1. Implement the missing API endpoints in your PTN system
2. Ensure they return proper JSON responses
3. Test with the curl commands above
4. Update TIER IV Pro connection settings if needed

Once your PTN API endpoints are properly configured and returning JSON data, the TIER IV Pro application will automatically connect and display your production data in the Meetings Dashboard.