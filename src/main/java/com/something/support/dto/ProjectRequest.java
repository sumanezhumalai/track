package com.something.support.dto;

/**
 * Request body for creating a new project.
 * Admin only.
 */
public record ProjectRequest(
        String projectName,
        String description
) {}
