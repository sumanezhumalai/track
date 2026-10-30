package com.something.support.controller;

import com.something.support.dto.DashboardStatsResponse;
import com.something.support.service.ModuleAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/kanban/dashboard")
@RequiredArgsConstructor
public class KanbanDashboardController {

    private final ModuleAnalyticsService moduleAnalyticsService;

    /**
     * GET /api/kanban/dashboard/stats
     * Accessible to all authenticated users.
     * Admin: global counts & system health.
     * Dev: personal queue, WIP, and upcoming deadlines.
     */
    @GetMapping("/stats")
    public DashboardStatsResponse getStats(Authentication auth) {
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        String devName = auth != null ? auth.getName() : "anonymous";
        return moduleAnalyticsService.getDashboardStats(devName, isAdmin);
    }
}
