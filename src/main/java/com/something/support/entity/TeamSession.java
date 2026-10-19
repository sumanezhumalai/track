package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_sessions", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "dev_name", length = 100)
    private String devName;

    @Column(name = "ae_name", length = 100)
    private String aeName;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "session_description", columnDefinition = "TEXT")
    private String sessionDescription;
}
