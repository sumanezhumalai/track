package com.something.support.repository;

import com.something.support.entity.ModuleAssignee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuleAssigneeRepository extends JpaRepository<ModuleAssignee, Long> {

    List<ModuleAssignee> findAllByModule_ModuleId(Long moduleId);

    Optional<ModuleAssignee> findByModule_ModuleIdAndDevName(Long moduleId, String devName);

    void deleteAllByModule_ModuleId(Long moduleId);

    /**
     * Dev access check: verifies a dev is assigned to at least one module in a version.
     * Used alongside project_member check for full access guard.
     */
    boolean existsByModule_Version_VersionIdAndDevName(Long versionId, String devName);
}
