package com.something.support.enums;

/**
 * Kanban column states — mirrors the Postgres ENUM "EGS".module_status exactly.
 * Values must match the DB ENUM labels: 'start', 'testing', 'production'.
 */
public enum ModuleStatus {
    start,
    testing,
    production
}
