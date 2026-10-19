package com.something.support.controller;

import com.something.support.dto.ChangePasswordRequest;
import com.something.support.dto.LoginRequest;
import com.something.support.entity.DevSupport;
import com.something.support.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;

    /**
     * POST /api/auth/login
     * Authenticates the user and returns { name, role, passwordOnboard }.
     * passwordOnboard=false triggers the first-login password-change flow on the frontend.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest httpReq) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.name(), req.password()));

        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);

        HttpSession session = httpReq.getSession(true);
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, ctx);

        DevSupport dev = userService.getDevByName(req.name());
        String role = dev.getType(); // "admin" | "dev"

        return ResponseEntity.ok(Map.of(
                "name", dev.getDevName(),
                "role", role,
                "passwordOnboard", dev.isPasswordOnboard()
        ));
    }

    /**
     * POST /api/auth/logout — invalidates the HTTP session.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpReq) {
        HttpSession session = httpReq.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    /**
     * GET /api/auth/me — returns current user info or 401 if not authenticated.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        String devName = auth.getName();
        DevSupport dev = userService.getDevByName(devName);
        return ResponseEntity.ok(Map.of(
                "name", dev.getDevName(),
                "role", dev.getType(),
                "passwordOnboard", dev.isPasswordOnboard()
        ));
    }

    /**
     * PATCH /api/auth/change-password
     * First-login onboarding: member sets their own password.
     * After success, passwordOnboard is true and future logins go straight to the dashboard.
     */
    @PatchMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String devName = auth.getName();
        userService.changePassword(devName, req.newPassword());
        return ResponseEntity.ok(Map.of("passwordOnboard", true));
    }
}
