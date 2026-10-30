package com.something.support.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 4-Tier Admin Modules Analytics Response.
 */
public record ModuleAnalyticsResponse(
        SummaryKpis summary,
        List<PipelineDistributionItem> pipelineDistribution,
        List<PriorityBreakdownItem> priorityBreakdown,
        List<DeveloperWorkloadItem> developerWorkload,
        List<ProjectProgressItem> projectProgress,
        List<FilteredModuleItem> filteredModules
) {
    public record SummaryKpis(
            long totalModules,
            long completedModules,
            double completionRate,
            long activeWipCount,
            long overdueCount,
            double overdueRate,
            long totalSubtasks,
            long completedSubtasks,
            double subtaskVelocity
    ) {}

    public record PipelineDistributionItem(
            String status,
            long total,
            long high,
            long medium,
            long low
    ) {}

    public record PriorityBreakdownItem(
            String priority,
            long count,
            double percentage
    ) {}

    public record DeveloperWorkloadItem(
            String devName,
            long assignedTotal,
            long toBeDone,
            long inProgress,
            long testing,
            long completed,
            long overdueCount,
            long subtasksDone,
            long subtasksTotal
    ) {}

    public record ProjectProgressItem(
            Long projectId,
            String projectName,
            long totalModules,
            long completedModules,
            double progressPercentage
    ) {}

    public record FilteredModuleItem(
            Long moduleId,
            String title,
            Long projectId,
            String projectName,
            Long versionId,
            String versionLabel,
            String status,
            String priority,
            String assignedTo,
            List<String> assigneeDevNames,
            LocalDate dueDate,
            boolean isOverdue,
            long completedSubtasks,
            long totalSubtasks,
            int subtaskProgress,
            LocalDateTime updatedAt
    ) {}
}
