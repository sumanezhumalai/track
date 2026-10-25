# Features & Modules Frontend & DB Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete "Features & Modules" page with project cards, incremental branch management modal, edit/delete operations with typed "confirm" protection, and PostgreSQL foreign key cascade support.

**Architecture:** 
1. Database migration updates foreign key constraints on `project_version`, `project_member`, and `module` to `ON DELETE CASCADE`.
2. Spring Boot backend extends `ProjectService` and `ProjectController` with `PUT`/`DELETE` for projects and versions, verified via `test_simulation.py`.
3. React 19 frontend introduces a new `/features` route, sidebar navigation, responsive project cards, centered branch management studio modal, edit modals, and a reusable typed delete confirmation dialog.

**Tech Stack:** Java 17, Spring Boot 3, PostgreSQL, React 19, React Router v7, Tailwind CSS, Lucide React, Axios, Vite.

**Spec:** [docs/superpowers/specs/2026-10-25-features-modules-frontend-design.md](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/docs/superpowers/specs/2026-10-25-features-modules-frontend-design.md)

## Global Constraints

- Backend context path: `/egssupport` (all API calls prefix `/egssupport/api`).
- Foreign key constraints must cascade deletions cleanly throughout schema `EGS`.
- Project deletion and branch deletion require typing `"confirm"` exactly to unlock the delete button.
- Only Admin users can create/edit/delete projects and create/edit/delete branches; Dev users can view their assigned projects and branches.
- Deleting the only remaining version of a project is disallowed (a project must retain at least one version).
- Clicking the project card for Kanban Module Board is deferred to Phase 2 (shows informational preview notice).

## Review Focus

1. Deleting a project with multiple versions, members, modules, and subtasks must completely clean up all child records without foreign key constraint violations.
2. Attempting to delete a version when only 1 version exists must return 400 Bad Request with a clear error message.
3. In `ConfirmDeleteModal`, typing anything other than `"confirm"` (including `"Confirm"` or with trailing spaces unless trimmed) must keep the Delete button disabled.
4. Incremental branch creation must automatically calculate `nextVersionNumber = MAX(versionNumber) + 1` and default display label to `v{nextVersionNumber}.0.0`.
5. Non-admin users must not see "+ New Project", edit, or delete controls, and any direct API calls from non-admin must return 403 Forbidden.

---

### Task 1: Database Foreign Key CASCADE Migration & Validation

**Files:**
- Create: `src/main/resources/db/migration/V4__cascade_delete_constraints.sql`

**Interfaces:**
- Consumes: Existing tables `project`, `project_version`, `project_member`, `module`
- Produces: Foreign keys with `ON DELETE CASCADE` in schema `EGS`

- [ ] **Step 1: Write SQL migration file**
  Create `src/main/resources/db/migration/V4__cascade_delete_constraints.sql` with `ALTER TABLE` statements dropping existing `RESTRICT` foreign keys and recreating them with `ON DELETE CASCADE` for:
  - `project_version_project_id_fkey`
  - `project_member_project_id_fkey`
  - `module_version_id_fkey`

- [ ] **Step 2: Apply migration to local PostgreSQL database**
  Run:
  ```bash
  PGPASSWORD=postgres psql -h localhost -U postgres -d egs_support -f src/main/resources/db/migration/V4__cascade_delete_constraints.sql
  ```
  Expected: `ALTER TABLE` commands succeed.

- [ ] **Step 3: Verify foreign key delete rules in PostgreSQL**
  Run:
  ```bash
  PGPASSWORD=postgres psql -h localhost -U postgres -d egs_support -c "
  SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, rc.delete_rule
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'EGS'
  ORDER BY tc.table_name;
  "
  ```
  Expected: `project_version`, `project_member`, and `module` all show `delete_rule = CASCADE`.

- [ ] **Step 4: Commit**
  ```bash
  git add src/main/resources/db/migration/V4__cascade_delete_constraints.sql
  git commit -m "db: update foreign key constraints to ON DELETE CASCADE"
  ```

---

### Task 2: Backend REST APIs for Project & Version Edit/Delete

**Files:**
- Modify: `src/main/java/com/something/support/service/ProjectService.java`
- Modify: `src/main/java/com/something/support/controller/ProjectController.java`
- Modify: `test_simulation.py`

**Interfaces:**
- Produces:
  - `PUT /api/kanban/projects/{id}`: `Project`
  - `DELETE /api/kanban/projects/{id}`: 204 No Content
  - `PUT /api/kanban/projects/{projectId}/versions/{versionId}`: `ProjectVersion`
  - `DELETE /api/kanban/projects/{projectId}/versions/{versionId}`: 204 No Content

- [ ] **Step 1: Implement Project & Version Update/Delete methods in `ProjectService`**
  - `updateProject(Long projectId, ProjectRequest req, String adminName)`: checks existence, validates unique name if changed, updates `projectName` and `description`, logs audit.
  - `deleteProject(Long projectId, String adminName)`: deletes project using `projectRepo.deleteById(projectId)` (which cascades in DB), logs audit.
  - `updateVersion(Long projectId, Long versionId, ProjectVersionRequest req, String adminName)`: updates `label` and `releaseNotes`, logs audit.
  - `deleteVersion(Long projectId, Long versionId, String adminName)`: checks if project has > 1 version (throws 400 if only 1 remains), deletes using `versionRepo.deleteById(versionId)`, logs audit.

- [ ] **Step 2: Add REST Endpoints in `ProjectController`**
  - Add `@PutMapping("/{id}")` for `updateProject`.
  - Add `@DeleteMapping("/{id}")` for `deleteProject`.
  - Add `@PutMapping("/{id}/versions/{versionId}")` for `updateVersion`.
  - Add `@DeleteMapping("/{id}/versions/{versionId}")` for `deleteVersion`.
  - Guard all four with `isAdmin(auth)`.

- [ ] **Step 3: Add automated tests in `test_simulation.py`**
  Add assertions in `test_simulation.py` testing:
  - Admin edits project name & description (200 OK)
  - Admin edits version label & release notes (200 OK)
  - Dev cannot edit/delete project or version (403 Forbidden)
  - Deleting only version returns 400 Bad Request
  - Admin creates extra version, module, subtask, then deletes version (204 No Content; child modules gone)
  - Admin deletes project (204 No Content; all child versions and modules gone)

- [ ] **Step 4: Recompile & Run `test_simulation.py`**
  Run:
  ```bash
  ./mvnw compile -DskipTests
  python3 test_simulation.py
  ```
  Expected: All tests pass.

- [ ] **Step 5: Commit**
  ```bash
  git add src/main/java/com/something/support/service/ProjectService.java src/main/java/com/something/support/controller/ProjectController.java test_simulation.py
  git commit -m "feat: add edit and cascade delete APIs for projects and versions"
  ```

---

### Task 3: Modal Components (ConfirmDeleteModal, NewProjectModal, EditProjectModal)

**Files:**
- Create: `frontend/src/components/ConfirmDeleteModal.jsx`
- Create: `frontend/src/components/NewProjectModal.jsx`
- Create: `frontend/src/components/EditProjectModal.jsx`

**Interfaces:**
- `ConfirmDeleteModal`:
  - Props: `isOpen`, `onClose`, `onConfirm`, `title`, `itemType`, `description`, `confirmWord = "confirm"`, `loading`
- `NewProjectModal`:
  - Props: `isOpen`, `onClose`, `onCreated`
- `EditProjectModal`:
  - Props: `isOpen`, `onClose`, `project`, `onUpdated`

- [ ] **Step 1: Implement `ConfirmDeleteModal.jsx`**
  - Renders centered dialog with backdrop.
  - Heading: `"Delete {itemType}"` with red alert badge.
  - Detailed description with bold item name and cascade warning.
  - Input field for typing confirmation word.
  - "Delete" button disabled until `input.trim() === confirmWord`.
  - Cancel button closing modal.

- [ ] **Step 2: Implement `NewProjectModal.jsx`**
  - Form fields: `projectName` (required), `description` (textarea).
  - Info tip about automatic initial `v1.0.0` seeding.
  - Calls `api.post('/kanban/projects', payload)`.
  - Calls `onCreated(res.data)` on success.

- [ ] **Step 3: Implement `EditProjectModal.jsx`**
  - Pre-fills `projectName` and `description` from `project` prop.
  - Calls `api.put('/kanban/projects/' + project.projectId, payload)`.
  - Calls `onUpdated(res.data)` on success.

- [ ] **Step 4: Lint check**
  Run: `npm run lint` in `frontend/`
  Expected: Clean, no errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/components/ConfirmDeleteModal.jsx frontend/src/components/NewProjectModal.jsx frontend/src/components/EditProjectModal.jsx
  git commit -m "feat: create modal components for create, edit, and typed delete confirmation"
  ```

---

### Task 4: ProjectCard & BranchManagementModal Components

**Files:**
- Create: `frontend/src/components/BranchManagementModal.jsx`
- Create: `frontend/src/components/ProjectCard.jsx`

**Interfaces:**
- `BranchManagementModal`:
  - Props: `isOpen`, `onClose`, `project`, `versions`, `isAdmin`, `onVersionsChanged`
- `ProjectCard`:
  - Props: `project`, `versions`, `isAdmin`, `onOpenBranches`, `onEditProject`, `onDeleteProject`, `onSelectProject`

- [ ] **Step 1: Implement `BranchManagementModal.jsx`**
  - Centered dialog displaying project title and branch count.
  - **Version timeline list**:
    - Versions ordered newest first.
    - Active branch badge on top version (`CheckCircle2`).
    - Version label, release notes, createdBy, createdAt.
    - Inline edit button (`Edit2`) to update label & release notes via `PUT /api/kanban/projects/{id}/versions/{vId}`.
    - Delete button (`Trash2`) for Admin (disabled if only 1 version exists), triggering `ConfirmDeleteModal`.
  - **Incremental Branch Form** (Admin only):
    - Shows `Next incremental version: v{maxNumber + 1}`.
    - Inputs for custom label (optional) and release notes (optional).
    - Submits `POST /api/kanban/projects/{id}/versions`.
    - Triggers `onVersionsChanged()` on success.

- [ ] **Step 2: Implement `ProjectCard.jsx`**
  - Top: Project Name, Branch chip button (`<GitBranch /> {count} branches`) with `e.stopPropagation()`.
  - Admin action cluster: Edit button (`Edit2`) and Delete button (`Trash2`).
  - Middle: Description with `line-clamp-2 text-xs text-stone-600`.
  - Bottom: Active Version tag (`Tag` + `Active: {label}`), author, date.
  - Hover action cue: `"View Modules →"`. Clicking card calls `onSelectProject(project, activeVersion)`.

- [ ] **Step 3: Lint check**
  Run: `npm run lint` in `frontend/`
  Expected: Clean.

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/components/BranchManagementModal.jsx frontend/src/components/ProjectCard.jsx
  git commit -m "feat: implement ProjectCard and BranchManagementModal components"
  ```

---

### Task 5: Features & Modules Page & Route/Sidebar Integration

**Files:**
- Create: `frontend/src/pages/FeaturesModules.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Route: `/features`
- Sidebar item: "Features & Modules" under Operations

- [ ] **Step 1: Implement `FeaturesModules.jsx`**
  - Fetches projects via `api.get('/kanban/projects')`.
  - Concurrently fetches versions for projects via `Promise.all(projects.map(p => api.get('/kanban/projects/' + p.projectId + '/versions')))`.
  - Provides search filter input (filters by name and description).
  - Header with title, search input, refresh button, and "+ New Project" button (Admin only).
  - Grid of `ProjectCard` components.
  - Handles state for `NewProjectModal`, `EditProjectModal`, `BranchManagementModal`, and `ConfirmDeleteModal`.
  - Provides preview notification when clicking card: *"Kanban Board for {project.projectName} ({activeVersionLabel}) will be connected in next phase."*

- [ ] **Step 2: Update `Sidebar.jsx`**
  - Add `Layers` icon import from `lucide-react`.
  - Add NavLink to `/features` labeled `"Features & Modules"` in the Operations section.

- [ ] **Step 3: Update `App.jsx`**
  - Add route `/features` rendering `<FeaturesModules />` inside `<ProtectedRoute>` and `<AppLayout>`.

- [ ] **Step 4: Lint check**
  Run: `npm run lint` in `frontend/`
  Expected: Clean.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/pages/FeaturesModules.jsx frontend/src/components/Sidebar.jsx frontend/src/App.jsx
  git commit -m "feat: integrate Features & Modules page into routing and navigation"
  ```

---

### Task 6: End-to-End Verification & Browser Validation

**Files:**
- Test: `test_simulation.py`
- Test: Frontend build & Vite preview / browser check

- [ ] **Step 1: Run complete backend test suite**
  Run: `python3 test_simulation.py`
  Expected: 100% tests pass including all new edit and cascade delete scenarios.

- [ ] **Step 2: Run frontend build**
  Run: `cd frontend && npm run build`
  Expected: Production bundle builds cleanly with zero errors.

- [ ] **Step 3: Browser UI Verification**
  - Start frontend dev server or view page.
  - Verify "Features & Modules" link in sidebar.
  - Verify project cards render with active version pills, branch counts, and descriptions.
  - Verify "+ New Project" opens modal, creates project, and appears on grid.
  - Verify Edit Project updates card details.
  - Verify Delete Project requires typing `"confirm"` and removes project.
  - Verify Branch Management Modal opens, shows version history, allows editing versions, creating incremental branches, and deleting branches.
  - Verify card click displays preview banner for upcoming Kanban board.

- [ ] **Step 4: Commit and finalize**
  ```bash
  git commit --allow-empty -m "chore: verify Features & Modules frontend and backend cascade"
  ```
