package com.something.support.service;

import com.something.support.dto.*;
import com.something.support.entity.Module;
import com.something.support.entity.ModuleAssignee;
import com.something.support.entity.ModuleSubtask;
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

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository         moduleRepo;
    private final ModuleAssigneeRepository assigneeRepo;
    private final ModuleSubtaskRepository  subtaskRepo;
    private final ProjectVersionRepository versionRepo;
    private final AuditService             auditService;

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public Module createModule(Long versionId, ModuleRequest req, String createdBy) {
        ProjectVersion version = versionRepo.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Version not found: " + versionId));

        ModuleStatus status = req.status() != null ? req.status() : ModuleStatus.start;

        // Append to bottom of the target column: position = MAX + 1, or 0 if empty
        int position = moduleRepo.findMaxPositionInColumn(versionId, status)
                .map(max -> max + 1)
                .orElse(0);

        Module module = moduleRepo.save(Module.builder()
                .version(version)
                .title(req.title())
                .description(req.description())
                .status(status)
                .position(position)
                .priority(req.priority() != null ? req.priority() : "medium")
                .assignedTo(req.assignedTo())
                .dueDate(req.dueDate())
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // Sync multi-assignee list
        if (req.assigneeDevNames() != null && !req.assigneeDevNames().isEmpty()) {
            syncAssignees(module, req.assigneeDevNames(), createdBy);
            module.setAssigneeDevNames(req.assigneeDevNames());
        }

        // Persist initial checklist subtasks if provided
        if (req.subtaskTexts() != null && !req.subtaskTexts().isEmpty()) {
            java.util.List<ModuleSubtask> initialSubtasks = new java.util.ArrayList<>();
            for (int i = 0; i < req.subtaskTexts().size(); i++) {
                String text = req.subtaskTexts().get(i);
                if (text != null && !text.isBlank()) {
                    initialSubtasks.add(ModuleSubtask.builder()
                            .module(module)
                            .text(text.trim())
                            .completed(false)
                            .displayOrder(i)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build());
                }
            }
            if (!initialSubtasks.isEmpty()) {
                java.util.List<ModuleSubtask> savedSubtasks = subtaskRepo.saveAll(initialSubtasks);
                module.getSubtasks().addAll(savedSubtasks);
                module.setSubtaskDtos(savedSubtasks.stream()
                        .map(s -> new KanbanBoardResponse.SubtaskInfo(
                                s.getSubtaskId(), s.getText(), s.isCompleted(), s.getDisplayOrder()))
                        .toList());
            } else {
                module.setSubtaskDtos(java.util.List.of());
            }
        } else {
            module.setSubtaskDtos(java.util.List.of());
        }

        auditService.log(
                "MODULE_CREATED: #" + module.getModuleId() + " in version " + versionId,
                createdBy, "SUCCESS");
        return module;
    }

    // ── Update metadata ───────────────────────────────────────────────────────

    @Transactional
    public Module updateModule(Long moduleId, ModuleRequest req, String updatedBy) {
        Module module = getModuleOrThrow(moduleId);

        if (req.title()       != null) module.setTitle(req.title());
        if (req.description() != null) module.setDescription(req.description());
        if (req.priority()    != null) module.setPriority(req.priority());
        if (req.dueDate()     != null) module.setDueDate(req.dueDate());
        if (req.assignedTo()  != null) module.setAssignedTo(req.assignedTo());
        module.setUpdatedAt(LocalDateTime.now());

        if (req.assigneeDevNames() != null) {
            syncAssignees(module, req.assigneeDevNames(), updatedBy);
            module.setAssigneeDevNames(req.assigneeDevNames());
        }

        Module saved = moduleRepo.save(module);
        saved.setAssigneeDevNames(req.assigneeDevNames() != null ? req.assigneeDevNames() : module.getAssigneeDevNames());
        List<ModuleSubtask> existingSubtasks = subtaskRepo.findAllByModule_ModuleIdOrderByDisplayOrderAsc(moduleId);
        saved.setSubtaskDtos(existingSubtasks.stream()
                .map(s -> new KanbanBoardResponse.SubtaskInfo(
                        s.getSubtaskId(), s.getText(), s.isCompleted(), s.getDisplayOrder()))
                .toList());
        auditService.log("MODULE_UPDATED: #" + moduleId, updatedBy, "SUCCESS");
        return saved;
    }

    // ── Drag-and-drop: move single card ───────────────────────────────────────

    /**
     * Moves a card to a new column (status) and/or position.
     * Overload for internal callers / tests defaulting to admin privileges.
     */
    @Transactional
    public void moveModule(Long moduleId, ModuleStatus newStatus, int newPosition, String movedBy) {
        moveModule(moduleId, newStatus, newPosition, movedBy, true);
    }

    /**
     * Moves a card to a new column (status) and/or position with caller ownership check.
     * Admin can move any module; developers can only move modules assigned to them.
     */
    @Transactional
    public void moveModule(Long moduleId, ModuleStatus newStatus, int newPosition, String movedBy, boolean isAdmin) {
        Module module = getModuleOrThrow(moduleId);

        if (!isAdmin && !isAssignedDev(module, movedBy)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to move this module");
        }

        String previousState = module.getStatus().name() + "[" + module.getPosition() + "]";

        moduleRepo.updateStatusAndPosition(moduleId, newStatus, newPosition, LocalDateTime.now());

        auditService.log(
                "MODULE_MOVED: #" + moduleId + " " + previousState
                        + " -> " + newStatus.name() + "[" + newPosition + "]",
                movedBy, "SUCCESS");
    }

    // ── Drag-and-drop: batch reorder a column ─────────────────────────────────

    /**
     * Resets all positions in a column from the ordered ID list.
     * Positions are always gap-free: index 0 → position 0, index 1 → position 1…
     * Called after every drag-end to persist the new visual order to DB.
     *
     * Frontend sends:
     *   { versionId, status, orderedModuleIds: [id1, id2, id3] }
     * This method assigns position=0 to id1, position=1 to id2, etc.
     */
    @Transactional
    public void reorderColumn(ModuleReorderRequest req, String reorderedBy) {
        LocalDateTime now = LocalDateTime.now();
        List<Long> ids = req.orderedModuleIds();
        if (ids != null) {
            for (int i = 0; i < ids.size(); i++) {
                moduleRepo.updateStatusAndPosition(ids.get(i), req.status(), i, now);
            }
        }
        auditService.log(
                "MODULE_REORDERED: column=" + req.status().name() + " version=" + req.versionId(),
                reorderedBy, "SUCCESS");
    }

    // ── Assignees ─────────────────────────────────────────────────────────────

    /**
     * Replaces the full assignee list for a module.
     * Deletes all existing assignees then inserts the new list.
     */
    @Transactional
    public void setAssignees(Long moduleId, List<String> devNames, String assignedBy) {
        Module module = getModuleOrThrow(moduleId);
        syncAssignees(module, devNames, assignedBy);
        module.setUpdatedAt(LocalDateTime.now());
        moduleRepo.save(module);
        auditService.log("MODULE_ASSIGNED: #" + moduleId + " → " + devNames, assignedBy, "SUCCESS");
    }

    // ── Subtasks ──────────────────────────────────────────────────────────────

    @Transactional
    public ModuleSubtask addSubtask(Long moduleId, SubtaskRequest req, String addedBy) {
        Module module = getModuleOrThrow(moduleId);

        int nextOrder = subtaskRepo.findMaxDisplayOrderByModuleId(moduleId)
                .map(max -> max + 1)
                .orElse(0);

        ModuleSubtask subtask = subtaskRepo.save(ModuleSubtask.builder()
                .module(module)
                .text(req.text())
                .completed(false)
                .displayOrder(nextOrder)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // Touch parent updatedAt — free "last activity" timestamp
        module.setUpdatedAt(LocalDateTime.now());
        moduleRepo.save(module);

        return subtask;
    }

    @Transactional
    public ModuleSubtask toggleSubtask(Long subtaskId, String toggledBy) {
        return toggleSubtask(subtaskId, toggledBy, true);
    }

    @Transactional
    public ModuleSubtask toggleSubtask(Long subtaskId, String toggledBy, boolean isAdmin) {
        ModuleSubtask subtask = subtaskRepo.findById(subtaskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Subtask not found: " + subtaskId));

        Module module = subtask.getModule();
        if (!isAdmin && !isAssignedDev(module, toggledBy)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to update this subtask");
        }

        subtask.setCompleted(!subtask.isCompleted());
        subtask.setUpdatedAt(LocalDateTime.now());
        ModuleSubtask saved = subtaskRepo.save(subtask);

        // Touch parent module updatedAt
        module.setUpdatedAt(LocalDateTime.now());
        moduleRepo.save(module);

        auditService.log(
                "SUBTASK_TOGGLED: #" + subtaskId + " on module #" + module.getModuleId()
                        + " → " + (saved.isCompleted() ? "completed" : "pending"),
                toggledBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public void deleteSubtask(Long subtaskId, String deletedBy) {
        ModuleSubtask subtask = subtaskRepo.findById(subtaskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Subtask not found: " + subtaskId));
        subtaskRepo.delete(subtask);
    }

    // ── Delete module ─────────────────────────────────────────────────────────

    @Transactional
    public void deleteModule(Long moduleId, String deletedBy) {
        Module module = getModuleOrThrow(moduleId);
        // Cascade DELETE removes module_assignee and module_subtask rows automatically
        moduleRepo.delete(module);
        auditService.log("MODULE_DELETED: #" + moduleId, deletedBy, "SUCCESS");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Module getModuleOrThrow(Long moduleId) {
        return moduleRepo.findById(moduleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Module not found: " + moduleId));
    }

    /**
     * Full replace of module_assignee rows.
     * Clears existing, inserts new list in one transaction block.
     * Sets module.assignedTo to the first dev in the list (card face avatar).
     */
    private void syncAssignees(Module module, List<String> devNames, String assignedBy) {
        assigneeRepo.deleteAllByModule_ModuleId(module.getModuleId());
        assigneeRepo.flush();
        if (devNames != null && !devNames.isEmpty()) {
            List<ModuleAssignee> newAssignees = devNames.stream()
                    .map(name -> ModuleAssignee.builder()
                            .module(module)
                            .devName(name)
                            .assignedAt(LocalDateTime.now())
                            .assignedBy(assignedBy)
                            .build())
                    .toList();
            assigneeRepo.saveAll(newAssignees);
        }

        // Keep primary assignedTo in sync with first assignee in list
        module.setAssignedTo(devNames == null || devNames.isEmpty() ? null : devNames.get(0));
    }

    private boolean isAssignedDev(Module module, String devName) {
        if (devName == null || devName.isBlank()) return false;
        if (devName.equals(module.getAssignedTo())) return true;
        return assigneeRepo.existsByModule_ModuleIdAndDevName(module.getModuleId(), devName);
    }
}
