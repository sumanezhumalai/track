package com.something.support.repository;

import com.something.support.entity.ProjectVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectVersionRepository extends JpaRepository<ProjectVersion, Long> {

    /** All versions for a project, newest first — used for the version switcher dropdown */
    List<ProjectVersion> findAllByProject_ProjectIdOrderByVersionNumberDesc(Long projectId);

    /** Most recent version — used when opening a project card from the sidebar */
    Optional<ProjectVersion> findTopByProject_ProjectIdOrderByVersionNumberDesc(Long projectId);

    /** Look up a specific version — used when user switches version in the breadcrumb */
    Optional<ProjectVersion> findByProject_ProjectIdAndVersionNumber(Long projectId, int versionNumber);
}
