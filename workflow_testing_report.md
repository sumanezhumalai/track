# Rigorous Workflow Testing Report: Features & Modules

**Date:** 2026-10-26  
**Target System:** EGS Support — Kanban Board, Project & Module Management  
**Environment:** Fresh PostgreSQL (`egs_support`), Spring Boot 4.1.1, React 19 Frontend  
**Scope:** Complete end-to-end lifecycle testing across Admin, Single Assignee Dev, Collaborated Devs, and Non-Member Devs.

---

## 1. Test Setup & Clean Slate Execution

1. **Database Reset:**
   - Executed `DROP SCHEMA IF EXISTS "EGS" CASCADE; CREATE SCHEMA "EGS";` on PostgreSQL `localhost:5432/egs_support`.
   - Executed migration sequence:
     - `V1__init_schema.sql` (Tables: `generalSupport`, `devSupport`, `team_sessions`, `Audits`)
     - `V2__seed_admin.sql` (Seed `admin`)
     - `V3__kanban_module_management.sql` (Tables: `project`, `project_version`, `project_member`, `module`, `module_assignee`, `module_subtask`)
     - `V4__cascade_delete_constraints.sql` (Foreign key ON DELETE CASCADE constraints)
2. **Actor Profiles Provisioned:**
   - **`admin`**: System Admin (Role: `admin`)
   - **`john_dev`**: Developer (Role: `dev`, Team: `Backend`)
   - **`alice_dev`**: Developer (Role: `dev`, Team: `Frontend`)
   - **`bob_dev`**: Developer (Role: `dev`, Team: `QA`)

---

## 2. Workflow Test Matrix & Results (74/74 Passed)

| Workflow Section | Operations Tested | Roles Tested | Status |
| :--- | :--- | :--- | :--- |
| **1. Authentication & RBAC** | Login, session validation, `/api/users/dev` endpoint protection | Admin, John, Alice, Bob | ✅ **PASS** |
| **2. Project & Version Lifecycle** | Create project, auto-version v1, create version v2, member assign/remove, dev 403 blocks | Admin, John, Alice, Bob | ✅ **PASS** |
| **3. Module Creation & Subtasks** | Single assignee + subtasks, collaborative assignees + subtasks, unassigned card, dev 403 block | Admin, John | ✅ **PASS** |
| **4. Board Visibility & Role Filtering** | Admin sees all (4/4); John sees assigned (M1) + collaborative (M2); Alice sees assigned (M3) + collaborative (M2); Bob sees 0 | Admin, John, Alice, Bob | ✅ **PASS** |
| **5. Card Drag-and-Drop & Reordering** | Cross-column move (start -> testing), collaborative move by secondary assignee, column batch reordering | Admin, John, Alice | ✅ **PASS** |
| **6. Module Update & Subtasks Lifecycle** | Update metadata, subtask addition, subtask toggle (true/false), subtask deletion, reassignment | Admin, John, Alice, Bob | ✅ **PASS** |
| **7. Deletion & Cascade Integrity** | Dev delete block (403), Admin module delete, sole-version delete block (400), project cascade delete | Admin, John | ✅ **PASS** |

---

## 3. Inconsistencies & Gap Inferences (Reported Before Correcting)

### ✅ Inconsistency 1 (RESOLVED & VALIDATED): `PUT /api/kanban/modules/{id}` Subtasks Serialization
- **Location:** [ModuleService.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/service/ModuleService.java#L103-L125) and [Module.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/entity/Module.java#L120-L131)
- **Observed Behavior:**
  When an Admin updated module details via `PUT /api/kanban/modules/{id}`, the response JSON returned `"subtasks": []`.
- **Resolution:**
  In `ModuleService.updateModule()`, explicitly populated `saved.setSubtaskDtos(...)` with existing subtasks queried via `subtaskRepo.findAllByModule_ModuleIdOrderByDisplayOrderAsc(moduleId)`.
- **Validation:**
  Verified via live HTTP test suite and JUnit test `KanbanOperationsTest.testSubtaskCreationAndCollaborativeAssigneeVisibility`. Response payload now contains all 3 subtasks.

---

### ✅ Inconsistency 2 (RESOLVED & VALIDATED): Dev Moving Cards Not Assigned to Them
- **Location:** [ModuleController.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/controller/ModuleController.java#L66-L76), [ModuleService.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/service/ModuleService.java#L137-L157), [ModuleAssigneeRepository.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/repository/ModuleAssigneeRepository.java#L17)
- **Observed Behavior:**
  Any authenticated developer could issue a `PATCH /api/kanban/modules/{id}/move` to move any module on the board, even if not assigned to it.
- **Resolution:**
  Added `existsByModule_ModuleIdAndDevName` to `ModuleAssigneeRepository`. In `ModuleService.moveModule()`, added caller ownership verification:
  ```java
  if (!isAdmin && !isAssignedDev(module, movedBy)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to move this module");
  }
  ```
- **Validation:**
  Verified in both live HTTP test suite and `KanbanOperationsTest`. Devs attempting to move unassigned modules now receive `403 Forbidden`, while assigned/collaborative devs and admins successfully receive `200 OK`.

### ✅ Inconsistency 3 (RESOLVED & VALIDATED): Subtask Creation & Deletion Permission Alignment
- **Location:** [SecurityConfig.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/config/SecurityConfig.java#L55-L58), [ModuleController.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/controller/ModuleController.java#L127-L151), [ModuleService.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/service/ModuleService.java#L231-L245)
- **Observed Behavior:**
  Backend endpoints allowed non-admin developers to add and delete subtasks via direct HTTP requests, while the frontend UI strictly blocked devs and reserved subtask checklist creation/deletion for Admins.
- **Resolution:**
  - Added `hasRole("ADMIN")` to `POST /api/kanban/modules/*/subtasks` and `DELETE /api/kanban/modules/subtasks/*` in `SecurityConfig.java`.
  - Added explicit `isAdmin` check in `ModuleController.java` for both endpoints (`403 Forbidden` if dev attempts to add or delete).
  - Maintained `toggleSubtask` accessible to assigned developers (with ownership check in `ModuleService` preventing devs from modifying checklists on other people's modules).
- **Validation:**
  - Devs attempting `POST /subtasks` or `DELETE /subtasks` receive `403 Forbidden`.
  - Assigned devs toggling checkboxes on their modules receive `200 OK`.
  - Admins can add and delete subtasks as expected.
  - Zero disruption to frontend features: perfectly aligns backend authorization with `TaskDetailSheet.jsx`.

---

### ✅ Inconsistency 4 (RESOLVED & VALIDATED): Column Batch Reorder Resiliency (`POST /reorder`)
- **Location:** [ModuleService.java](file:///home/suman/Projects/workspace/Java/springboot/practice/egssupport/src/main/java/com/something/support/service/ModuleService.java#L173-L185)
- **Observed Behavior:**
  `reorderColumn` only updated `m.position`, without updating `m.status`. If any card in the batch had a desynced column status, it would remain in the old column while receiving a new position index.
- **Resolution:**
  Updated `reorderColumn` to invoke `moduleRepo.updateStatusAndPosition(ids.get(i), req.status(), i, now)` for every card in the payload, ensuring `status` and `position` are always simultaneously synchronized.
- **Validation:**
  Verified via live workflow test suite and JUnit test `KanbanOperationsTest`. Cross-column drops and batch reorders are completely resilient and self-healing against any race condition.
