package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "module_subtask", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuleSubtask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subtask_id")
    private Long subtaskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Module module;

    @com.fasterxml.jackson.annotation.JsonProperty("moduleId")
    public Long getModuleId() {
        return module != null ? module.getModuleId() : null;
    }

    /** Checklist item text label shown next to the checkbox */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    /** Checkbox state — toggled individually by assignee */
    @Column(nullable = false)
    private boolean completed;

    /**
     * Integer position in the checklist for consistent rendering order.
     * Used by @OrderBy("displayOrder ASC") on Module.subtasks.
     */
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
