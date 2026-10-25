# Design Specification: Features & Modules Frontend Setup

**Date**: 2026-10-25  
**Status**: Validated Design  
**Author**: Suman & Antigravity  
**Target System**: `egssupport` Frontend (React 19 + Tailwind CSS + Vite)

---

## 1. Overview & Purpose

The purpose of this feature is to establish a dedicated **"Features & Modules"** page in the `egssupport` web application. This page serves as the entry point for all engineering projects, showing project listings as cards, displaying their active versions and branch counts, providing an incremental branching studio via a centered dialog modal, and allowing administrators to add new projects.

This design sets the foundation for seamlessly integrating the Kanban module board in the subsequent phase.

---

## 2. User Roles & Permissions (RBAC)

| Role | Project Visibility | Create Project | Create Branch | View Branches | Open Board (Phase 2) |
|---|---|---|---|---|---|
| **ADMIN** | All active projects | Yes (`POST /api/kanban/projects`) | Yes (`POST /api/kanban/projects/{id}/versions`) | Yes | Yes (Full access to all columns) |
| **DEV** | Only assigned projects (filtered by backend) | No (Button hidden) | No (Form hidden) | Yes | Yes (Filtered by assigned modules) |

---

## 3. UI/UX Architecture & Components

### 3.1. Sidebar Navigation ([Sidebar.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/Sidebar.jsx))
* Under the **Operations** section, directly above Sessions, add:
  * NavLink: `/features`
  * Icon: `Layers` (from `lucide-react`)
  * Label: `"Features & Modules"`
  * Active state styling: `.sidebar-link.active` (`bg-gh-greenLight text-gh-greenDark font-semibold`)
  * Visible to all authenticated roles.

### 3.2. Route Registration ([App.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/App.jsx))
* Register route `/features` wrapped with `<ProtectedRoute>` and `<AppLayout>`.
* Renders `FeaturesModules.jsx` page.

### 3.3. Main Page ([FeaturesModules.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/pages/FeaturesModules.jsx))
* **Page Header**:
  * Title: `"Features & Modules"` using serif heading (`font-untitled text-2xl font-semibold text-stone-900`).
  * Subtitle: `"Initiatives, version branches, and module workflow boards."`
  * Search Bar: Live search filter for project name and description.
  * Action Buttons:
    * Refresh button (`.btn-secondary`).
    * "+ New Project" button (`.btn-primary`), rendered only if `isAdmin`.
* **State Management**:
  * `projects`: Array of projects loaded from `GET /api/kanban/projects`.
  * `projectVersionsMap`: Key-value map `{ [projectId]: ProjectVersion[] }` loaded via parallel fetch from `GET /api/kanban/projects/{id}/versions`.
  * `loading`: Boolean loading indicator for initial fetch.
  * `selectedProjectForBranchModal`: Project object or null for active branch dialog.
  * `showNewProjectModal`: Boolean controlling new project creation dialog.

### 3.4. Project Card Component ([ProjectCard.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/ProjectCard.jsx))
* **Visual Frame**:
  * `bg-white border border-gh-border rounded-xl p-5 hover:border-stone-400/80 hover:shadow-md transition-all duration-150 flex flex-col justify-between`.
* **Top Header**:
  * Left: Project name (`text-sm font-semibold text-stone-900 truncate`).
  * Right: **Branch Trigger Chip Button**:
    * Icon: `<GitBranch className="w-3.5 h-3.5 text-emerald-800" />`.
    * Text: `{versionCount} {versionCount === 1 ? 'branch' : 'branches'}`.
    * Click behavior: Calls `e.stopPropagation()` and triggers branch modal open for this project.
* **Body**:
  * Description: Rendered with `line-clamp-2 text-xs text-stone-600 leading-relaxed`. Fallback to `"No description provided."` in subtle italic text.
* **Footer / Metadata**:
  * **Active Version Tag**: Pill badge with `<Tag className="w-3 h-3 text-emerald-700" />` and label `Active: {activeVersionLabel}` (e.g. `Active: v1.0.0`).
  * **Creation Info**: Created by handle and date format.
  * **Interactive Action Cue**: Subtle `"View Modules →"` cue on card hover. Clicking card triggers preview notice for Phase 2.

### 3.5. Branch Management Modal ([BranchManagementModal.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/BranchManagementModal.jsx))
* **Centered Dialog Container**:
  * Backdrop blur overlay (`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm`).
  * Modal container: `max-w-2xl w-full max-h-[85vh] bg-white rounded-2xl border border-gh-border shadow-dropdown flex flex-col overflow-hidden`.
* **Header**:
  * Icon badge with `GitBranch`, title `"Branch & Version Management"`, and project name subtitle.
  * Close button (`<X />`).
* **Branch Timeline (Top/Middle Pane)**:
  * Scrollable list of existing versions from newest to oldest.
  * Active tag indicator on the latest version (`CheckCircle2` + `"Active Version"`).
  * Version badge (`v{versionNumber}`, label `v1.0.0`), release notes text, author, and timestamp.
* **Incremental Branch Creator (Bottom Pane, Admin only)**:
  * Clear section header: `"Create New Branch / Version"`.
  * Computes next incremental version number: `version_number = latestVersionNumber + 1`.
  * Prompt: `"Next incremental version is v{nextVersionNumber}"`.
  * Optional label input: `e.g. v2.0.0 (Leave blank for default v{nextVersionNumber}.0.0)`.
  * Optional release notes textarea: `Key deliverables, changes, or targets...`.
  * Submit button: `.btn-primary` with `"Create Branch"`.
  * Submits `POST /api/kanban/projects/{id}/versions`.
  * Refreshes versions list immediately on success and updates project card on main page.

### 3.6. Add Project Modal ([NewProjectModal.jsx](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/frontend/src/components/NewProjectModal.jsx))
* **Fields**:
  * **Project Name**: Text input (`required`, autofocus).
  * **Description**: Textarea (`optional`).
  * **Notice**: Explains that version 1 (`v1.0.0`) is automatically initialized by the system upon creation.
* **Submission**:
  * Sends `POST /api/kanban/projects`.
  * Refreshes project list and displays success toast.

---

## 4. API Endpoints & Data Contracts

| Method | Endpoint | Request Body | Response / Effect |
|---|---|---|---|
| `GET` | `/egssupport/api/kanban/projects` | None | Returns `List<Project>` (`projectId`, `projectName`, `description`, `createdBy`, `createdAt`, `isActive`) |
| `POST` | `/egssupport/api/kanban/projects` | `{ "projectName": string, "description": string }` | Returns created `Project`. Seeds `v1.0.0` in DB automatically. |
| `GET` | `/egssupport/api/kanban/projects/{id}/versions` | None | Returns `List<ProjectVersion>` (`versionId`, `versionNumber`, `label`, `releaseNotes`, `createdBy`, `createdAt`, `isActive`) |
| `POST` | `/egssupport/api/kanban/projects/{id}/versions` | `{ "label": string, "releaseNotes": string }` | Returns created `ProjectVersion` with incremental `version_number`. |

---

## 5. Verification & Testing Strategy

1. **Linting & Code Integrity**: Run `npm run lint` with `oxlint` in `frontend/`.
2. **Build Verification**: Run `npm run build` in `frontend/` to confirm zero JSX/CSS/Vite syntax errors.
3. **End-to-End Simulation Check**: Validate that API calls adhere to backend contracts established in `test_simulation.py` and `ProjectController.java`.
4. **UI Visual Validation**: Verify responsiveness, hover states, branch modal interaction, and active version display in the browser.
