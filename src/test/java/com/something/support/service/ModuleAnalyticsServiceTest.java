package com.something.support.service;

import com.something.support.dto.DashboardStatsResponse;
import com.something.support.dto.ModuleAnalyticsResponse;
import com.something.support.entity.Module;
import com.something.support.entity.Project;
import com.something.support.entity.ProjectMember;
import com.something.support.entity.ProjectVersion;
import com.something.support.enums.ModuleStatus;
import com.something.support.repository.ModuleRepository;
import com.something.support.repository.ProjectMemberRepository;
import com.something.support.repository.ProjectRepository;
import com.something.support.repository.ProjectVersionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ModuleAnalyticsServiceTest {

    @Autowired
    private ModuleAnalyticsService analyticsService;

    @Autowired
    private ProjectRepository projectRepo;

    @Autowired
    private ProjectVersionRepository versionRepo;

    @Autowired
    private ModuleRepository moduleRepo;

    @Autowired
    private ProjectMemberRepository memberRepo;

    private Project projectA;
    private ProjectVersion versionA;

    @BeforeEach
    public void setup() {
        projectA = projectRepo.save(Project.builder()
                .projectName("Analytics Svc Proj " + System.currentTimeMillis())
                .description("Service test")
                .createdBy("admin")
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());

        versionA = versionRepo.save(ProjectVersion.builder()
                .project(projectA)
                .versionNumber(1)
                .label("v1.0.0")
                .releaseNotes("Initial release")
                .createdBy("admin")
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());

        memberRepo.save(ProjectMember.builder()
                .project(projectA)
                .devName("dev_svc_test")
                .addedBy("admin")
                .addedAt(LocalDateTime.now())
                .isActive(true)
                .build());

        // Create 3 modules: 1 ToBeDone (high), 1 start (medium, assignedTo dev_svc_test, overdue), 1 production (low)
        moduleRepo.save(Module.builder()
                .version(versionA)
                .title("Module 1")
                .status(ModuleStatus.ToBeDone)
                .priority("high")
                .position(0)
                .assignedTo("other_dev")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        moduleRepo.save(Module.builder()
                .version(versionA)
                .title("Module 2")
                .status(ModuleStatus.start)
                .priority("medium")
                .position(0)
                .assignedTo("dev_svc_test")
                .dueDate(LocalDate.now().minusDays(1)) // overdue
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        moduleRepo.save(Module.builder()
                .version(versionA)
                .title("Module 3")
                .status(ModuleStatus.production)
                .priority("low")
                .position(0)
                .assignedTo("dev_svc_test")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    @Test
    public void testGetDashboardStatsAsAdmin() {
        DashboardStatsResponse res = analyticsService.getDashboardStats("admin", true);
        assertTrue(res.isAdmin());
        assertNotNull(res.adminStats());
        assertNull(res.devStats());

        DashboardStatsResponse.AdminStats stats = res.adminStats();
        assertTrue(stats.totalProjects() >= 1);
        assertTrue(stats.totalModules() >= 3);
        assertTrue(stats.highPriorityCount() >= 1);
        assertTrue(stats.overdueCount() >= 1);
        assertNotNull(stats.recentActivity());
        assertFalse(stats.recentActivity().isEmpty());
    }

    @Test
    public void testGetDashboardStatsAsDev() {
        DashboardStatsResponse res = analyticsService.getDashboardStats("dev_svc_test", false);
        assertFalse(res.isAdmin());
        assertNull(res.adminStats());
        assertNotNull(res.devStats());

        DashboardStatsResponse.DevStats stats = res.devStats();
        assertEquals("dev_svc_test", stats.devName());
        assertEquals(2, stats.myAssignedModulesCount());
        assertEquals(1, stats.myInProgress());
        assertEquals(1, stats.myCompleted());
        assertEquals(1, stats.myOverdueCount());
        assertEquals(50, (int) ((1.0 / 2.0) * 100)); // 1 of 2 completed
    }

    @Test
    public void testGetModuleAnalyticsWithFilters() {
        // Query analytics for projectA
        ModuleAnalyticsResponse res = analyticsService.getModuleAnalytics(
                projectA.getProjectId(), null, null, null, null, null, null
        );

        assertNotNull(res);
        assertNotNull(res.summary());
        assertEquals(3, res.summary().totalModules());
        assertEquals(1, res.summary().completedModules());
        assertEquals(1, res.summary().overdueCount());

        assertNotNull(res.pipelineDistribution());
        assertEquals(4, res.pipelineDistribution().size()); // all 4 statuses

        assertNotNull(res.developerWorkload());
        assertTrue(res.developerWorkload().stream().anyMatch(w -> "dev_svc_test".equals(w.devName())));

        assertNotNull(res.filteredModules());
        assertEquals(3, res.filteredModules().size());
    }
}
