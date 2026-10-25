package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "project_name", nullable = false, unique = true, length = 150)
    private String projectName;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** dev_name of admin who created — loose coupling, not a FK */
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** false = soft-deleted; history is retained */
    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
