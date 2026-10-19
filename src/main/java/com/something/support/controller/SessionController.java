package com.something.support.controller;

import com.something.support.dto.SessionRequest;
import com.something.support.entity.TeamSession;
import com.something.support.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping
    public List<TeamSession> getAll(Authentication auth) {
        if (isAdmin(auth)) {
            return sessionService.getAll();
        }
        return sessionService.getSessionsForDev(auth != null ? auth.getName() : null);
    }

    private boolean isAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @PostMapping
    public ResponseEntity<TeamSession> create(
            @RequestBody SessionRequest req, Authentication auth) {
        return ResponseEntity.ok(sessionService.createSession(req, auth.getName(), isAdmin(auth)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamSession> update(
            @PathVariable Long id, @RequestBody SessionRequest req, Authentication auth) {
        return ResponseEntity.ok(sessionService.updateSession(id, req, auth.getName(), isAdmin(auth)));
    }

    @PutMapping("/{id}/end")
    public ResponseEntity<TeamSession> end(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String description = body != null ? body.get("sessionDescription") : null;
        return ResponseEntity.ok(sessionService.endSession(id, description, auth.getName(), isAdmin(auth)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        sessionService.deleteSession(id, auth.getName(), isAdmin(auth));
        return ResponseEntity.noContent().build();
    }
}
