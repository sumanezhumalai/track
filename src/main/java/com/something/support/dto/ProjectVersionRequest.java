package com.something.support.dto;

/**
 * Request body for adding a new version to an existing project.
 * Admin only. version_number is auto-incremented server-side (MAX + 1).
 */
public record ProjectVersionRequest(
        String label,        // optional display label e.g. "v2.0.0"
        String releaseNotes  // optional release summary
) {}
