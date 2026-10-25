package com.something.support.dto;

/**
 * Request body for adding a dev to a project.
 * devName must exist in devSupport (validated in service).
 * Admin only.
 */
public record ProjectMemberRequest(
        String devName
) {}
