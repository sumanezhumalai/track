package com.something.support.controller;

import com.something.support.dto.*;
import com.something.support.entity.Project;
import com.something.support.entity.ProjectMember;
import com.something.support.entity.ProjectVersion;
import com.something.support.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/kanban/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    // ── Projects ─────────────────────────────────────────────────────────────

    /**
     * GET /api/kanban/projects
     * Admin: all active projects.
     * Dev: only projects they are an active member of.
     */
    @GetMapping
    public List<Project> getAll(Authentication auth) {
        return projectService.getAllProjects(auth.getName(), isAdmin(auth));
    }

    /**
     * POST /api/kanban/projects
     * Admin only — creates a new project and seeds version 1 automatically.
     */
    @PostMapping
    public ResponseEntity<Project> create(@RequestBody ProjectRequest req, Authentication auth) {
        if (!isAdmin(auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.createProject(req, auth.getName()));
    }

    /**
     * PUT /api/kanban/projects/{id}
     * Admin only — updates project name and description.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Project> update(
            @PathVariable Long id,
            @RequestBody ProjectRequest req,
            Authentication auth) {
        if (!isAdmin(auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return ResponseEntity.ok(projectService.updateProject(id, req, auth.getName()));
    }

    /**
     * DELETE /api/kanban/projects/{id}
     * Admin only — deletes project and cascades to all versions, members, and modules.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication auth) {
        if (!isAdmin(auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        projectService.deleteProject(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── Versions ─────────────────────────────────────────────────────────────

    /**
     * GET /api/kanban/projects/{id}/versions
     * All versions for a project, newest first.
     */
    @GetMapping("/{id}/versions")
    public List<ProjectVersion> getVersions(@PathVariable Long id) {
        return projectService.getVersions(id);
    }

    /**
     * POST /api/kanban/projects/{id}/versions
     * Admin only — adds next incremental version (version_number = MAX + 1).
     */
    @PostMapping("/{id}/versions")
    public ResponseEntity<ProjectVersion> addVersion(
            @PathVariable Long id,
            @RequestBody ProjectVersionRequest req,
            Authentication auth) {
        if (!isAdmin(auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.addVersion(id, req, auth.getName()));
    }

    /**
     * PUT /api/kanban/projects/{id}/versions/{versionId}
     * Admin only — updates version label and release notes.
     */
    @PutMapping("/{id}/versions/{versionId}")
    public ResponseEntity<ProjectVersion> updateVersion(
            @PathVariable Long id,
            @PathVariable Long versionId,
            @RequestBody ProjectVersionRequest req,
            Authentication auth) {
        if (!isAdmin(auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return ResponseEntity.ok(projectService.updateVersion(id, versionId, req, auth.getName()));
    }

    /**
     * DELETE /api/kanban/projects/{id}/versions/{versionId}
     * Admin only — deletes version and cascades to its modules. Blocked if only 1 version exists.
     */
    @DeleteMapping("/{id}/versions/{versionId}")
    public ResponseEntity<Void> deleteVersion(
            @PathVariable Long id,
            @PathVariable Long versionId,
            Authentication auth) {
        if (!isAdmin(auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        projectService.deleteVersion(id, versionId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── Members ───────────────────────────────────────────────────────────────

    /**
     * GET /api/kanban/projects/{id}/members
     * Active members for a project — used to populate TeamAvatarGroup.
     */
    @GetMapping("/{id}/members")
    public List<ProjectMember> getMembers(@PathVariable Long id) {
        return projectService.getMembers(id);
    }

    /**
     * POST /api/kanban/projects/{id}/members
     * Admin only — adds a dev (by dev_name) to the project.
     * Upserts: reactivates soft-removed member if they previously existed.
     */
    @PostMapping("/{id}/members")
    public ResponseEntity<ProjectMember> addMember(
            @PathVariable Long id,
            @RequestBody ProjectMemberRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.addMember(id, req, auth.getName()));
    }

    /**
     * DELETE /api/kanban/projects/{id}/members/{devName}
     * Admin only — soft-removes a dev (is_active = false).
     * Historical module assignments are preserved.
     */
    @DeleteMapping("/{id}/members/{devName}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable String devName,
            Authentication auth) {
        projectService.removeMember(id, devName, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── Board ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/kanban/projects/{id}/board
     * GET /api/kanban/projects/{id}/board?versionId={versionId}
     *
     * Returns the full KanbanBoardResponse for the most recent version (or specified version).
     * Admin: all modules in all columns.
     * Dev: only modules they are assigned to (filtered by module_assignee).
     */
    @GetMapping("/{id}/board")
    public KanbanBoardResponse getBoard(
            @PathVariable Long id,
            @RequestParam(required = false) Long versionId,
            Authentication auth) {
        return projectService.getBoard(id, versionId, auth.getName(), isAdmin(auth));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
