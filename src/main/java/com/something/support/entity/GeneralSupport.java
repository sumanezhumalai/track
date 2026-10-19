package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "\"generalSupport\"", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneralSupport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ae_id")
    private Long aeId;

    @Column(name = "ae_name", nullable = false, length = 100)
    private String aeName;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(length = 100)
    private String team;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
