package com.something.support.service;

import com.something.support.entity.Audit;
import com.something.support.repository.AuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditRepository auditRepository;

    public void log(String action, String username, String status) {
        auditRepository.save(Audit.builder()
                .timestamp(LocalDateTime.now())
                .action(action)
                .username(username)
                .status(status)
                .build());
    }
}
