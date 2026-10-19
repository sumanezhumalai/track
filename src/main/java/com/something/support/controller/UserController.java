package com.something.support.controller;

import com.something.support.dto.UserRequest;
import com.something.support.entity.DevSupport;
import com.something.support.entity.GeneralSupport;
import com.something.support.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ── Dev Support ───────────────────────────────────────────

    @GetMapping("/dev")
    public List<DevSupport> getAllDev() {
        return userService.getAllDevSupport();
    }

    @PostMapping("/dev")
    public ResponseEntity<DevSupport> createDev(
            @RequestBody UserRequest req, Authentication auth) {
        return ResponseEntity.ok(userService.createDevSupport(req, auth.getName()));
    }

    @PutMapping("/dev/{id}")
    public ResponseEntity<DevSupport> updateDev(
            @PathVariable Long id, @RequestBody UserRequest req, Authentication auth) {
        return ResponseEntity.ok(userService.updateDevSupport(id, req, auth.getName()));
    }

    @DeleteMapping("/dev/{id}")
    public ResponseEntity<Void> deleteDev(@PathVariable Long id, Authentication auth) {
        userService.deleteDevSupport(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── General Support (AE) ──────────────────────────────────

    @GetMapping("/ae")
    public List<GeneralSupport> getAllAe() {
        return userService.getAllGeneralSupport();
    }

    @PostMapping("/ae")
    public ResponseEntity<GeneralSupport> createAe(
            @RequestBody UserRequest req, Authentication auth) {
        return ResponseEntity.ok(userService.createGeneralSupport(req, auth.getName()));
    }

    @PutMapping("/ae/{id}")
    public ResponseEntity<GeneralSupport> updateAe(
            @PathVariable Long id, @RequestBody UserRequest req, Authentication auth) {
        return ResponseEntity.ok(userService.updateGeneralSupport(id, req, auth.getName()));
    }

    @DeleteMapping("/ae/{id}")
    public ResponseEntity<Void> deleteAe(@PathVariable Long id, Authentication auth) {
        userService.deleteGeneralSupport(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
