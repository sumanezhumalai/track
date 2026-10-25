package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "module_assignee", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuleAssignee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    /**
     * dev_name from devSupport — loose VARCHAR ref, not a FK.
     * Resilient to devSupport user deletion.
     */
    @Column(name = "dev_name", nullable = false, length = 100)
    private String devName;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    /** dev_name of admin who made the assignment */
    @Column(name = "assigned_by", length = 100)
    private String assignedBy;
}
