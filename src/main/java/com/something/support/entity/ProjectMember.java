package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_member", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Project project;

    @com.fasterxml.jackson.annotation.JsonProperty("projectId")
    public Long getProjectId() {
        return project != null ? project.getProjectId() : null;
    }

    /**
     * dev_name from devSupport — intentionally a loose VARCHAR ref, not a FK.
     * Resilient: if a devSupport user is deleted, project history is preserved.
     */
    @Column(name = "dev_name", nullable = false, length = 100)
    private String devName;

    /** dev_name of admin who added this member */
    @Column(name = "added_by", length = 100)
    private String addedBy;

    @Column(name = "added_at")
    private LocalDateTime addedAt;

    /**
     * false = admin soft-removed this dev from the project.
     * Historical modules they were assigned to remain intact.
     */
    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
