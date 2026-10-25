package com.something.support.entity;

import com.something.support.enums.ModuleStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "module", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Module {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "module_id")
    private Long moduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private ProjectVersion version;

    @com.fasterxml.jackson.annotation.JsonProperty("versionId")
    public Long getVersionId() {
        return version != null ? version.getVersionId() : null;
    }

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Maps to the Postgres ENUM "EGS".module_status.
     * columnDefinition is required so Hibernate knows the exact qualified type name.
     * EnumType.STRING ensures the literal value ('start','testing','production') is sent,
     * which Postgres automatically casts to the ENUM type.
     */
    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcType(org.hibernate.dialect.type.PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"EGS\".module_status", nullable = false)
    private ModuleStatus status;

    /**
     * Exact vertical row position within the column (0-indexed).
     * Enables drag-and-drop order persistence.
     * Always gap-free: 0, 1, 2... Reset on every reorder operation.
     */
    @Column(nullable = false)
    private Integer position;

    /** 'low' | 'medium' | 'high' */
    @Column(nullable = false, length = 10)
    private String priority;

    /**
     * Primary display assignee dev_name shown on the Kanban card face.
     * Nullable = unassigned. For multi-assignee list see moduleAssignees.
     */
    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "due_date")
    private LocalDate dueDate;

    /** dev_name of admin who created this module */
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Updated on every edit: status change, position change, priority, etc. */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Full multi-assignee list shown in the detail sheet */
    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ModuleAssignee> moduleAssignees = new ArrayList<>();

    /** Checklist sub-items — ordered by displayOrder ASC */
    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<ModuleSubtask> subtasks = new ArrayList<>();
}
