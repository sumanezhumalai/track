package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_version", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "version_id")
    private Long versionId;

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

    /** Incremental integer: 1, 2, 3… unique per project */
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    /** Optional display label e.g. "v1.0.0". If null, frontend uses "v{versionNumber}" */
    @Column(length = 50)
    private String label;

    @Column(name = "release_notes", columnDefinition = "TEXT")
    private String releaseNotes;

    /** dev_name of admin who created this version */
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
