package com.something.support.repository;

import com.something.support.entity.Module;
import com.something.support.enums.ModuleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {

    /**
     * Full board load: all modules for a version, sorted by status then position.
     * Backed by idx_module_board_order (version_id, status, position ASC).
     * Admin view — returns everything.
     */
    List<Module> findAllByVersion_VersionIdOrderByStatusAscPositionAsc(Long versionId);

    /**
     * Dev view — only modules where the dev is the primary assignee.
     * Multi-assignee filter (module_assignee table) is handled at service level.
     */
    List<Module> findAllByVersion_VersionIdAndAssignedToOrderByStatusAscPositionAsc(
            Long versionId, String devName);

    /**
     * Dev view — all modules where the dev is an assignee (either primary assignedTo or in module_assignee).
     */
    @Query("SELECT m FROM Module m WHERE m.version.versionId = :versionId AND (" +
           "m.assignedTo = :devName OR " +
           "EXISTS (SELECT 1 FROM ModuleAssignee ma WHERE ma.module = m AND ma.devName = :devName)" +
           ") ORDER BY m.status ASC, m.position ASC")
    List<Module> findAllAssignedToDevInVersion(
            @Param("versionId") Long versionId,
            @Param("devName") String devName);

    /**
     * Highest position in a column — used to append new cards at the bottom.
     * Returns null if the column is empty (no modules in that status yet).
     */
    @Query("SELECT MAX(m.position) FROM Module m WHERE m.version.versionId = :versionId AND m.status = :status")
    Optional<Integer> findMaxPositionInColumn(@Param("versionId") Long versionId,
                                              @Param("status") ModuleStatus status);

    /**
     * Batch position reset for drag-and-drop reorder.
     * Called in a loop within a single @Transactional method in ModuleService.
     * Resets position to gap-free 0,1,2... after every reorder.
     */
    @Modifying
    @Query("UPDATE Module m SET m.position = :position, m.updatedAt = :now WHERE m.moduleId = :moduleId")
    void updatePosition(@Param("moduleId") Long moduleId,
                        @Param("position") int position,
                        @Param("now") LocalDateTime now);

    /**
     * Cross-column move: update both status and position in one query.
     * Called when a card is dragged to a different column.
     */
    @Modifying
    @Query("UPDATE Module m SET m.status = :status, m.position = :position, m.updatedAt = :now WHERE m.moduleId = :moduleId")
    void updateStatusAndPosition(@Param("moduleId") Long moduleId,
                                 @Param("status") ModuleStatus status,
                                 @Param("position") int position,
                                 @Param("now") LocalDateTime now);

    // ── Analytics & Dashboard Queries ──────────────────────────────────────────

    long countByStatus(ModuleStatus status);

    long countByPriority(String priority);

    @Query("SELECT COUNT(m) FROM Module m WHERE m.dueDate IS NOT NULL AND m.dueDate < :today AND m.status != :completedStatus")
    long countOverdue(@Param("today") java.time.LocalDate today, @Param("completedStatus") ModuleStatus completedStatus);

    default long countOverdue(java.time.LocalDate today) {
        return countOverdue(today, ModuleStatus.production);
    }

    @Query("SELECT COUNT(m) FROM Module m WHERE m.dueDate IS NOT NULL AND m.dueDate < :today AND m.status != :completedStatus AND (" +
           "m.assignedTo = :devName OR EXISTS (SELECT 1 FROM ModuleAssignee ma WHERE ma.module = m AND ma.devName = :devName))")
    long countOverdueForDev(@Param("devName") String devName, @Param("today") java.time.LocalDate today, @Param("completedStatus") ModuleStatus completedStatus);

    default long countOverdueForDev(String devName, java.time.LocalDate today) {
        return countOverdueForDev(devName, today, ModuleStatus.production);
    }

    @Query("SELECT m FROM Module m WHERE m.assignedTo = :devName OR EXISTS (SELECT 1 FROM ModuleAssignee ma WHERE ma.module = m AND ma.devName = :devName) ORDER BY m.updatedAt DESC")
    List<Module> findAllAssignedToDev(@Param("devName") String devName);

    @Query("SELECT m FROM Module m WHERE m.dueDate IS NOT NULL AND m.dueDate >= :today AND m.status != :completedStatus AND (" +
           "m.assignedTo = :devName OR EXISTS (SELECT 1 FROM ModuleAssignee ma WHERE ma.module = m AND ma.devName = :devName)) ORDER BY m.dueDate ASC")
    List<Module> findUpcomingDeadlinesForDev(@Param("devName") String devName, @Param("today") java.time.LocalDate today, @Param("completedStatus") ModuleStatus completedStatus, org.springframework.data.domain.Pageable pageable);

    default List<Module> findUpcomingDeadlinesForDev(String devName, java.time.LocalDate today, org.springframework.data.domain.Pageable pageable) {
        return findUpcomingDeadlinesForDev(devName, today, ModuleStatus.production, pageable);
    }

    @Query("SELECT m FROM Module m ORDER BY m.updatedAt DESC")
    List<Module> findRecentUpdated(org.springframework.data.domain.Pageable pageable);
}
