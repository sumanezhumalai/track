# Features & Modules Dashboard and Analytics System Design

## 1. Executive Summary

This specification outlines the architecture, data models, endpoints, UI components, and testing strategy for introducing a comprehensive **Dashboard** and **Analytics** system for the **Features & Modules** domain in the EGS Support application.

### Key Capabilities
- **Operational Dashboard (`/dashboard`)**:
  - Segmented control on the header to toggle seamlessly between **Features & Modules** (default) and **Support Sessions**.
  - **Role-Aware Presentation**:
    - **Admins**: View organization-wide metrics across all project initiatives, active module pipeline health, overdue/approaching deadlines, and system activity.
    - **Developers**: View a personalized operational queue showing their assigned modules, active work-in-progress, subtask completion velocity, and urgent deadlines with one-click navigation to the relevant project Kanban boards.
- **Admin Team Analytics (`/analytics`)**:
  - Top-level 2-state toggle switching between **Modules Analytics** (default) and **Sessions Analytics**.
  - **Modules Analytics Studio**:
    - **Multi-Dimensional Filter Toolbar**: Filter by Project, Version, Member/Assignee, Status, Priority, and Date Horizon.
    - **Tier 1 (KPI Summary Strip)**: Total in Scope, Completion Rate %, Active WIP, Overdue / At-Risk %, and Subtask Execution Velocity.
    - **Tier 2 (Workflow Pipeline & Priority Distribution)**: Stacked Bar Chart for `ToBeDone`, `start` (In Dev), `testing`, and `production` sliced by Priority (High, Medium, Low).
    - **Tier 3 (Engineer Workload & Delivery Velocity)**: Grouped Bar Chart per Developer showing In-Dev, Testing, and Completed modules.
    - **Tier 4 (Initiative Progress & Telemetry Matrix)**: Initiative delivery progress gauges plus an interactive, searchable table with subtask completion meters, status badges, overdue indicators, and direct Kanban board links.

---

## 2. Backend Architecture & API Specifications

### 2.1 Security & Access Control
- In `SecurityConfig.java`:
  - `GET /api/kanban/dashboard/stats`: Permitted for all authenticated users (`ROLE_ADMIN` and `ROLE_DEV`).
  - `/api/analytics/**`: Strictly restricted to `hasRole("ADMIN")`.

### 2.2 Endpoints

#### Endpoint 1: Role-Aware Dashboard Statistics
- **URL**: `GET /api/kanban/dashboard/stats`
- **Access**: All Authenticated Users (`ROLE_ADMIN` or `ROLE_DEV`)
- **Controller**: `com.something.support.controller.ModuleController` or `AnalyticsController`
- **Response Structure (`DashboardStatsResponse`)**:
  ```json
  {
    "isAdmin": true,
    "adminStats": {
      "totalProjects": 5,
      "totalModules": 42,
      "toBeDoneCount": 10,
      "inProgressCount": 18,
      "testingCount": 6,
      "productionCount": 8,
      "highPriorityCount": 12,
      "mediumPriorityCount": 20,
      "lowPriorityCount": 10,
      "overdueCount": 3,
      "completionRate": 19.0,
      "recentActivity": [
        {
          "moduleId": 14,
          "title": "OAuth SSO Integration",
          "projectId": 2,
          "projectName": "EGS Support",
          "versionId": 1,
          "versionLabel": "v1.0.0",
          "status": "start",
          "priority": "high",
          "assignedTo": "alice",
          "dueDate": "2026-11-02",
          "updatedAt": "2026-10-29T10:15:00"
        }
      ]
    },
    "devStats": null
  }
  ```
  *When called by an engineer (`ROLE_DEV`), `devStats` is populated and `adminStats` is null:*
  ```json
  {
    "isAdmin": false,
    "adminStats": null,
    "devStats": {
      "devName": "alice",
      "myProjectsCount": 3,
      "myAssignedModulesCount": 9,
      "myToBeDone": 2,
      "myInProgress": 4,
      "myTesting": 1,
      "myCompleted": 2,
      "myOverdueCount": 1,
      "myCompletedSubtasks": 14,
      "myTotalSubtasks": 20,
      "mySubtaskProgress": 70,
      "myUpcomingDeadlines": [
        {
          "moduleId": 14,
          "title": "OAuth SSO Integration",
          "projectId": 2,
          "projectName": "EGS Support",
          "versionId": 1,
          "versionLabel": "v1.0.0",
          "status": "start",
          "priority": "high",
          "assignedTo": "alice",
          "dueDate": "2026-11-02",
          "updatedAt": "2026-10-29T10:15:00"
        }
      ]
    }
  }
  ```

#### Endpoint 2: Admin Deep Modules Analytics
- **URL**: `GET /api/analytics/modules`
- **Access**: Admin only (`ROLE_ADMIN`)
- **Query Parameters**:
  - `projectId` (Long, optional)
  - `versionId` (Long, optional)
  - `devName` (String, optional)
  - `status` (ModuleStatus enum, optional: `ToBeDone`, `start`, `testing`, `production`)
  - `priority` (String, optional: `high`, `medium`, `low`)
  - `from` (LocalDateTime, optional: ISO-8601)
  - `to` (LocalDateTime, optional: ISO-8601)
- **Response Structure (`ModuleAnalyticsResponse`)**:
  ```json
  {
    "summary": {
      "totalModules": 35,
      "completedModules": 12,
      "completionRate": 34.3,
      "activeWipCount": 15,
      "overdueCount": 2,
      "overdueRate": 5.7,
      "totalSubtasks": 80,
      "completedSubtasks": 52,
      "subtaskVelocity": 65.0
    },
    "pipelineDistribution": [
      { "status": "ToBeDone", "total": 8, "high": 2, "medium": 4, "low": 2 },
      { "status": "start", "total": 10, "high": 5, "medium": 3, "low": 2 },
      { "status": "testing", "total": 5, "high": 2, "medium": 2, "low": 1 },
      { "status": "production", "total": 12, "high": 3, "medium": 6, "low": 3 }
    ],
    "priorityBreakdown": [
      { "priority": "high", "count": 12, "percentage": 34.3 },
      { "priority": "medium", "count": 15, "percentage": 42.9 },
      { "priority": "low", "count": 8, "percentage": 22.8 }
    ],
    "developerWorkload": [
      {
        "devName": "alice",
        "assignedTotal": 14,
        "toBeDone": 3,
        "inProgress": 5,
        "testing": 2,
        "completed": 4,
        "overdueCount": 1,
        "subtasksDone": 22,
        "subtasksTotal": 30
      }
    ],
    "projectProgress": [
      {
        "projectId": 2,
        "projectName": "EGS Support",
        "totalModules": 25,
        "completedModules": 10,
        "progressPercentage": 40.0
      }
    ],
    "filteredModules": [
      {
        "moduleId": 14,
        "title": "OAuth SSO Integration",
        "projectId": 2,
        "projectName": "EGS Support",
        "versionId": 1,
        "versionLabel": "v1.0.0",
        "status": "start",
        "priority": "high",
        "assignedTo": "alice",
        "assigneeDevNames": ["alice", "bob"],
        "dueDate": "2026-11-02",
        "isOverdue": false,
        "completedSubtasks": 3,
        "totalSubtasks": 4,
        "subtaskProgress": 75,
        "updatedAt": "2026-10-29T10:15:00"
      }
    ]
  }
  ```

### 2.3 Backend Implementation Architecture
1. **`com.something.support.service.ModuleAnalyticsService`**:
   - Executes optimized JPQL queries via `ModuleRepository` and `ProjectMemberRepository`.
   - Filters modules using dynamic CriteriaBuilder or Specification to support flexible combinations of query params.
   - Computes overdue status using `dueDate < current_date` and `status != 'production'`.
   - Calculates progress percentage avoiding zero-division (`total == 0 ? 0 : Math.round(...)`).
2. **`com.something.support.repository.ModuleRepository` additions**:
   - Query for user-specific assigned modules across primary `assignedTo` and `module_assignee`.
   - Dynamic query method for filtering modules with project, version, assignee, status, priority, and date bounds.

---

## 3. Frontend UI/UX Architecture

### 3.1 Design Tokens & Greenhouse Aesthetic
- Font: Untitled Sans / Inter with clean tracking (`font-untitled`).
- Color Tokens:
  - Base Background: `#FAFAF9` / `bg-stone-50`
  - Card Surface: `#FFFFFF` / `border border-gh-border`
  - Deep Brand Greens: Forest `#1B7F4A`, Emerald `#0E6237`, Dark Jade `#145C35`
  - Status Accents:
    - `ToBeDone`: Stone slate `#64748B` / `bg-stone-100 text-stone-700`
    - `start` (In Dev): Blue emerald `#0369A1` / `bg-sky-50 text-sky-700 border-sky-200`
    - `testing`: Purple violet `#6D28D9` / `bg-purple-50 text-purple-700 border-purple-200`
    - `production`: Forest green `#15803D` / `bg-emerald-50 text-emerald-800 border-emerald-200`
  - Overdue warning: Amber/Crimson `#DC2626` / `bg-red-50 text-red-700 border-red-200`

### 3.2 Dashboard Page (`frontend/src/pages/Dashboard.jsx`)
- **Header Segmented Control**:
  - `[ Features & Modules ]` | `[ Support Sessions ]`
  - Persisted in `localStorage.getItem('egs_dashboard_active_tab')` (defaults to `modules`).
- **Features & Modules View (`frontend/src/components/dashboard/ModulesDashboardView.jsx`)**:
  - **Admin View**:
    - **KPI Strip**: 4 metrics (Active Initiatives, Total Workload, Overall Delivery %, Overdue Attention).
    - **2-Column Pipeline Meter**: Visual distribution of modules across `ToBeDone`, `start`, `testing`, `production` with priority breakdown badges.
    - **1-Column Action Center**: Tabs for "Approaching Deadlines / Overdue" and "Recent Activity" with one-click links to the Kanban board (`/features/:projectId/modules`).
  - **Developer View**:
    - **Personal KPI Strip**: 4 metrics (My Assigned Modules, In Active Progress, My Completion Velocity %, Pending Subtasks).
    - **2-Column Personal Pipeline**: Visual status meter of their assigned tasks.
    - **1-Column Action Center**: "My Urgent Tasks" list with deadline badges and direct link to their board.
- **Support Sessions View**:
  - Unaltered display of session metrics, 7-day BarChart, and live active session timers.

### 3.3 Team Analytics Page (`frontend/src/pages/TeamAnalytics.jsx`)
- **Admin-Only Page**:
  - Top 2-state toggle: `[ Modules Analytics ]` | `[ Sessions Analytics ]`.
  - Persisted in local state (`viewMode = 'modules'`).
- **Modules Analytics View (`frontend/src/components/analytics/ModulesAnalyticsView.jsx`)**:
  - **Toolbar Filter**:
    - Project selector (fetches all active projects).
    - Version selector (cascading: populates versions when project is selected, disabled when `All Projects` is active).
    - Member / Assignee selector (fetches all devSupport users).
    - Status selector (`All`, `ToBeDone`, `In Dev`, `Testing`, `Production`).
    - Priority selector (`All`, `High`, `Med`, `Low`).
    - Date Horizon presets (`Past 7 Days`, `Past 30 Days`, `All Time`, `Custom`).
    - Clear Filters button when active.
  - **Tier 1 (5 KPI Cards)**:
    - Total in Scope, Completion Rate %, Work in Progress, Overdue Rate %, Subtask Velocity %.
  - **Tier 2 (Pipeline & Priority Distribution)**:
    - Stacked Bar Chart displaying column counts layered by priority (High / Medium / Low).
  - **Tier 3 (Developer Workload & Velocity)**:
    - Grouped Bar Chart displaying modules per developer (Development vs QA vs Completed).
  - **Tier 4 (Initiative Health & Filtered Telemetry Matrix)**:
    - Project progress completion meters.
    - Searchable table: Module ID, Title, Project, Version, Status badge, Priority badge, Assignee avatars, Subtask meter (`3/4 (75%)`), Due date with overdue alert pill, and Open Board link.
- **Sessions Analytics View**:
  - Preserved session duration graphs, AE share donut, and session telemetry table.

---

## 4. Error Handling & Resilience
1. **Division by Zero Protection**: All percentage calculations guard against empty collections (`count === 0 ? 0 : Math.round(...)`).
2. **Missing or Null Fields**: Safe defaults for optional fields (e.g. `dueDate`, `releaseNotes`, `description`).
3. **Empty States**: Clear UI empty states with contextual guidance when no cards exist for a project or filters yield zero results.
4. **Cascading Filter Validation**: When the project filter changes, the version filter resets automatically to avoid mismatched versions.
5. **Token & Session Resilience**: Full compliance with the existing Axios 401 response interceptor and role checks.

---

## 5. Verification & Testing Strategy
1. **Backend Verification**:
   - `GET /api/kanban/dashboard/stats`:
     - Test execution with `ROLE_ADMIN` authentication; verify org-wide counts match database counts.
     - Test execution with `ROLE_DEV` authentication; verify user isolation (only returns modules assigned to that developer).
   - `GET /api/analytics/modules`:
     - Test query without parameters (returns all modules across all projects).
     - Test query with `projectId` and `versionId` filters.
     - Test query with `devName` filter.
     - Verify overdue calculations against cards with past due dates.
     - Test access restriction: Non-admin calling `/api/analytics/modules` receives `403 Forbidden`.
2. **Frontend UI Verification**:
   - Verify `/dashboard` segmented tab switcher switches between Modules and Sessions cleanly without layout shift.
   - Verify `/dashboard` rendering under admin account vs developer account.
   - Verify `/analytics` 2-state toggle switches between Modules and Sessions.
   - Verify all cascading filters on the Modules Analytics toolbar (Project -> Version -> Dev).
   - Verify Recharts rendering (stacked bars, grouped bars, tooltips) without console errors.
   - Verify table search and direct navigation links to `/features/:projectId/modules`.
