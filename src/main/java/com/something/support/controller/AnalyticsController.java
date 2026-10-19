package com.something.support.controller;

import com.something.support.entity.TeamSession;
import com.something.support.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final SessionService sessionService;

    /**
     * GET /api/analytics/sessions?from=2026-10-01T00:00:00&to=2026-10-31T23:59:59
     * Defaults to last 30 days if params omitted.
     */
    @GetMapping("/sessions")
    public List<TeamSession> getSessions(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return sessionService.getSessionsInRange(from, to);
    }
}
