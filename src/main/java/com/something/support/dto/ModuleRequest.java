package com.something.support.dto;

import com.something.support.enums.ModuleStatus;
import java.time.LocalDate;
import java.util.List;

/**
 * Request body for creating or updating a module.
 * All fields are optional on update (service applies only non-null values).
 */
public record ModuleRequest(
        String title,
        String description,
        ModuleStatus status,
        String priority,           // "low" | "medium" | "high"
        String assignedTo,         // primary assignee dev_name (nullable = unassigned)
        List<String> assigneeDevNames, // full multi-assignee list for detail sheet
        LocalDate dueDate
) {}
