package com.something.support.service;

import com.something.support.dto.DashboardStatsResponse;
import com.something.support.dto.ModuleAnalyticsResponse;
import com.something.support.entity.Module;
import com.something.support.entity.ModuleSubtask;
import com.something.support.entity.Project;
import com.something.support.entity.ProjectVersion;
import com.something.support.enums.ModuleStatus;
import com.something.support.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleAnalyticsService {

    private final ModuleRepository moduleRepo;
    private final ProjectRepository projectRepo;
    private final ProjectMemberRepository memberRepo;

    /**
     * Role-aware dashboard statistics.
     * Admin: system-wide totals across all projects.
     * Dev: personal workload metrics for the authenticated user.
     */
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(String devName, boolean isAdmin) {
        if (isAdmin) {
            long totalProjects = projectRepo.count();
            long totalModules = moduleRepo.count();
            long toBeDoneCount = moduleRepo.countByStatus(ModuleStatus.ToBeDone);
            long inProgressCount = moduleRepo.countByStatus(ModuleStatus.start);
            long testingCount = moduleRepo.countByStatus(ModuleStatus.testing);
            long productionCount = moduleRepo.countByStatus(ModuleStatus.production);

            long highPriorityCount = moduleRepo.countByPriority("high");
            long mediumPriorityCount = moduleRepo.countByPriority("medium");
            long lowPriorityCount = moduleRepo.countByPriority("low");

            LocalDate today = LocalDate.now();
            long overdueCount = moduleRepo.countOverdue(today);
            double completionRate = totalModules == 0 ? 0.0
                    : Math.round(((double) productionCount / totalModules) * 1000.0) / 10.0;

            List<Module> recentModules = moduleRepo.findRecentUpdated(PageRequest.of(0, 5));
            List<DashboardStatsResponse.RecentModuleItem> recentActivity = recentModules.stream()
                    .map(this::toRecentModuleItem)
                    .toList();

            DashboardStatsResponse.AdminStats adminStats = new DashboardStatsResponse.AdminStats(
                    totalProjects, totalModules, toBeDoneCount, inProgressCount, testingCount, productionCount,
                    highPriorityCount, mediumPriorityCount, lowPriorityCount, overdueCount, completionRate, recentActivity
            );

            return new DashboardStatsResponse(true, adminStats, null);
        } else {
            long myProjectsCount = memberRepo.countByDevNameAndIsActiveTrue(devName);
            List<Module> myModules = moduleRepo.findAllAssignedToDev(devName);

            long myAssignedModulesCount = myModules.size();
            long myToBeDone = myModules.stream().filter(m -> m.getStatus() == ModuleStatus.ToBeDone).count();
            long myInProgress = myModules.stream().filter(m -> m.getStatus() == ModuleStatus.start).count();
            long myTesting = myModules.stream().filter(m -> m.getStatus() == ModuleStatus.testing).count();
            long myCompleted = myModules.stream().filter(m -> m.getStatus() == ModuleStatus.production).count();

            LocalDate today = LocalDate.now();
            long myOverdueCount = moduleRepo.countOverdueForDev(devName, today);

            long myTotalSubtasks = myModules.stream()
                    .mapToLong(m -> m.getSubtasks() != null ? m.getSubtasks().size() : 0)
                    .sum();
            long myCompletedSubtasks = myModules.stream()
                    .flatMap(m -> m.getSubtasks() != null ? m.getSubtasks().stream() : java.util.stream.Stream.empty())
                    .filter(ModuleSubtask::isCompleted)
                    .count();
            int mySubtaskProgress = myTotalSubtasks == 0 ? 0
                    : (int) Math.round(((double) myCompletedSubtasks / myTotalSubtasks) * 100);

            List<Module> upcoming = moduleRepo.findUpcomingDeadlinesForDev(devName, today, PageRequest.of(0, 5));
            List<DashboardStatsResponse.RecentModuleItem> myUpcomingDeadlines = upcoming.stream()
                    .map(this::toRecentModuleItem)
                    .toList();

            DashboardStatsResponse.DevStats devStats = new DashboardStatsResponse.DevStats(
                    devName, myProjectsCount, myAssignedModulesCount, myToBeDone, myInProgress, myTesting, myCompleted,
                    myOverdueCount, myCompletedSubtasks, myTotalSubtasks, mySubtaskProgress, myUpcomingDeadlines
            );

            return new DashboardStatsResponse(false, null, devStats);
        }
    }

    /**
     * Admin-only deep module analytics with multi-dimensional filtering.
     */
    @Transactional(readOnly = true)
    public ModuleAnalyticsResponse getModuleAnalytics(
            Long projectId,
            Long versionId,
            String devName,
            ModuleStatus status,
            String priority,
            LocalDateTime from,
            LocalDateTime to
    ) {
        List<Module> all = moduleRepo.findAll();

        // Apply filters
        List<Module> filtered = all.stream()
                .filter(m -> {
                    if (projectId != null) {
                        if (m.getVersion() == null || m.getVersion().getProject() == null ||
                                !projectId.equals(m.getVersion().getProject().getProjectId())) {
                            return false;
                        }
                    }
                    if (versionId != null) {
                        if (m.getVersion() == null || !versionId.equals(m.getVersion().getVersionId())) {
                            return false;
                        }
                    }
                    if (devName != null && !devName.isBlank()) {
                        boolean isPrimary = devName.equalsIgnoreCase(m.getAssignedTo());
                        boolean isCollaborator = m.getModuleAssignees() != null && m.getModuleAssignees().stream()
                                .anyMatch(ma -> devName.equalsIgnoreCase(ma.getDevName()));
                        if (!isPrimary && !isCollaborator) return false;
                    }
                    if (status != null && m.getStatus() != status) {
                        return false;
                    }
                    if (priority != null && !priority.isBlank()) {
                        if (!priority.equalsIgnoreCase(m.getPriority())) return false;
                    }
                    if (from != null && m.getCreatedAt() != null && m.getCreatedAt().isBefore(from)) {
                        return false;
                    }
                    if (to != null && m.getCreatedAt() != null && m.getCreatedAt().isAfter(to)) {
                        return false;
                    }
                    return true;
                })
                .sorted(Comparator.comparing((Module m) -> m.getUpdatedAt(), Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        // 1. Summary KPIs
        long totalModules = filtered.size();
        long completedModules = filtered.stream().filter(m -> m.getStatus() == ModuleStatus.production).count();
        double completionRate = totalModules == 0 ? 0.0
                : Math.round(((double) completedModules / totalModules) * 1000.0) / 10.0;
        long activeWipCount = filtered.stream()
                .filter(m -> m.getStatus() == ModuleStatus.start || m.getStatus() == ModuleStatus.testing)
                .count();

        LocalDate today = LocalDate.now();
        long overdueCount = filtered.stream()
                .filter(m -> m.getDueDate() != null && m.getDueDate().isBefore(today) && m.getStatus() != ModuleStatus.production)
                .count();
        double overdueRate = totalModules == 0 ? 0.0
                : Math.round(((double) overdueCount / totalModules) * 1000.0) / 10.0;

        long totalSubtasks = filtered.stream()
                .mapToLong(m -> m.getSubtasks() != null ? m.getSubtasks().size() : 0)
                .sum();
        long completedSubtasks = filtered.stream()
                .flatMap(m -> m.getSubtasks() != null ? m.getSubtasks().stream() : java.util.stream.Stream.empty())
                .filter(ModuleSubtask::isCompleted)
                .count();
        double subtaskVelocity = totalSubtasks == 0 ? 0.0
                : Math.round(((double) completedSubtasks / totalSubtasks) * 1000.0) / 10.0;

        ModuleAnalyticsResponse.SummaryKpis summary = new ModuleAnalyticsResponse.SummaryKpis(
                totalModules, completedModules, completionRate, activeWipCount, overdueCount, overdueRate,
                totalSubtasks, completedSubtasks, subtaskVelocity
        );

        // 2. Pipeline Distribution (all 4 statuses)
        List<ModuleAnalyticsResponse.PipelineDistributionItem> pipelineDistribution = new ArrayList<>();
        for (ModuleStatus s : ModuleStatus.values()) {
            List<Module> statusList = filtered.stream().filter(m -> m.getStatus() == s).toList();
            long high = statusList.stream().filter(m -> "high".equalsIgnoreCase(m.getPriority())).count();
            long medium = statusList.stream().filter(m -> "medium".equalsIgnoreCase(m.getPriority())).count();
            long low = statusList.stream().filter(m -> "low".equalsIgnoreCase(m.getPriority())).count();
            pipelineDistribution.add(new ModuleAnalyticsResponse.PipelineDistributionItem(
                    s.name(), statusList.size(), high, medium, low
            ));
        }

        // 3. Priority Breakdown
        List<ModuleAnalyticsResponse.PriorityBreakdownItem> priorityBreakdown = new ArrayList<>();
        for (String prio : List.of("high", "medium", "low")) {
            long count = filtered.stream().filter(m -> prio.equalsIgnoreCase(m.getPriority())).count();
            double pct = totalModules == 0 ? 0.0
                    : Math.round(((double) count / totalModules) * 1000.0) / 10.0;
            priorityBreakdown.add(new ModuleAnalyticsResponse.PriorityBreakdownItem(prio, count, pct));
        }

        // 4. Developer Workload
        Set<String> devNames = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        filtered.forEach(m -> {
            if (m.getAssignedTo() != null && !m.getAssignedTo().isBlank()) {
                devNames.add(m.getAssignedTo());
            }
            if (m.getModuleAssignees() != null) {
                m.getModuleAssignees().forEach(ma -> devNames.add(ma.getDevName()));
            }
        });

        List<ModuleAnalyticsResponse.DeveloperWorkloadItem> developerWorkload = devNames.stream()
                .map(dev -> {
                    List<Module> devMods = filtered.stream()
                            .filter(m -> dev.equalsIgnoreCase(m.getAssignedTo()) ||
                                    (m.getModuleAssignees() != null && m.getModuleAssignees().stream().anyMatch(ma -> dev.equalsIgnoreCase(ma.getDevName()))))
                            .toList();

                    long assignedTotal = devMods.size();
                    long toBeDone = devMods.stream().filter(m -> m.getStatus() == ModuleStatus.ToBeDone).count();
                    long inProg = devMods.stream().filter(m -> m.getStatus() == ModuleStatus.start).count();
                    long test = devMods.stream().filter(m -> m.getStatus() == ModuleStatus.testing).count();
                    long done = devMods.stream().filter(m -> m.getStatus() == ModuleStatus.production).count();
                    long devOverdue = devMods.stream().filter(m -> m.getDueDate() != null && m.getDueDate().isBefore(today) && m.getStatus() != ModuleStatus.production).count();

                    long devSubTotal = devMods.stream().mapToLong(m -> m.getSubtasks() != null ? m.getSubtasks().size() : 0).sum();
                    long devSubDone = devMods.stream()
                            .flatMap(m -> m.getSubtasks() != null ? m.getSubtasks().stream() : java.util.stream.Stream.empty())
                            .filter(ModuleSubtask::isCompleted)
                            .count();

                    return new ModuleAnalyticsResponse.DeveloperWorkloadItem(
                            dev, assignedTotal, toBeDone, inProg, test, done, devOverdue, devSubDone, devSubTotal
                    );
                })
                .sorted((a, b) -> Long.compare(b.assignedTotal(), a.assignedTotal()))
                .toList();

        // 5. Project Progress
        Map<Project, List<Module>> byProject = filtered.stream()
                .filter(m -> m.getVersion() != null && m.getVersion().getProject() != null)
                .collect(Collectors.groupingBy(m -> m.getVersion().getProject()));

        List<ModuleAnalyticsResponse.ProjectProgressItem> projectProgress = byProject.entrySet().stream()
                .map(entry -> {
                    Project p = entry.getKey();
                    long pTotal = entry.getValue().size();
                    long pDone = entry.getValue().stream().filter(m -> m.getStatus() == ModuleStatus.production).count();
                    double pProgress = pTotal == 0 ? 0.0
                            : Math.round(((double) pDone / pTotal) * 1000.0) / 10.0;
                    return new ModuleAnalyticsResponse.ProjectProgressItem(
                            p.getProjectId(), p.getProjectName(), pTotal, pDone, pProgress
                    );
                })
                .sorted((a, b) -> Long.compare(b.totalModules(), a.totalModules()))
                .toList();

        // 6. Filtered Module Item List
        List<ModuleAnalyticsResponse.FilteredModuleItem> filteredModules = filtered.stream()
                .map(m -> {
                    boolean isOverdue = m.getDueDate() != null && m.getDueDate().isBefore(today)
                            && m.getStatus() != ModuleStatus.production;
                    long totalSub = m.getSubtasks() != null ? m.getSubtasks().size() : 0;
                    long doneSub = m.getSubtasks() != null ? m.getSubtasks().stream().filter(ModuleSubtask::isCompleted).count() : 0;
                    int subProgress = totalSub == 0 ? 0 : (int) Math.round(((double) doneSub / totalSub) * 100);

                    List<String> assignees = new ArrayList<>();
                    if (m.getAssignedTo() != null && !m.getAssignedTo().isBlank()) {
                        assignees.add(m.getAssignedTo());
                    }
                    if (m.getModuleAssignees() != null) {
                        m.getModuleAssignees().forEach(ma -> {
                            if (!assignees.contains(ma.getDevName())) assignees.add(ma.getDevName());
                        });
                    }

                    Project project = m.getVersion() != null ? m.getVersion().getProject() : null;
                    Long pId = project != null ? project.getProjectId() : null;
                    String pName = project != null ? project.getProjectName() : "";
                    Long vId = m.getVersion() != null ? m.getVersion().getVersionId() : null;
                    String vLabel = m.getVersion() != null
                            ? (m.getVersion().getLabel() != null ? m.getVersion().getLabel() : "v" + m.getVersion().getVersionNumber())
                            : "";

                    return new ModuleAnalyticsResponse.FilteredModuleItem(
                            m.getModuleId(),
                            m.getTitle(),
                            pId,
                            pName,
                            vId,
                            vLabel,
                            m.getStatus().name(),
                            m.getPriority(),
                            m.getAssignedTo(),
                            assignees,
                            m.getDueDate(),
                            isOverdue,
                            doneSub,
                            totalSub,
                            subProgress,
                            m.getUpdatedAt()
                    );
                })
                .toList();

        return new ModuleAnalyticsResponse(
                summary,
                pipelineDistribution,
                priorityBreakdown,
                developerWorkload,
                projectProgress,
                filteredModules
        );
    }

    private DashboardStatsResponse.RecentModuleItem toRecentModuleItem(Module m) {
        Project project = m.getVersion() != null ? m.getVersion().getProject() : null;
        Long pId = project != null ? project.getProjectId() : null;
        String pName = project != null ? project.getProjectName() : "";
        Long vId = m.getVersion() != null ? m.getVersion().getVersionId() : null;
        String vLabel = m.getVersion() != null
                ? (m.getVersion().getLabel() != null ? m.getVersion().getLabel() : "v" + m.getVersion().getVersionNumber())
                : "";

        return new DashboardStatsResponse.RecentModuleItem(
                m.getModuleId(),
                m.getTitle(),
                pId,
                pName,
                vId,
                vLabel,
                m.getStatus().name(),
                m.getPriority(),
                m.getAssignedTo(),
                m.getDueDate(),
                m.getUpdatedAt()
        );
    }
}
