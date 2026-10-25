-- ============================================================
-- V3 — Kanban Module Management
-- ============================================================
-- Adds: module_status (ENUM: start, testing, production),
--       project, project_version, project_member,
--       module, module_assignee, module_subtask
--
-- SAFE: No modifications to existing tables or data.
--       All new tables are additive-only.
--
-- Naming convention: all "task" → "module" per spec.
-- task_attachment is intentionally NOT included (removed per spec).
-- ============================================================

-- ============================================================
-- 0. ENUM: module_status
--    The exact 3 Kanban columns: 'start', 'testing', 'production'.
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = 'module_status' AND n.nspname = 'EGS'
    ) THEN
        CREATE TYPE "EGS"."module_status" AS ENUM ('start', 'testing', 'production');
    END IF;
END$$;


-- ============================================================
-- 1. project
--    One project → many versions.
--    Admins create projects and assign versions.
-- ============================================================
CREATE TABLE IF NOT EXISTS "EGS"."project" (
    project_id   BIGSERIAL    PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL UNIQUE,
    description  TEXT,
    created_by   VARCHAR(100),                     -- dev_name of admin
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE -- soft-delete
);

COMMENT ON TABLE  "EGS"."project"              IS 'Top-level project entity. Each project can have multiple versions.';
COMMENT ON COLUMN "EGS"."project".project_name IS 'Unique human-readable project name shown in the sidebar card.';
COMMENT ON COLUMN "EGS"."project".created_by   IS 'dev_name of the admin who created the project (loose ref, resilient).';
COMMENT ON COLUMN "EGS"."project".is_active     IS 'FALSE = soft-deleted; project and its history are retained.';


-- ============================================================
-- 2. project_version
--    Each version is an integer (1, 2, 3…).
--    Frontend renders as "v{version_number}" or uses label.
--    Old versions are preserved — historical boards always accessible.
-- ============================================================
CREATE TABLE IF NOT EXISTS "EGS"."project_version" (
    version_id     BIGSERIAL    PRIMARY KEY,
    project_id     BIGINT       NOT NULL
                   REFERENCES "EGS"."project"(project_id)
                   ON DELETE RESTRICT,             -- protect history
    version_number INT          NOT NULL,          -- incremental: 1, 2, 3…
    label          VARCHAR(50),                    -- optional: "v1.0.0", "Beta", etc.
    release_notes  TEXT,
    created_by     VARCHAR(100),                   -- dev_name of admin
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_project_version UNIQUE (project_id, version_number)
);

COMMENT ON TABLE  "EGS"."project_version"               IS 'Versioned snapshots of a project. Each Kanban board is scoped to one version.';
COMMENT ON COLUMN "EGS"."project_version".version_number IS 'Integer version counter, unique per project. Increment: SELECT MAX(version_number)+1 FROM project_version WHERE project_id=?';
COMMENT ON COLUMN "EGS"."project_version".label          IS 'Optional display label (e.g. "v1.0.0"). If null, frontend uses "v{version_number}".';

CREATE INDEX IF NOT EXISTS idx_project_version_project_id
    ON "EGS"."project_version"(project_id);


-- ============================================================
-- 3. project_member
--    Project-level membership (not version-specific per spec).
--    Uses dev_name (VARCHAR) — NOT a FK to devSupport.dev_id.
--    Reason: resilient to user deletion; history is preserved.
--    is_active = FALSE means admin soft-removed the dev.
-- ============================================================
CREATE TABLE IF NOT EXISTS "EGS"."project_member" (
    member_id  BIGSERIAL    PRIMARY KEY,
    project_id BIGINT       NOT NULL
               REFERENCES "EGS"."project"(project_id)
               ON DELETE RESTRICT,
    dev_name   VARCHAR(100) NOT NULL,              -- loose ref to devSupport.dev_name
    added_by   VARCHAR(100),                       -- dev_name of admin who added
    added_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE, -- FALSE = removed by admin

    CONSTRAINT uq_project_member UNIQUE (project_id, dev_name)
);

COMMENT ON TABLE  "EGS"."project_member"          IS 'Tracks which devs are assigned to a project (project-level, applies to all versions).';
COMMENT ON COLUMN "EGS"."project_member".dev_name  IS 'dev_name from devSupport — intentionally a loose VARCHAR ref, not a FK, for resilience.';
COMMENT ON COLUMN "EGS"."project_member".is_active  IS 'FALSE = admin removed the dev from project. Historical modules they created/were assigned to are unaffected.';

CREATE INDEX IF NOT EXISTS idx_project_member_project_id
    ON "EGS"."project_member"(project_id);

CREATE INDEX IF NOT EXISTS idx_project_member_dev_name
    ON "EGS"."project_member"(dev_name);


-- ============================================================
-- 4. module
--    The core "task" entity — named "module" per spec.
--    Scoped to a project_version (FK).
--    status: ENUM ('start', 'testing', 'production') = which column.
--    position: INT = exact row order within the column (0, 1, 2...).
-- ============================================================
CREATE TABLE IF NOT EXISTS "EGS"."module" (
    module_id    BIGSERIAL            PRIMARY KEY,
    version_id   BIGINT               NOT NULL
                 REFERENCES "EGS"."project_version"(version_id)
                 ON DELETE RESTRICT,                       -- protect history
    title        VARCHAR(255)         NOT NULL,
    description  TEXT,
    status       "EGS"."module_status" NOT NULL DEFAULT 'start', -- column: start | testing | production
    position     INT                  NOT NULL DEFAULT 0,       -- exact row order within column (0-indexed)
    priority     VARCHAR(10)          NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to  VARCHAR(100),                             -- primary assignee dev_name (nullable = unassigned)
    due_date     DATE,
    created_by   VARCHAR(100),                             -- dev_name of admin who created
    created_at   TIMESTAMP            NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP            NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  "EGS"."module"             IS 'Core kanban item (called "module" per domain spec). Belongs to a project version.';
COMMENT ON COLUMN "EGS"."module".status       IS 'Kanban column: ENUM (''start'', ''testing'', ''production'').';
COMMENT ON COLUMN "EGS"."module".position     IS 'Exact vertical row index within the column. Enables smooth drag-and-drop reordering.';
COMMENT ON COLUMN "EGS"."module".priority     IS 'low | medium | high — matches KanbanUI priority select options.';
COMMENT ON COLUMN "EGS"."module".assigned_to  IS 'Primary assignee dev_name shown on the kanban card face. For multi-assignee see module_assignee.';
COMMENT ON COLUMN "EGS"."module".updated_at   IS 'Updated on every edit (status change, position change, priority change, etc.).';

CREATE INDEX IF NOT EXISTS idx_module_version_id
    ON "EGS"."module"(version_id);

-- Hot path index: Loads board for version, partitioned by column, sorted by vertical position
CREATE INDEX IF NOT EXISTS idx_module_board_order
    ON "EGS"."module"(version_id, status, position ASC);

CREATE INDEX IF NOT EXISTS idx_module_assigned_to
    ON "EGS"."module"(assigned_to);               -- dev's own module lookup


-- ============================================================
-- 5. module_assignee
--    Multi-assignee support per module.
--    Matches assigneeIds[] in KanbanUI (detail sheet shows all avatars).
--    Loose-coupling: dev_name VARCHAR, not FK.
-- ============================================================
CREATE TABLE IF NOT EXISTS "EGS"."module_assignee" (
    id          BIGSERIAL    PRIMARY KEY,
    module_id   BIGINT       NOT NULL
                REFERENCES "EGS"."module"(module_id)
                ON DELETE CASCADE,                 -- cleanup on module delete
    dev_name    VARCHAR(100) NOT NULL,             -- loose ref to devSupport.dev_name
    assigned_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    assigned_by VARCHAR(100),                      -- dev_name of admin who assigned

    CONSTRAINT uq_module_assignee UNIQUE (module_id, dev_name)
);

COMMENT ON TABLE  "EGS"."module_assignee"         IS 'Multi-assignee join for module. Supports assigneeIds[] shown in the module detail sheet.';
COMMENT ON COLUMN "EGS"."module_assignee".dev_name IS 'dev_name from devSupport — loose VARCHAR ref for resilience to user deletion.';

CREATE INDEX IF NOT EXISTS idx_module_assignee_module_id
    ON "EGS"."module_assignee"(module_id);

CREATE INDEX IF NOT EXISTS idx_module_assignee_dev_name
    ON "EGS"."module_assignee"(dev_name);         -- dev's assigned modules query


-- ============================================================
-- 6. module_subtask
--    Checklist items within a module.
--    Matches subtasks[] in KanbanUI (id, text, completed).
--    Progress % = COUNT(completed)/COUNT(*) computed at API layer.
-- ============================================================
CREATE TABLE IF NOT EXISTS "EGS"."module_subtask" (
    subtask_id    BIGSERIAL PRIMARY KEY,
    module_id     BIGINT    NOT NULL
                  REFERENCES "EGS"."module"(module_id)
                  ON DELETE CASCADE,               -- cleanup on module delete
    text          TEXT      NOT NULL,              -- subtask description / label
    completed     BOOLEAN   NOT NULL DEFAULT FALSE,
    display_order INT       NOT NULL DEFAULT 0,    -- render order in checklist
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  "EGS"."module_subtask"             IS 'Checklist sub-items within a module. Each row = one checkbox in the UI.';
COMMENT ON COLUMN "EGS"."module_subtask".text         IS 'Subtask text label shown next to the checkbox in the detail sheet.';
COMMENT ON COLUMN "EGS"."module_subtask".completed    IS 'Checkbox state — toggled individually by assignee. Progress % derived from this.';
COMMENT ON COLUMN "EGS"."module_subtask".display_order IS 'Integer position in the checklist for consistent rendering order.';

CREATE INDEX IF NOT EXISTS idx_module_subtask_module_id
    ON "EGS"."module_subtask"(module_id);


-- ============================================================
-- SEED: Initial project and first version
--       (matches dbdata.json project: "EGS Support", "v1.0.0")
-- ============================================================
INSERT INTO "EGS"."project" (project_name, description, created_by)
VALUES ('EGS Support', 'Main EGS support and development project.', 'admin')
ON CONFLICT (project_name) DO NOTHING;

INSERT INTO "EGS"."project_version" (project_id, version_number, label, release_notes, created_by)
SELECT project_id, 1, 'v1.0.0', 'Initial release.', 'admin'
FROM   "EGS"."project"
WHERE  project_name = 'EGS Support'
ON CONFLICT (project_id, version_number) DO NOTHING;


-- ============================================================
-- AUDIT NOTE (no schema change required):
--   Reuse existing "EGS"."Audits" table for all kanban events.
--   action examples:
--     'PROJECT_CREATED: EGS Support'
--     'PROJECT_VERSION_ADDED: EGS Support v2'
--     'PROJECT_MEMBER_ADDED: john → EGS Support'
--     'PROJECT_MEMBER_REMOVED: john ← EGS Support'
--     'MODULE_CREATED: #42 in EGS Support v1'
--     'MODULE_ASSIGNED: #42 → john'
--     'MODULE_MOVED: #42 start[0] -> testing[1]'
--     'SUBTASK_TOGGLED: #42/st5 completed'
-- ============================================================
