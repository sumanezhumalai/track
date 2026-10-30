package com.something.support.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Role-aware dashboard statistics response.
 * If user is Admin, adminStats is populated and devStats is null.
 * If user is Dev, devStats is populated and adminStats is null.
 */
public record DashboardStatsResponse(
        boolean isAdmin,
        AdminStats adminStats,
        DevStats devStats
) {
    public record AdminStats(
            long totalProjects,
            long totalModules,
            long toBeDoneCount,
            long inProgressCount,
            long testingCount,
            long productionCount,
            long highPriorityCount,
            long mediumPriorityCount,
            long lowPriorityCount,
            long overdueCount,
            double completionRate,
            List<RecentModuleItem> recentActivity
    ) {}

    public record DevStats(
            String devName,
            long myProjectsCount,
            long myAssignedModulesCount,
            long myToBeDone,
            long myInProgress,
            long myTesting,
            long myCompleted,
            long myOverdueCount,
            long myCompletedSubtasks,
            long myTotalSubtasks,
            int mySubtaskProgress,
            List<RecentModuleItem> myUpcomingDeadlines
    ) {}

    public record RecentModuleItem(
            Long moduleId,
            String title,
            Long projectId,
            String projectName,
            Long versionId,
            String versionLabel,
            String status,
            String priority,
            String assignedTo,
            LocalDate dueDate,
            LocalDateTime updatedAt
    ) {}
}
