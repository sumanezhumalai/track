package com.something.support.dto;

import com.something.support.enums.ModuleStatus;
import java.util.List;

/**
 * Drag-and-drop reorder payload.
 *
 * Sent by the frontend after a drag ends (handleDragEnd in kanban.jsx).
 * orderedModuleIds contains the module IDs in their new visual top-to-bottom order.
 * The server derives position (0, 1, 2...) from the list index.
 *
 * Same-column reorder:  status stays same, orderedModuleIds changes.
 * Cross-column move:    status changes, orderedModuleIds is the full new column list.
 */
public record ModuleReorderRequest(
        Long versionId,
        ModuleStatus status,
        List<Long> orderedModuleIds
) {}
