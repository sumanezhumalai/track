package com.something.support.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Full Kanban board response — returned by GET /api/kanban/projects/{id}/board.
 *
 * columns: Map keyed by ModuleStatus name ("start","testing","production").
 *          Each value is the ordered card list for that column (position ASC).
 *          Admins receive all modules; devs receive only their assigned modules.
 */
public record KanbanBoardResponse(
        Long projectId,
        Long versionId,
        String projectName,
        String versionLabel,               // "v1.0.0" or "v1" if no label set
        List<VersionInfo> allVersions,     // for the ProjectBreadcrumb dropdown
        List<String> memberDevNames,       // active project members for TeamAvatarGroup
        Map<String, List<ModuleCardResponse>> columns
) {

    /** Version switcher entry in the ProjectBreadcrumb dropdown */
    public record VersionInfo(Long versionId, int versionNumber, String label) {}

    /** Single card as rendered by TaskCard in KanbanBoard.jsx */
    public record ModuleCardResponse(
            Long moduleId,
            String title,
            String description,
            String status,
            String priority,
            int position,
            String assignedTo,
            LocalDate dueDate,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<String> assigneeDevNames,
            List<SubtaskInfo> subtasks,
            int progress                   // 0–100, computed: completed/total * 100
    ) {}

    /** Subtask row shown in TaskDetailSheet checklist */
    public record SubtaskInfo(
            Long subtaskId,
            String text,
            boolean completed,
            int displayOrder
    ) {}
}
