-- ============================================================
-- V5 — Add 'ToBeDone' status to module_status ENUM
-- ============================================================
-- 1. Adds 'ToBeDone' value to "EGS"."module_status" ENUM before 'start'.
--    Preserves existing data ('start', 'testing', 'production') intact.
-- 2. Sets the default status of "EGS"."module" to 'ToBeDone'.
-- ============================================================

ALTER TYPE "EGS"."module_status" ADD VALUE IF NOT EXISTS 'ToBeDone' BEFORE 'start';

ALTER TABLE "EGS"."module" ALTER COLUMN status SET DEFAULT 'ToBeDone';
