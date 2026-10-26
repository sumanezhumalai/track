package com.something.support.service;

import com.something.support.dto.*;
import com.something.support.entity.Module;
import com.something.support.entity.ModuleAssignee;
import com.something.support.entity.Project;
import com.something.support.entity.ProjectMember;
import com.something.support.entity.ProjectVersion;
import com.something.support.enums.ModuleStatus;
import com.something.support.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository            projectRepo;
    private final ProjectVersionRepository     versionRepo;
    private final ProjectMemberRepository      memberRepo;
    private final ModuleRepository             moduleRepo;
    private final AuditService                 auditService;

    // ── Projects ─────────────────────────────────────────────────────────────

    /** Returns all active projects. Devs see only their assigned ones (filtered here). */
    public List<Project> getAllProjects(String devName, boolean isAdmin) {
        List<Project> all = projectRepo.findAllByIsActiveTrue();
        if (isAdmin) return all;
        return all.stream()
                .filter(p -> memberRepo.existsByProject_ProjectIdAndDevNameAndIsActiveTrue(p.getProjectId(), devName))
                .toList();
    }

    @Transactional
    public Project createProject(ProjectRequest req, String createdBy) {
        if (projectRepo.findByProjectName(req.projectName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Project already exists: " + req.projectName());
        }
        Project project = projectRepo.save(Project.builder()
                .projectName(req.projectName())
                .description(req.description())
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());

        // Seed version 1 automatically
        versionRepo.save(ProjectVersion.builder()
                .project(project)
                .versionNumber(1)
                .label("v1.0.0")
                .releaseNotes("Initial release.")
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());

        auditService.log("PROJECT_CREATED: " + project.getProjectName(), createdBy, "SUCCESS");
        return project;
    }

    @Transactional
    public Project updateProject(Long projectId, ProjectRequest req, String updatedBy) {
        Project project = getProjectOrThrow(projectId);
        if (req.projectName() != null && !req.projectName().equalsIgnoreCase(project.getProjectName())) {
            projectRepo.findByProjectName(req.projectName()).ifPresent(existing -> {
                if (!existing.getProjectId().equals(projectId)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Project already exists: " + req.projectName());
                }
            });
            project.setProjectName(req.projectName());
        }
        if (req.description() != null) {
            project.setDescription(req.description());
        }
        Project saved = projectRepo.save(project);
        auditService.log("PROJECT_UPDATED: " + saved.getProjectName(), updatedBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public void deleteProject(Long projectId, String deletedBy) {
        Project project = getProjectOrThrow(projectId);
        String name = project.getProjectName();
        projectRepo.deleteById(projectId);
        auditService.log("PROJECT_DELETED: " + name, deletedBy, "SUCCESS");
    }

    // ── Versions ─────────────────────────────────────────────────────────────

    public List<ProjectVersion> getVersions(Long projectId) {
        return versionRepo.findAllByProject_ProjectIdOrderByVersionNumberDesc(projectId);
    }

    @Transactional
    public ProjectVersion addVersion(Long projectId, ProjectVersionRequest req, String createdBy) {
        Project project = getProjectOrThrow(projectId);

        int nextNumber = versionRepo
                .findTopByProject_ProjectIdOrderByVersionNumberDesc(projectId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        ProjectVersion version = versionRepo.save(ProjectVersion.builder()
                .project(project)
                .versionNumber(nextNumber)
                .label(req.label() != null ? req.label() : "v" + nextNumber + ".0.0")
                .releaseNotes(req.releaseNotes())
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build());

        auditService.log(
                "PROJECT_VERSION_ADDED: " + project.getProjectName() + " v" + nextNumber,
                createdBy, "SUCCESS");
        return version;
    }

    @Transactional
    public ProjectVersion updateVersion(Long projectId, Long versionId, ProjectVersionRequest req, String updatedBy) {
        Project project = getProjectOrThrow(projectId);
        ProjectVersion version = versionRepo.findById(versionId)
                .filter(v -> v.getProject().getProjectId().equals(projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found: " + versionId));

        if (req.label() != null) {
            version.setLabel(req.label());
        }
        if (req.releaseNotes() != null) {
            version.setReleaseNotes(req.releaseNotes());
        }
        ProjectVersion saved = versionRepo.save(version);
        auditService.log("PROJECT_VERSION_UPDATED: " + project.getProjectName() + " v" + saved.getVersionNumber(), updatedBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public void deleteVersion(Long projectId, Long versionId, String deletedBy) {
        Project project = getProjectOrThrow(projectId);
        List<ProjectVersion> allVersions = versionRepo.findAllByProject_ProjectIdOrderByVersionNumberDesc(projectId);
        if (allVersions.size() <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete the only remaining version of a project");
        }
        ProjectVersion version = versionRepo.findById(versionId)
                .filter(v -> v.getProject().getProjectId().equals(projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found: " + versionId));

        int versionNumber = version.getVersionNumber();
        versionRepo.deleteById(versionId);
        auditService.log("PROJECT_VERSION_DELETED: " + project.getProjectName() + " v" + versionNumber, deletedBy, "SUCCESS");
    }

    // ── Members ───────────────────────────────────────────────────────────────

    public List<ProjectMember> getMembers(Long projectId) {
        return memberRepo.findAllByProject_ProjectIdAndIsActiveTrue(projectId);
    }

    @Transactional
    public ProjectMember addMember(Long projectId, ProjectMemberRequest req, String addedBy) {
        Project project = getProjectOrThrow(projectId);

        // Upsert: reactivate if previously removed, else insert
        ProjectMember member = memberRepo
                .findByProject_ProjectIdAndDevName(projectId, req.devName())
                .map(existing -> {
                    existing.setActive(true);
                    existing.setAddedBy(addedBy);
                    existing.setAddedAt(LocalDateTime.now());
                    return existing;
                })
                .orElseGet(() -> ProjectMember.builder()
                        .project(project)
                        .devName(req.devName())
                        .addedBy(addedBy)
                        .addedAt(LocalDateTime.now())
                        .isActive(true)
                        .build());

        ProjectMember saved = memberRepo.save(member);
        auditService.log(
                "PROJECT_MEMBER_ADDED: " + req.devName() + " → " + project.getProjectName(),
                addedBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public void removeMember(Long projectId, String devName, String removedBy) {
        Project project = getProjectOrThrow(projectId);
        ProjectMember member = memberRepo.findByProject_ProjectIdAndDevName(projectId, devName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Member not found: " + devName));
        member.setActive(false);
        memberRepo.save(member);
        auditService.log(
                "PROJECT_MEMBER_REMOVED: " + devName + " ← " + project.getProjectName(),
                removedBy, "SUCCESS");
    }

    // ── Board ─────────────────────────────────────────────────────────────────

    /**
     * Builds the full KanbanBoardResponse for a project version.
     * Admin: all modules in all columns.
     * Dev: only modules where they appear in module_assignee.
     */
    @Transactional(readOnly = true)
    public KanbanBoardResponse getBoard(Long projectId, Long versionId, String devName, boolean isAdmin) {
        Project project = getProjectOrThrow(projectId);

        // Resolve version: use supplied versionId or fall back to most recent
        ProjectVersion version = (versionId != null)
                ? versionRepo.findById(versionId)
                        .filter(v -> v.getProject().getProjectId().equals(projectId))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found"))
                : versionRepo.findTopByProject_ProjectIdOrderByVersionNumberDesc(projectId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No versions found"));

        // Access guard for dev
        if (!isAdmin && !memberRepo.existsByProject_ProjectIdAndDevNameAndIsActiveTrue(projectId, devName)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this project");
        }

        // Load modules — admin sees all, dev sees only assigned (primary or collaborative)
        List<Module> modules = isAdmin
                ? moduleRepo.findAllByVersion_VersionIdOrderByStatusAscPositionAsc(version.getVersionId())
                : moduleRepo.findAllAssignedToDevInVersion(version.getVersionId(), devName);

        // Group into columns keyed by status name
        Map<String, List<KanbanBoardResponse.ModuleCardResponse>> columns = modules.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getStatus().name(),
                        Collectors.mapping(this::toCardResponse, Collectors.toList())
                ));

        // Ensure all three columns always present (even if empty)
        for (ModuleStatus s : ModuleStatus.values()) {
            columns.putIfAbsent(s.name(), List.of());
        }

        // Version switcher list (newest first)
        List<KanbanBoardResponse.VersionInfo> allVersions = versionRepo
                .findAllByProject_ProjectIdOrderByVersionNumberDesc(projectId)
                .stream()
                .map(v -> new KanbanBoardResponse.VersionInfo(
                        v.getVersionId(),
                        v.getVersionNumber(),
                        v.getLabel() != null ? v.getLabel() : "v" + v.getVersionNumber()))
                .toList();

        // Active member list for TeamAvatarGroup
        List<String> memberDevNames = memberRepo
                .findAllByProject_ProjectIdAndIsActiveTrue(projectId)
                .stream()
                .map(ProjectMember::getDevName)
                .toList();

        String versionLabel = version.getLabel() != null
                ? version.getLabel()
                : "v" + version.getVersionNumber();

        return new KanbanBoardResponse(
                projectId,
                version.getVersionId(),
                project.getProjectName(),
                versionLabel,
                allVersions,
                memberDevNames,
                columns
        );
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private KanbanBoardResponse.ModuleCardResponse toCardResponse(Module m) {
        List<String> assigneeNames = m.getModuleAssignees().stream()
                .map(ModuleAssignee::getDevName)
                .toList();

        List<KanbanBoardResponse.SubtaskInfo> subtaskInfos = m.getSubtasks().stream()
                .map(s -> new KanbanBoardResponse.SubtaskInfo(
                        s.getSubtaskId(), s.getText(), s.isCompleted(), s.getDisplayOrder()))
                .toList();

        int total    = subtaskInfos.size();
        int done     = (int) subtaskInfos.stream().filter(KanbanBoardResponse.SubtaskInfo::completed).count();
        int progress = total == 0 ? 0 : Math.round((done * 100f) / total);

        return new KanbanBoardResponse.ModuleCardResponse(
                m.getModuleId(),
                m.getTitle(),
                m.getDescription(),
                m.getStatus().name(),
                m.getPriority(),
                m.getPosition(),
                m.getAssignedTo(),
                m.getDueDate(),
                m.getCreatedAt(),
                m.getUpdatedAt(),
                assigneeNames,
                subtaskInfos,
                progress
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Project getProjectOrThrow(Long projectId) {
        return projectRepo.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Project not found: " + projectId));
    }
}
