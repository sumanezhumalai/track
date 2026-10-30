# Features & Modules Dashboard and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate a high-performance Dashboard and Analytics system for the "Features & Modules" domain, featuring role-aware operational metrics on the Dashboard and a comprehensive 4-tier drill-down analytics suite on the Admin Analytics page.

**Architecture:** A dedicated Spring Boot aggregation service (`ModuleAnalyticsService`) powers two endpoints: a role-aware `GET /api/kanban/dashboard/stats` (accessible to all authenticated users) and a multi-dimensional filtered `GET /api/analytics/modules` (admin only). In React, `/dashboard` gains a clean segmented tab switcher with role-adaptive views (Admin org overview vs Developer personalized queue), while `/analytics` gains a 2-state toggle with cascading filter toolbars, Recharts visualizations (pipeline stacked bar, dev workload grouped bar), and an interactive telemetry matrix.

**Tech Stack:** Java 17+, Spring Boot 3, Spring Data JPA, PostgreSQL (schema `EGS`), Spring Security, React 19, Tailwind CSS, Recharts 3, Lucide React, Vite, Axios.

**Spec:** `docs/superpowers/specs/2026-10-29-features-modules-dashboard-analytics-design.md`

## Global Constraints
- Database schema is strictly PostgreSQL `EGS` schema; `module_status` enum has 4 states: `ToBeDone`, `start`, `testing`, `production`.
- Keep `/api/analytics/**` strictly restricted to `ROLE_ADMIN` in Spring Security.
- Allow all authenticated users (`ROLE_ADMIN` and `ROLE_DEV`) to access `GET /api/kanban/dashboard/stats`.
- Percentage computations must guard against empty sets (`total == 0 ? 0 : Math.round(...)`) to prevent `NaN` or divide-by-zero.
- Frontend must follow the Greenhouse stone/emerald design tokens and remain responsive without horizontal overflow.

## Review Focus
1. **User Isolation on Developer Dashboard**: Verify that non-admin engineers calling `GET /api/kanban/dashboard/stats` only see stats for modules they are assigned to (either primary `assignedTo` or in `module_assignee`), never leaking other developers' private queues.
2. **Overdue Calculation Boundary**: Modules with `dueDate < today` must only be counted as overdue if `status != 'production'`. Once marked `production`, they are resolved and not overdue.
3. **Empty Filter / Zero-State Gracefulness**: When an initiative has zero modules or when filters match zero records, the API must return clean empty lists and zeroed summary counts rather than null pointer exceptions.
4. **Cascading Filter Invalidation**: When an admin selects a different Project in the Analytics filter toolbar, the Version dropdown must reset to "All Versions" and reload the newly selected project's versions.
5. **Dashboard State Persistence**: Switching between "Features & Modules" and "Support Sessions" on `/dashboard` must persist in `localStorage` so refreshing the browser retains the user's view.

---

### Task 1: DTO Models for Dashboard Stats and Module Analytics

**Files:**
- Create: `src/main/java/com/something/support/dto/DashboardStatsResponse.java`
- Create: `src/main/java/com/something/support/dto/ModuleAnalyticsResponse.java`
- Test: `src/test/java/com/something/support/dto/DtoSerializationTest.java`

**Interfaces:**
- Produces:
  - `DashboardStatsResponse`: Record containing `boolean isAdmin`, `AdminStats adminStats`, `DevStats devStats`.
    - `AdminStats`: `long totalProjects`, `long totalModules`, `long toBeDoneCount`, `long inProgressCount`, `long testingCount`, `long productionCount`, `long highPriorityCount`, `long mediumPriorityCount`, `long lowPriorityCount`, `long overdueCount`, `double completionRate`, `List<RecentModuleItem> recentActivity`.
    - `DevStats`: `String devName`, `long myProjectsCount`, `long myAssignedModulesCount`, `long myToBeDone`, `long myInProgress`, `long myTesting`, `long myCompleted`, `long myOverdueCount`, `long myCompletedSubtasks`, `long myTotalSubtasks`, `int mySubtaskProgress`, `List<RecentModuleItem> myUpcomingDeadlines`.
    - `RecentModuleItem`: `Long moduleId`, `String title`, `Long projectId`, `String projectName`, `Long versionId`, `String versionLabel`, `String status`, `String priority`, `String assignedTo`, `LocalDate dueDate`, `LocalDateTime updatedAt`.
  - `ModuleAnalyticsResponse`: Record containing `SummaryKpis summary`, `List<PipelineDistributionItem> pipelineDistribution`, `List<PriorityBreakdownItem> priorityBreakdown`, `List<DeveloperWorkloadItem> developerWorkload`, `List<ProjectProgressItem> projectProgress`, `List<FilteredModuleItem> filteredModules`.

- [x] **Step 1: Write DTO serialization test**
Create `src/test/java/com/something/support/dto/DtoSerializationTest.java` verifying Jackson can serialize and deserialize both `DashboardStatsResponse` and `ModuleAnalyticsResponse` without errors.

- [x] **Step 2: Run test to verify it fails**
Run: `mvn test -Dtest=DtoSerializationTest`
Expected: Compilation failure because classes do not exist yet.

- [x] **Step 3: Implement `DashboardStatsResponse` and `ModuleAnalyticsResponse`**
Create `src/main/java/com/something/support/dto/DashboardStatsResponse.java` and `src/main/java/com/something/support/dto/ModuleAnalyticsResponse.java` with the exact nested record definitions specified in the design doc.

- [x] **Step 4: Run test to verify it passes**
Run: `mvn test -Dtest=DtoSerializationTest`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add src/main/java/com/something/support/dto/DashboardStatsResponse.java src/main/java/com/something/support/dto/ModuleAnalyticsResponse.java src/test/java/com/something/support/dto/DtoSerializationTest.java
git commit -m "feat(analytics): add DTO models for dashboard stats and module analytics"
```

---

### Task 2: Repository Queries in `ModuleRepository`

**Files:**
- Modify: `src/main/java/com/something/support/repository/ModuleRepository.java`
- Modify: `src/main/java/com/something/support/repository/ProjectMemberRepository.java`
- Test: `src/test/java/com/something/support/repository/ModuleAnalyticsRepositoryTest.java`

**Interfaces:**
- Consumes: `Module`, `Project`, `ProjectVersion`, `ProjectMember` entities.
- Produces:
  - `ModuleRepository.countByStatus(ModuleStatus status)`
  - `ModuleRepository.countByPriority(String priority)`
  - `ModuleRepository.findAllAssignedToDev(String devName)`
  - `ModuleRepository.findRecentUpdated(Pageable pageable)`
  - `ModuleRepository.findUpcomingDeadlinesForDev(String devName, LocalDate today, Pageable pageable)`
  - `ModuleRepository.countOverdue(LocalDate today)`
  - `ModuleRepository.countOverdueForDev(String devName, LocalDate today)`

- [x] **Step 1: Write failing repository query tests**
Create `src/test/java/com/something/support/repository/ModuleAnalyticsRepositoryTest.java` querying counts by status, overdue counts, and assigned modules for dev.

- [x] **Step 2: Run repository query test to verify it fails**
Run: `mvn test -Dtest=ModuleAnalyticsRepositoryTest`
Expected: FAIL due to missing query methods.

- [x] **Step 3: Implement query methods in `ModuleRepository` and `ProjectMemberRepository`**
Add the count and lookup methods with optimized JPQL queries:
- Count modules where status is X.
- Count modules where `dueDate < :today` and `status != com.something.support.enums.ModuleStatus.production`.
- Dev lookup: `(m.assignedTo = :devName OR EXISTS (SELECT 1 FROM ModuleAssignee ma WHERE ma.module = m AND ma.devName = :devName))`.

- [x] **Step 4: Run test to verify it passes**
Run: `mvn test -Dtest=ModuleAnalyticsRepositoryTest`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add src/main/java/com/something/support/repository/ModuleRepository.java src/main/java/com/something/support/repository/ProjectMemberRepository.java src/test/java/com/something/support/repository/ModuleAnalyticsRepositoryTest.java
git commit -m "feat(kanban): add repository query methods for module analytics and dashboard metrics"
```

---

### Task 3: `ModuleAnalyticsService` Implementation

**Files:**
- Create: `src/main/java/com/something/support/service/ModuleAnalyticsService.java`
- Test: `src/test/java/com/something/support/service/ModuleAnalyticsServiceTest.java`

**Interfaces:**
- Consumes: `ModuleRepository`, `ProjectRepository`, `ProjectVersionRepository`, `ProjectMemberRepository`, `DevSupportRepository`.
- Produces:
  - `DashboardStatsResponse getDashboardStats(String devName, boolean isAdmin)`
  - `ModuleAnalyticsResponse getModuleAnalytics(Long projectId, Long versionId, String devName, ModuleStatus status, String priority, LocalDateTime from, LocalDateTime to)`

- [x] **Step 1: Write failing service tests**
Create `src/test/java/com/something/support/service/ModuleAnalyticsServiceTest.java` testing:
- `getDashboardStats` as Admin (returns all projects, global counts, overdue counts).
- `getDashboardStats` as Dev (returns only dev's assigned modules, pending subtasks, upcoming deadlines).
- `getModuleAnalytics` with multiple filter criteria and verify summary calculations.

- [x] **Step 2: Run service test to verify it fails**
Run: `mvn test -Dtest=ModuleAnalyticsServiceTest`
Expected: Compilation failure because `ModuleAnalyticsService` does not exist.

- [x] **Step 3: Implement `ModuleAnalyticsService`**
Create `src/main/java/com/something/support/service/ModuleAnalyticsService.java`:
- For `getDashboardStats`:
  - If Admin: aggregates system-wide stats across all active projects, calculates completion rate, queries top 5 recently updated modules.
  - If Dev: queries modules assigned to `devName`, calculates their personal WIP (`start` + `testing`), calculates subtask completion percentage, queries top 5 upcoming deadlines.
- For `getModuleAnalytics`:
  - Dynamically builds filtered stream or specification based on `projectId`, `versionId`, `devName`, `status`, `priority`, `from`, `to`.
  - Computes `SummaryKpis` (total, completed, completion rate %, WIP, overdue count, overdue rate %, subtask velocity %).
  - Computes `PipelineDistribution` (per-status totals with priority counts).
  - Computes `DeveloperWorkload` (per-developer counts of ToBeDone, InProgress, Testing, Completed, Overdue, Subtasks).
  - Computes `ProjectProgress` (per-project completion percentage).
  - Maps `FilteredModuleItem` list for the matrix table.

- [x] **Step 4: Run service test to verify it passes**
Run: `mvn test -Dtest=ModuleAnalyticsServiceTest`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add src/main/java/com/something/support/service/ModuleAnalyticsService.java src/test/java/com/something/support/service/ModuleAnalyticsServiceTest.java
git commit -m "feat(analytics): implement ModuleAnalyticsService for dashboard and deep analytics"
```

---

### Task 4: Controller Endpoints & Security Integration

**Files:**
- Modify: `src/main/java/com/something/support/controller/AnalyticsController.java`
- Modify: `src/main/java/com/something/support/controller/ModuleController.java`
- Modify: `src/main/java/com/something/support/config/SecurityConfig.java`
- Test: `src/test/java/com/something/support/controller/AnalyticsControllerIntegrationTest.java`

**Interfaces:**
- Produces:
  - `GET /api/kanban/dashboard/stats`: returns `DashboardStatsResponse` (Authenticated for Admin and Dev).
  - `GET /api/analytics/modules`: returns `ModuleAnalyticsResponse` (Admin only).

- [x] **Step 1: Write integration tests for endpoints**
Create `src/test/java/com/something/support/controller/AnalyticsControllerIntegrationTest.java`:
- Admin requesting `/api/kanban/dashboard/stats` receives 200 with `adminStats != null`.
- Dev requesting `/api/kanban/dashboard/stats` receives 200 with `devStats != null` and `adminStats == null`.
- Admin requesting `/api/analytics/modules` receives 200 with full analytics response.
- Dev requesting `/api/analytics/modules` receives 403 Forbidden.

- [x] **Step 2: Run integration tests to verify failure**
Run: `mvn test -Dtest=AnalyticsControllerIntegrationTest`
Expected: FAIL.

- [x] **Step 3: Update `AnalyticsController`, `ModuleController`, and `SecurityConfig`**
- In `AnalyticsController.java`:
  - Add `GET /api/analytics/modules` taking optional `@RequestParam` for `projectId`, `versionId`, `devName`, `status`, `priority`, `from`, `to`.
- In `ModuleController.java`:
  - Add `GET /api/kanban/dashboard/stats` returning `moduleAnalyticsService.getDashboardStats(auth.getName(), isAdmin(auth))`.
- In `SecurityConfig.java`:
  - Ensure `.requestMatchers(HttpMethod.GET, "/api/kanban/dashboard/**").authenticated()` is permitted before admin restrictions.
  - Keep `/api/analytics/**` with `.hasRole("ADMIN")`.

- [x] **Step 4: Run integration tests to verify they pass**
Run: `mvn test -Dtest=AnalyticsControllerIntegrationTest`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add src/main/java/com/something/support/controller/AnalyticsController.java src/main/java/com/something/support/controller/ModuleController.java src/main/java/com/something/support/config/SecurityConfig.java src/test/java/com/something/support/controller/AnalyticsControllerIntegrationTest.java
git commit -m "feat(api): expose dashboard stats and module analytics endpoints with RBAC"
```

---

### Task 5: Frontend API Client Functions

**Files:**
- Create: `frontend/src/api/modulesAnalytics.js`
- Test: Manual / integration check via node or component imports.

**Interfaces:**
- Produces:
  - `fetchDashboardStats()`: calls `GET /kanban/dashboard/stats`
  - `fetchModuleAnalytics(filterParams)`: calls `GET /analytics/modules?params...`
  - `fetchProjects()`: calls `GET /kanban/projects`
  - `fetchVersions(projectId)`: calls `GET /kanban/projects/{id}/versions`
  - `fetchMembers(projectId)`: calls `GET /kanban/projects/{id}/members`

- [x] **Step 1: Implement `frontend/src/api/modulesAnalytics.js`**
Write functions using the existing `api` client from `frontend/src/api/axios.js`, handling query string construction cleanly with `URLSearchParams`.

- [x] **Step 2: Verify lint and build**
Run: `cd frontend && npm run lint`
Expected: 0 errors.

- [x] **Step 3: Commit**
```bash
git add frontend/src/api/modulesAnalytics.js
git commit -m "feat(frontend): add API client methods for dashboard stats and module analytics"
```

---

### Task 6: `ModulesDashboardView.jsx` Component & `Dashboard.jsx` Tabbed Integration

**Files:**
- Create: `frontend/src/components/dashboard/ModulesDashboardView.jsx`
- Modify: `frontend/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `fetchDashboardStats` from `frontend/src/api/modulesAnalytics.js`.
- Renders:
  - Segmented tab switch on `/dashboard`: `Features & Modules` vs `Support Sessions`.
  - Admin view: 4 KPI cards, horizontal 4-status pipeline meter with priority badges, "Approaching Deadlines / Overdue" and "Recent Activity" action tabs with links to Kanban board.
  - Dev view: 4 personal KPI cards, personal status queue, "My Urgent Tasks" list with direct links to `/features/:projectId/modules`.

- [x] **Step 1: Create `frontend/src/components/dashboard/ModulesDashboardView.jsx`**
Build the component implementing:
- Loading skeleton and error alert with retry button.
- Role-conditional rendering based on `isAdmin`.
- Status pipeline visual bar with percentage widths and priority pills.
- Action center cards with due date alerts, overdue badges, and clickable links to the project Kanban board.

- [x] **Step 2: Update `frontend/src/pages/Dashboard.jsx`**
- Add the header segmented control:
  ```jsx
  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
    <button onClick={() => handleTabChange('modules')} className={...}>Features & Modules</button>
    <button onClick={() => handleTabChange('sessions')} className={...}>Support Sessions</button>
  </div>
  ```
- Store active tab in `localStorage.setItem('egs_dashboard_active_tab', tab)`.
- Render `<ModulesDashboardView />` when `activeTab === 'modules'`, and the existing Session telemetry when `activeTab === 'sessions'`.

- [x] **Step 3: Verify build and lint**
Run: `cd frontend && npm run build && npm run lint`
Expected: Build succeeds with 0 errors.

- [x] **Step 4: Commit**
```bash
git add frontend/src/components/dashboard/ModulesDashboardView.jsx frontend/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): integrate Features & Modules dashboard with role-adaptive views"
```

---

### Task 7: `ModulesAnalyticsView.jsx` Component & `TeamAnalytics.jsx` 2-State Integration

**Files:**
- Create: `frontend/src/components/analytics/ModulesAnalyticsView.jsx`
- Modify: `frontend/src/pages/TeamAnalytics.jsx`

**Interfaces:**
- Consumes: `fetchModuleAnalytics` from `frontend/src/api/modulesAnalytics.js`, Recharts components (`BarChart`, `Bar`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`).
- Renders:
  - 2-state toggle on `/analytics`: `Modules Analytics` (default) vs `Sessions Analytics`.
  - Cascading filter bar (Project, Version, Assignee, Status, Priority, Date Horizon).
  - Tier 1: 5 KPI Cards (Total in Scope, Completion Rate %, Work in Progress, Overdue Rate %, Subtask Velocity %).
  - Tier 2: Pipeline & Priority Stacked BarChart.
  - Tier 3: Developer Workload & Delivery Velocity Grouped BarChart.
  - Tier 4: Initiative Progress meters and interactive, searchable Telemetry Matrix Table with direct board links.

- [x] **Step 1: Create `frontend/src/components/analytics/ModulesAnalyticsView.jsx`**
Implement the full 4-tier analytics view with:
- Cascading filters: selecting a project fetches its versions; selecting "All Projects" disables the version selector.
- 5 KPI summary cards with Greenhouse palette tokens.
- Recharts Stacked Bar Chart for pipeline distribution broken down by priority.
- Recharts Grouped Bar Chart for developer workload.
- Initiative health progress cards.
- Searchable telemetry table with subtask progress bars, status pills, priority pills, assignees, overdue alerts, and direct link to Kanban boards.

- [x] **Step 2: Update `frontend/src/pages/TeamAnalytics.jsx`**
- Add top 2-state toggle switch:
  ```jsx
  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
    <button onClick={() => setViewMode('modules')} className={...}>Modules Analytics</button>
    <button onClick={() => setViewMode('sessions')} className={...}>Sessions Analytics</button>
  </div>
  ```
- Defaults to `modules`.
- Renders `<ModulesAnalyticsView />` when `viewMode === 'modules'`.
- Preserves existing Session analytics when `viewMode === 'sessions'`.

- [x] **Step 3: Verify build and lint**
Run: `cd frontend && npm run build && npm run lint`
Expected: Build succeeds with 0 errors.

- [x] **Step 4: Commit**
```bash
git add frontend/src/components/analytics/ModulesAnalyticsView.jsx frontend/src/pages/TeamAnalytics.jsx
git commit -m "feat(analytics): integrate 4-tier Modules Analytics studio with cascading filters and charts"
```

---

### Task 8: End-to-End Verification & Integration Test

**Files:**
- Test: Backend integration tests (`mvn test`)
- Test: Frontend build & lint (`npm run build`, `npm run lint`)

- [x] **Step 1: Run all backend tests**
Run: `mvn test`
Expected: All tests pass (including auth, session, kanban operations, and new analytics tests).

- [x] **Step 2: Run frontend build and linter**
Run: `cd frontend && npm run lint && npm run build`
Expected: 0 lint errors, clean production bundle build in `frontend/dist`.

- [x] **Step 3: Sync frontend build into Spring Boot static resources if applicable**
Check if static build assets need syncing with `src/main/resources/static`.
Run: `cp -r frontend/dist/* src/main/resources/static/` (if app serves static frontend from jar).

- [x] **Step 4: Final verification and commit**
```bash
git add -A
git commit -m "feat: complete Features & Modules dashboard and analytics system integration"
```
