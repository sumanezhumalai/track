package com.something.support.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "\"Audits\"", schema = "EGS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime timestamp;

    @Column(length = 255)
    private String action;

    @Column(length = 100)
    private String username;

    @Column(length = 50)
    private String status;
}
