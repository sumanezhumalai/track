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
}
