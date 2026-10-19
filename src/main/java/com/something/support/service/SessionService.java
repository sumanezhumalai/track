package com.something.support.service;

import com.something.support.dto.SessionRequest;
import com.something.support.entity.TeamSession;
import com.something.support.repository.TeamSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final TeamSessionRepository teamSessionRepository;
    private final AuditService auditService;

    public List<TeamSession> getAll() {
        return teamSessionRepository.findAll();
    }

    public List<TeamSession> getSessionsForDev(String devName) {
        if (devName == null || devName.isBlank()) {
            return List.of();
        }
        return teamSessionRepository.findByDevNameIgnoreCase(devName);
    }

    public List<TeamSession> getSessionsInRange(LocalDateTime from, LocalDateTime to) {
        if (from == null) from = LocalDateTime.now().minusMonths(1);
        if (to   == null) to   = LocalDateTime.now();
        return teamSessionRepository.findByStartTimeBetween(from, to);
    }

    @Transactional
    public TeamSession createSession(SessionRequest req, String actor) {
        return createSession(req, actor, true);
    }

    @Transactional
    public TeamSession createSession(SessionRequest req, String actor, boolean isAdmin) {
        if (!isAdmin && (req.devName() == null || !req.devName().equalsIgnoreCase(actor))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Developers can only start a session for themselves"
            );
        }
        TeamSession session = TeamSession.builder()
                .devName(isAdmin ? req.devName() : actor)
                .aeName(req.aeName())
                .sessionDescription(req.sessionDescription())
                .startTime(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        TeamSession saved = teamSessionRepository.save(session);
        auditService.log("CREATE_SESSION", actor, "SUCCESS");
        return saved;
    }

    @Transactional
    public TeamSession updateSession(Long id, SessionRequest req, String actor) {
        return updateSession(id, req, actor, true);
    }

    @Transactional
    public TeamSession updateSession(Long id, SessionRequest req, String actor, boolean isAdmin) {
        TeamSession session = teamSessionRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Session not found: " + id));
        if (!isAdmin && (session.getDevName() == null || !session.getDevName().equalsIgnoreCase(actor))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Developers can only update their own sessions"
            );
        }
        if (isAdmin && req.devName() != null) session.setDevName(req.devName());
        if (req.aeName()             != null) session.setAeName(req.aeName());
        if (req.sessionDescription() != null) session.setSessionDescription(req.sessionDescription());
        TeamSession saved = teamSessionRepository.save(session);
        auditService.log("UPDATE_SESSION", actor, "SUCCESS");
        return saved;
    }

    @Transactional
    public TeamSession endSession(Long id, String description, String actor) {
        return endSession(id, description, actor, true);
    }

    @Transactional
    public TeamSession endSession(Long id, String description, String actor, boolean isAdmin) {
        TeamSession session = teamSessionRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Session not found: " + id));
        if (!isAdmin && (session.getDevName() == null || !session.getDevName().equalsIgnoreCase(actor))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Developers can only end their own sessions"
            );
        }
        session.setEndTime(LocalDateTime.now());
        if (description != null) session.setSessionDescription(description);
        TeamSession saved = teamSessionRepository.save(session);
        auditService.log("END_SESSION", actor, "SUCCESS");
        return saved;
    }

    @Transactional
    public void deleteSession(Long id, String actor) {
        deleteSession(id, actor, true);
    }

    @Transactional
    public void deleteSession(Long id, String actor, boolean isAdmin) {
        TeamSession session = teamSessionRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Session not found: " + id));
        if (!isAdmin && (session.getDevName() == null || !session.getDevName().equalsIgnoreCase(actor))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Developers can only delete their own sessions"
            );
        }
        teamSessionRepository.deleteById(id);
        auditService.log("DELETE_SESSION", actor, "SUCCESS");
    }
}
