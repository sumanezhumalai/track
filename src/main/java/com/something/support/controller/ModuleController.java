package com.something.support.controller;

import com.something.support.dto.*;
import com.something.support.entity.Module;
import com.something.support.entity.ModuleSubtask;
import com.something.support.enums.ModuleStatus;
import com.something.support.service.ModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kanban/modules")
@RequiredArgsConstructor
public class ModuleController {

    private final ModuleService moduleService;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * POST /api/kanban/modules?versionId={versionId}
     * Admin only — creates a new module in the given project version.
     * Card appended to the bottom of its column (position = MAX + 1).
     */
    @PostMapping
    public ResponseEntity<Module> create(
            @RequestParam Long versionId,
            @RequestBody ModuleRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(moduleService.createModule(versionId, req, auth.getName()));
    }

    // ── Update metadata ───────────────────────────────────────────────────────

    /**
     * PUT /api/kanban/modules/{id}
     * Admin only — updates title, description, priority, dueDate, assignees.
     * Does NOT change status or position (use /move or /reorder for that).
     */
    @PutMapping("/{id}")
    public ResponseEntity<Module> update(
            @PathVariable Long id,
            @RequestBody ModuleRequest req,
            Authentication auth) {
        return ResponseEntity.ok(moduleService.updateModule(id, req, auth.getName()));
    }

    // ── Move (cross-column drag or explicit status change) ────────────────────

    /**
     * PATCH /api/kanban/modules/{id}/move
     * Authenticated — moves a single card to a new status and/or position.
     *
     * Body: { "status": "testing", "position": 1 }
     *
     * Typically called together with POST /reorder to sync both
     * source and destination columns after a cross-column drag.
     */
    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> move(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        ModuleStatus status   = ModuleStatus.valueOf((String) body.get("status"));
        int          position = (int) body.get("position");
        moduleService.moveModule(id, status, position, auth.getName(), isAdmin(auth));
        return ResponseEntity.ok().build();
    }

    // ── Drag-and-drop batch reorder ───────────────────────────────────────────

    /**
     * POST /api/kanban/modules/reorder
     * Authenticated — persists the new card order after a drag-end event.
     *
     * Body: { "versionId": 1, "status": "start", "orderedModuleIds": [3, 1, 4] }
     *
     * Server assigns position 0→id[0], 1→id[1], 2→id[2]…
     * Positions are always gap-free after this call.
     *
     * For cross-column drags: call /move for the moved card FIRST,
     * then call /reorder for the source column, then /reorder for the destination column.
     */
    @PostMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody ModuleReorderRequest req,
            Authentication auth) {
        moduleService.reorderColumn(req, auth.getName());
        return ResponseEntity.ok().build();
    }

    // ── Assignees ─────────────────────────────────────────────────────────────

    /**
     * PUT /api/kanban/modules/{id}/assignees
     * Admin only — replaces the full assignee list.
     * Body: { "devNames": ["alice", "bob"] }
     * First dev in the list becomes the primary assignedTo (card face avatar).
     */
    @PutMapping("/{id}/assignees")
    public ResponseEntity<Void> setAssignees(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> body,
            Authentication auth) {
        moduleService.setAssignees(id, body.get("devNames"), auth.getName());
        return ResponseEntity.ok().build();
    }

    // ── Subtasks ──────────────────────────────────────────────────────────────

    /**
     * POST /api/kanban/modules/{id}/subtasks
     * Admin only — adds a new checklist item to a module.
     * Body: { "text": "Write unit tests" }
     */
    @PostMapping("/{id}/subtasks")
    public ResponseEntity<ModuleSubtask> addSubtask(
            @PathVariable Long id,
            @RequestBody SubtaskRequest req,
            Authentication auth) {
        if (!isAdmin(auth)) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(moduleService.addSubtask(id, req, auth.getName()));
    }

    /**
     * PATCH /api/kanban/modules/subtasks/{subtaskId}/toggle
     * Authenticated — flips the completed state of a subtask.
     * Accessible to Admins and assigned developers of the module.
     */
    @PatchMapping("/subtasks/{subtaskId}/toggle")
    public ResponseEntity<ModuleSubtask> toggleSubtask(
            @PathVariable Long subtaskId,
            Authentication auth) {
        return ResponseEntity.ok(moduleService.toggleSubtask(subtaskId, auth.getName(), isAdmin(auth)));
    }

    /**
     * DELETE /api/kanban/modules/subtasks/{subtaskId}
     * Admin only — removes a subtask from the checklist.
     */
    @DeleteMapping("/subtasks/{subtaskId}")
    public ResponseEntity<Void> deleteSubtask(
            @PathVariable Long subtaskId,
            Authentication auth) {
        if (!isAdmin(auth)) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
        moduleService.deleteSubtask(subtaskId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── Delete module ─────────────────────────────────────────────────────────

    /**
     * DELETE /api/kanban/modules/{id}
     * Admin only — hard deletes a module.
     * Cascade removes all module_assignee and module_subtask rows.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication auth) {
        moduleService.deleteModule(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
