package com.something.support.repository;

import com.something.support.entity.ModuleSubtask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuleSubtaskRepository extends JpaRepository<ModuleSubtask, Long> {

    /** Subtasks ordered by displayOrder — mirrors @OrderBy on Module.subtasks */
    List<ModuleSubtask> findAllByModule_ModuleIdOrderByDisplayOrderAsc(Long moduleId);

    /**
     * Next display_order value for appending a new subtask to the checklist.
     * Returns null if the module has no subtasks yet (defaults to 0 in service).
     */
    @Query("SELECT MAX(s.displayOrder) FROM ModuleSubtask s WHERE s.module.moduleId = :moduleId")
    Optional<Integer> findMaxDisplayOrderByModuleId(@Param("moduleId") Long moduleId);
}
