package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "\"devSupport\"", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevSupport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dev_id")
    private Long devId;

    @Column(name = "dev_name", nullable = false, unique = true, length = 100)
    private String devName;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(length = 100)
    private String team;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    /** "admin" | "dev" */
    @Column(nullable = false, length = 10)
    private String type;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /**
     * false  = admin-assigned temp password not yet changed by the member (triggers onboarding flow)
     * true   = member has set their own password; no onboarding redirect
     */
    @Column(name = "password_onboard", nullable = false)
    private boolean passwordOnboard;
}
