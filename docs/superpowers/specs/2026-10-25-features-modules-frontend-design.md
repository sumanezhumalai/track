# Design Specification: Features & Modules Frontend Setup & Cascade Management

**Date**: 2026-10-25  
**Status**: Validated Design (Updated with Edit/Delete & DB Cascade)  
**Author**: Suman & Antigravity  
**Target System**: `egssupport` (Spring Boot REST Backend + React 19 Frontend)

---

## 1. Overview & Purpose

The purpose of this feature is to establish a dedicated **"Features & Modules"** page in the `egssupport` application. It provides:
1. Complete Project lifecycle management: listing as cards, creating new projects, editing project metadata, and deleting projects with typed confirmation.
2. Complete Version/Branch lifecycle management: viewing branch history, creating incremental versions, editing version labels/release notes, and deleting versions with typed confirmation.
3. Database foreign-key cascade enablement so that deleting a project or version cleanly cascades throughout the database (`project` → `project_version` & `project_member` → `module` → `module_assignee` & `module_subtask`).
4. Groundwork for seamlessly opening the Kanban module board in the subsequent phase.

---

## 2. Database Foreign Key Cascade Analysis & Migration

### Current Database State (Pre-Migration)
Inspection of PostgreSQL `information_schema.referential_constraints` on schema `EGS`:
* `project_version.project_id -> project.project_id` : `RESTRICT` ⚠️
* `project_member.project_id -> project.project_id` : `RESTRICT` ⚠️
* `module.version_id -> project_version.version_id` : `RESTRICT` ⚠️
* `module_assignee.module_id -> module.module_id` : `CASCADE` ✅
* `module_subtask.module_id -> module.module_id` : `CASCADE` ✅

Because `project_version`, `project_member`, and `module` were set to `RESTRICT`, attempting to delete a project or version directly in PostgreSQL throws a foreign key violation.

### Cascade Fix (Migration `V4__cascade_delete_constraints.sql`)
Alter foreign key constraints in schema `EGS` to `ON DELETE CASCADE`:
```sql
ALTER TABLE "EGS"."project_version"
    DROP CONSTRAINT project_version_project_id_fkey,
    ADD CONSTRAINT project_version_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES "EGS"."project"(project_id) ON DELETE CASCADE;

ALTER TABLE "EGS"."project_member"
    DROP CONSTRAINT project_member_project_id_fkey,
    ADD CONSTRAINT project_member_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES "EGS"."project"(project_id) ON DELETE CASCADE;

ALTER TABLE "EGS"."module"
    DROP CONSTRAINT module_version_id_fkey,
    ADD CONSTRAINT module_version_id_fkey
        FOREIGN KEY (version_id) REFERENCES "EGS"."project_version"(version_id) ON DELETE CASCADE;
```
**Cascade Behavior Result**:
* Deleting a `project` cascades to:
  1. `project_version` (all versions deleted)
  2. `project_member` (all members removed)
  3. `module` (all modules under all versions deleted)
  4. `module_assignee` & `module_subtask` (all subtasks & assignments deleted)
* Deleting a `project_version` cascades to:
  1. `module` (all modules under this version deleted)
  2. `module_assignee` & `module_subtask` (all subtasks & assignments deleted)

---

## 3. Backend REST API Endpoints

All modifications require `ROLE_ADMIN`.

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `GET` | `/api/kanban/projects` | None | Returns active projects (Admin sees all; Dev sees assigned). |
| `POST` | `/api/kanban/projects` | `{ projectName, description }` | Creates project and seeds version 1 (`v1.0.0`). |
| `PUT` | `/api/kanban/projects/{id}` | `{ projectName, description }` | Updates project name & description. |
| `DELETE` | `/api/kanban/projects/{id}` | None | Hard deletes project with DB-level cascade. |
| `GET` | `/api/kanban/projects/{id}/versions` | None | Returns all versions for a project, newest first. |
| `POST` | `/api/kanban/projects/{id}/versions` | `{ label, releaseNotes }` | Adds next incremental version (`MAX + 1`). |
| `PUT` | `/api/kanban/projects/{projectId}/versions/{versionId}` | `{ label, releaseNotes }` | Updates version label & release notes. |
| `DELETE` | `/api/kanban/projects/{projectId}/versions/{versionId}` | None | Deletes version with DB-level cascade (blocked if only 1 version remains). |

---

## 4. Frontend UI/UX Architecture & Components

### 4.1. Sidebar Navigation ([Sidebar.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/Sidebar.jsx))
* Under **Operations**, add NavLink `/features` labeled **"Features & Modules"** with icon `Layers`.
* Active state highlights in `bg-gh-greenLight text-gh-greenDark font-semibold`.

### 4.2. Route Registration ([App.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/App.jsx))
* Register route `/features` wrapped with `<ProtectedRoute>` and `<AppLayout>`.

### 4.3. Main Page ([FeaturesModules.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/pages/FeaturesModules.jsx))
* **Header**:
  * Title: `"Features & Modules"` (`font-untitled text-2xl font-semibold text-stone-900`).
  * Subtitle: `"Initiatives, version branches, and module workflow boards."`
  * Action controls: Live search input, Refresh button, "+ New Project" button (Admin only).
* **Grid**:
  * 3-column responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`).
  * Empty state with call-to-action when no projects match.

### 4.4. Project Card Component ([ProjectCard.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/ProjectCard.jsx))
* **Card Frame**:
  * White surface (`bg-white border border-gh-border rounded-xl p-5 hover:border-stone-400/80 hover:shadow-md transition-all duration-150`).
* **Header**:
  * Left: Project name with initiative icon.
  * Right Action Cluster:
    * **Branch chip button**: `<GitBranch />` + `{count} {count === 1 ? 'branch' : 'branches'}`. Opens Branch Management Modal.
    * **Admin Card Actions (Edit & Delete)**:
      * Edit icon button (`Edit2`): Opens Edit Project Modal.
      * Delete icon button (`Trash2`): Opens Delete Confirmation Dialog with `"confirm"` requirement.
* **Body**:
  * Description with 2-line clamp (`line-clamp-2 text-xs text-stone-600 leading-relaxed`).
* **Footer**:
  * Active Version chip: `<Tag />` + `Active: {activeVersionLabel}`.
  * Author & creation date.
  * `"View Modules →"` cue on hover (clicking card displays preview notice for Phase 2).

### 4.5. Typed Delete Confirmation Dialog ([ConfirmDeleteModal.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/ConfirmDeleteModal.jsx))
* Generic, reusable confirmation dialog:
  * Title: `"Delete {itemType}"` with red warning icon (`AlertTriangle`).
  * Message: Clear description of cascade impact:
    * E.g. for Project: *"This will permanently delete project **{title}** and all its branches, modules, and subtasks. This cascade action cannot be undone."*
    * E.g. for Version: *"This will permanently delete branch **{title}** and all associated modules and subtasks."*
  * Verification Prompt: *"To confirm deletion, please type **confirm** below:"*
  * Input field with placeholder `"type confirm to proceed"`.
  * Delete Button (`.btn-danger`): Disabled until input strictly equals `"confirm"`.
  * Cancel Button (`.btn-secondary`).

### 4.6. Edit Project Modal ([EditProjectModal.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/EditProjectModal.jsx))
* Pre-filled form with `projectName` and `description`.
* Updates project via `PUT /api/kanban/projects/{id}` and updates local state.

### 4.7. Branch Management Modal ([BranchManagementModal.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/BranchManagementModal.jsx))
* **Timeline Pane**:
  * Lists versions newest first.
  * Displays version number, label, release notes, author, and timestamp.
  * **Per-Version Actions (Admin only)**:
    * **Edit button (`Edit2`)**: Inline or popover edit for `label` and `releaseNotes`.
    * **Delete button (`Trash2`)**: Opens ConfirmDeleteModal requiring `"confirm"`. (Disabled with tooltip if it is the only branch remaining).
* **Create Branch Form (Admin only)**:
  * Next version counter prompt: `"Next incremental version: v{MAX + 1}"`.
  * Label input & Release notes textarea.
  * Submits `POST /api/kanban/projects/{id}/versions`.

---

## 5. Verification & Testing Strategy

1. **Database Cascade Verification**:
   * Apply `V4` SQL migration altering constraints to `ON DELETE CASCADE`.
   * Create a dummy project with version, module, and subtasks; delete project; verify all child rows in `project_version`, `project_member`, `module`, `module_assignee`, and `module_subtask` are completely wiped from Postgres.
2. **Backend API Testing**:
   * Add test simulation assertions in `test_simulation.py` for project edit, version edit, version delete cascade, and project delete cascade.
3. **Frontend Build & Lint**:
   * Run `npm run lint` and `npm run build` in `frontend/`.
4. **UI Validation**:
   * Verify typed "confirm" logic blocks accidental clicks until exact string is entered.
   * Verify real-time list updates after edit and delete operations.
