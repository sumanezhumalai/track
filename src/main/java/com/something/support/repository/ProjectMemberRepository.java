package com.something.support.repository;

import com.something.support.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    /** Active members for a project — used to populate the TeamAvatarGroup in the UI */
    List<ProjectMember> findAllByProject_ProjectIdAndIsActiveTrue(Long projectId);

    /** Membership lookup — used before add/remove to check existing record */
    Optional<ProjectMember> findByProject_ProjectIdAndDevName(Long projectId, String devName);

    /** Access guard — checks if a dev is an active member of a project */
    boolean existsByProject_ProjectIdAndDevNameAndIsActiveTrue(Long projectId, String devName);

    /** Count active projects where dev is an active member */
    long countByDevNameAndIsActiveTrue(String devName);
}
