# Ponytail Codebase Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the ponytail audit simplifications to eliminate dead overloads, legacy container baggage, unused component scaffolding, and redundant state across backend and frontend.

**Architecture:** Incrementally remove dead code rungs from highest confidence and lowest risk to higher yield. Backend dead overloads and packaging cleanup first, followed by frontend utils and component deduplication, verified by `mvn test` and `npm run build`.

**Tech Stack:** Java 17 / Spring Boot 4.x / Maven, React 19 / Vite / Tailwind CSS.

**Spec:** Derived directly from the `/ponytail-audit` findings report.

## Global Constraints
- Preserve all existing public API endpoint behavior and contracts.
- Maintain existing database schemas and JPA mappings intact.
- Ensure all existing backend unit/integration tests continue to pass.
- Ensure frontend builds cleanly with `npm run build` without regression.

## Review Focus
1. Uncalled service overloads deleted must not have hidden callers in tests or controllers.
2. Replacing `ServletInitializer.java` and WAR packaging must not break Spring Boot application startup or packaging.
3. Simplification of `toDateString()` must correctly handle null and invalid date inputs.
4. Deduping Auth artwork must not alter visual appearance or responsive behavior on Login and SetPassword pages.
5. Simplifying `avatar.jsx` must preserve color palette hashing, initials display, and ring styles.

---

### Task 1: Backend Dead Code Removal & POM Cleanup

**Files:**
- Modify: `src/main/java/com/something/support/service/SessionService.java`
- Modify: `src/main/java/com/something/support/service/ModuleService.java`
- Modify: `src/main/java/com/something/support/entity/Module.java`
- Modify: `pom.xml`
- Delete: `src/main/java/com/something/support/ServletInitializer.java`

**Interfaces:**
- `SessionService`: retains `createSession`, `updateSession(4 args)`, `endSession(3 & 4 args)`, `deleteSession(3 args)`.
- `ModuleService`: retains `moveModule(5 args)`, `toggleSubtask(3 args)`.

- [ ] **Step 1: Remove uncalled overloads from `SessionService.java`**
  - Delete `updateSession(Long, SessionRequest, String)` (lines 58-60).
  - Delete `deleteSession(Long, String)` (lines 105-107).

- [ ] **Step 2: Remove uncalled overloads from `ModuleService.java`**
  - Delete `moveModule(Long, ModuleStatus, int, String)` (lines 135-138).
  - Delete `toggleSubtask(Long, String)` (lines 229-231).

- [ ] **Step 3: Remove legacy WAR packaging, provided tomcat, and `ServletInitializer.java`**
  - Delete `src/main/java/com/something/support/ServletInitializer.java`.
  - In `pom.xml`, remove `<packaging>war</packaging>`, remove empty tags (`<description/>`, `<url/>`, `<licenses>`, `<developers>`, `<scm>`), and remove `spring-boot-starter-tomcat` with provided scope.

- [ ] **Step 4: Run backend tests to verify clean compilation and execution**
  - Run: `./mvnw test` or `mvn test`
  - Expected: BUILD SUCCESS

- [ ] **Step 5: Commit backend cleanup**
  - Commit message: `refactor(backend): remove dead service overloads and legacy WAR container baggage`

---

### Task 2: Frontend Utilities and Component Simplification

**Files:**
- Modify: `frontend/src/lib/taskUtils.js`
- Modify: `frontend/src/lib/avatar.js`
- Modify: `frontend/src/components/ui/button.jsx`
- Modify: `frontend/src/components/kanban/KanbanHeader.jsx`
- Modify: `frontend/src/components/ui/avatar.jsx`

- [ ] **Step 1: Simplify `taskUtils.js`**
  - Replace `toDateString()` hand-rolled padStart logic with standard ISO slice while preserving null check.
  - Simplify `getPriorityColor()` to direct dictionary lookup.

- [ ] **Step 2: Clean up `avatar.js`**
  - Drop dead `avatar` and `email` normalization properties from `normalizeUserData`.
  - Streamline `getAvatarInitials()`.

- [ ] **Step 3: Clean up `button.jsx`**
  - Remove unused variants (`destructive`, `secondary`, `link`) and unused sizes (`lg`, `icon-xs`).

- [ ] **Step 4: Remove redundant mirrored version state in `KanbanHeader.jsx`**
  - Derive version label directly in render from `activeVersion`.
  - Remove redundant `version` useState and useEffect.

- [ ] **Step 5: Simplify `avatar.jsx`**
  - Remove dead `AvatarImage` (no avatars stored in DB) and simplify `Avatar` and `AvatarFallback` into a single, clean component.

- [ ] **Step 6: Verify frontend builds**
  - Run: `cd frontend && npm run build`
  - Expected: Build succeeds without errors.

- [ ] **Step 7: Commit frontend utility simplifications**
  - Commit message: `refactor(frontend): simplify date utils, avatar components, and header state`

---

### Task 3: Deduplicate Login & SetPassword Shared Visual Shell

**Files:**
- Create: `frontend/src/components/AuthLayout.jsx`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/pages/SetPassword.jsx`

- [ ] **Step 1: Extract shared artwork panel into `AuthLayout.jsx`**
  - Move the 110-line left panel (topography pattern, SVG leaf cutout mask, live telemetry pill) into `AuthLayout`.
  - Accept form header (`subtitle`, `title`, `description`) and children (the input form).

- [ ] **Step 2: Refactor `Login.jsx` to use `AuthLayout`**
  - Replace redundant markup with `<AuthLayout>`.

- [ ] **Step 3: Refactor `SetPassword.jsx` to use `AuthLayout`**
  - Replace redundant markup with `<AuthLayout>`.

- [ ] **Step 4: Verify build and visual appearance**
  - Run: `cd frontend && npm run build`
  - Expected: Successful compilation with ~110 lines deduplicated.

- [ ] **Step 5: Commit auth shell deduplication**
  - Commit message: `refactor(frontend): extract shared AuthLayout and deduplicate auth pages`
