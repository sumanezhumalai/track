package com.something.support.dto;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class DtoSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void testDashboardStatsResponseInstantiation() throws Exception {
        DashboardStatsResponse.RecentModuleItem item = new DashboardStatsResponse.RecentModuleItem(
                1L, "Module 1", 10L, "Project Alpha", 100L, "v1.0.0",
                "start", "high", "alice", LocalDate.of(2026, 11, 1),
                LocalDateTime.of(2026, 10, 29, 12, 0, 0)
        );

        DashboardStatsResponse.AdminStats adminStats = new DashboardStatsResponse.AdminStats(
                3L, 15L, 4L, 6L, 2L, 3L, 5L, 7L, 3L, 1L, 20.0, List.of(item)
        );

        DashboardStatsResponse response = new DashboardStatsResponse(true, adminStats, null);

        assertTrue(response.isAdmin());
        assertNotNull(response.adminStats());
        assertEquals(15L, response.adminStats().totalModules());
        assertEquals("Module 1", response.adminStats().recentActivity().get(0).title());
    }

    @Test
    public void testModuleAnalyticsResponseInstantiation() throws Exception {
        ModuleAnalyticsResponse.SummaryKpis summary = new ModuleAnalyticsResponse.SummaryKpis(
                20L, 8L, 40.0, 7L, 2L, 10.0, 50L, 35L, 70.0
        );

        ModuleAnalyticsResponse.PipelineDistributionItem pipelineItem =
                new ModuleAnalyticsResponse.PipelineDistributionItem("start", 5L, 2L, 2L, 1L);

        ModuleAnalyticsResponse.PriorityBreakdownItem priorityItem =
                new ModuleAnalyticsResponse.PriorityBreakdownItem("high", 6L, 30.0);

        ModuleAnalyticsResponse.DeveloperWorkloadItem workloadItem =
                new ModuleAnalyticsResponse.DeveloperWorkloadItem("alice", 10L, 2L, 4L, 1L, 3L, 1L, 15L, 20L);

        ModuleAnalyticsResponse.ProjectProgressItem progressItem =
                new ModuleAnalyticsResponse.ProjectProgressItem(1L, "Project Alpha", 20L, 8L, 40.0);

        ModuleAnalyticsResponse.FilteredModuleItem moduleItem =
                new ModuleAnalyticsResponse.FilteredModuleItem(
                        10L, "Task 1", 1L, "Project Alpha", 2L, "v1.0.0",
                        "start", "high", "alice", List.of("alice", "bob"),
                        LocalDate.of(2026, 11, 5), false, 3L, 4L, 75,
                        LocalDateTime.of(2026, 10, 29, 10, 0, 0)
                );

        ModuleAnalyticsResponse response = new ModuleAnalyticsResponse(
                summary,
                List.of(pipelineItem),
                List.of(priorityItem),
                List.of(workloadItem),
                List.of(progressItem),
                List.of(moduleItem)
        );

        assertEquals(20L, response.summary().totalModules());
        assertEquals("alice", response.developerWorkload().get(0).devName());
    }
}
