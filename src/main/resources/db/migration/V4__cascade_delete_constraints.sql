-- ============================================================
-- V4 — Cascade Delete Constraints for Project and Version
-- ============================================================
-- Modifies:
--   1. project_version(project_id) -> project(project_id) ON DELETE CASCADE
--   2. project_member(project_id)  -> project(project_id) ON DELETE CASCADE
--   3. module(version_id)          -> project_version(version_id) ON DELETE CASCADE
--
-- Preserves existing ON DELETE CASCADE on:
--   4. module_assignee(module_id)  -> module(module_id) ON DELETE CASCADE
--   5. module_subtask(module_id)   -> module(module_id) ON DELETE CASCADE
-- ============================================================

-- 1. project_version -> project CASCADE
ALTER TABLE "EGS"."project_version"
    DROP CONSTRAINT IF EXISTS project_version_project_id_fkey,
    ADD CONSTRAINT project_version_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES "EGS"."project"(project_id) ON DELETE CASCADE;

-- 2. project_member -> project CASCADE
ALTER TABLE "EGS"."project_member"
    DROP CONSTRAINT IF EXISTS project_member_project_id_fkey,
    ADD CONSTRAINT project_member_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES "EGS"."project"(project_id) ON DELETE CASCADE;

-- 3. module -> project_version CASCADE
ALTER TABLE "EGS"."module"
    DROP CONSTRAINT IF EXISTS module_version_id_fkey,
    ADD CONSTRAINT module_version_id_fkey
        FOREIGN KEY (version_id) REFERENCES "EGS"."project_version"(version_id) ON DELETE CASCADE;
