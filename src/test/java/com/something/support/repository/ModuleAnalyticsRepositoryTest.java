package com.something.support.repository;

import com.something.support.entity.Module;
import com.something.support.entity.Project;
import com.something.support.entity.ProjectMember;
import com.something.support.entity.ProjectVersion;
import com.something.support.enums.ModuleStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ModuleAnalyticsRepositoryTest {

    @Autowired
    private ModuleRepository moduleRepo;

    @Autowired
    private ProjectRepository projectRepo;

    @Autowired
    private ProjectVersionRepository versionRepo;

    @Autowired
    private ProjectMemberRepository memberRepo;

    private Project testProject;
    private ProjectVersion testVersion;

    @BeforeEach
    public void setup() {
        testProject = projectRepo.save(Project.builder()
                .projectName("Analytics Test Project " + System.currentTimeMillis())
                .description("Testing repository queries")
                .createdBy("admin")
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());

        testVersion = versionRepo.save(ProjectVersion.builder()
                .project(testProject)
                .versionNumber(1)
                .label("v1.0.0")
                .releaseNotes("Initial")
                .createdBy("admin")
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());
    }

    @Test
    public void testStatusAndPriorityCounts() {
        moduleRepo.save(Module.builder()
                .version(testVersion)
                .title("Task A")
                .status(ModuleStatus.ToBeDone)
                .priority("high")
                .position(0)
                .assignedTo("alice")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        moduleRepo.save(Module.builder()
                .version(testVersion)
                .title("Task B")
                .status(ModuleStatus.start)
                .priority("high")
                .position(0)
                .assignedTo("alice")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        long toBeDone = moduleRepo.countByStatus(ModuleStatus.ToBeDone);
        assertTrue(toBeDone >= 1);

        long highCount = moduleRepo.countByPriority("high");
        assertTrue(highCount >= 2);
    }

    @Test
    public void testOverdueQueries() {
        LocalDate today = LocalDate.now();

        // Overdue module (dueDate yesterday, status = start)
        moduleRepo.save(Module.builder()
                .version(testVersion)
                .title("Overdue Task")
                .status(ModuleStatus.start)
                .priority("medium")
                .position(0)
                .assignedTo("bob")
                .dueDate(today.minusDays(2))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // Completed module with past due date -> should NOT be counted as overdue
        moduleRepo.save(Module.builder()
                .version(testVersion)
                .title("Completed Past Due")
                .status(ModuleStatus.production)
                .priority("medium")
                .position(0)
                .assignedTo("bob")
                .dueDate(today.minusDays(5))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        long overdueAll = moduleRepo.countOverdue(today);
        assertTrue(overdueAll >= 1);

        long overdueBob = moduleRepo.countOverdueForDev("bob", today);
        assertEquals(1, overdueBob);
    }

    @Test
    public void testDevAssignedAndUpcomingDeadlines() {
        LocalDate today = LocalDate.now();

        moduleRepo.save(Module.builder()
                .version(testVersion)
                .title("Upcoming Task 1")
                .status(ModuleStatus.start)
                .priority("high")
                .position(0)
                .assignedTo("carol")
                .dueDate(today.plusDays(1))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        List<Module> assigned = moduleRepo.findAllAssignedToDev("carol");
        assertEquals(1, assigned.size());
        assertEquals("Upcoming Task 1", assigned.get(0).getTitle());

        List<Module> upcoming = moduleRepo.findUpcomingDeadlinesForDev("carol", today, PageRequest.of(0, 5));
        assertEquals(1, upcoming.size());
        assertEquals("Upcoming Task 1", upcoming.get(0).getTitle());
    }

    @Test
    public void testProjectMemberActiveCount() {
        memberRepo.save(ProjectMember.builder()
                .project(testProject)
                .devName("dave")
                .addedBy("admin")
                .addedAt(LocalDateTime.now())
                .isActive(true)
                .build());

        long activeCount = memberRepo.countByDevNameAndIsActiveTrue("dave");
        assertTrue(activeCount >= 1);
    }
}
