package com.something.support.service;

import com.something.support.dto.UserRequest;
import com.something.support.entity.DevSupport;
import com.something.support.entity.GeneralSupport;
import com.something.support.repository.DevSupportRepository;
import com.something.support.repository.GeneralSupportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final DevSupportRepository devSupportRepository;
    private final GeneralSupportRepository generalSupportRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    // ── Spring Security ──────────────────────────────────────────────────────

    @Override
    public UserDetails loadUserByUsername(String devName) throws UsernameNotFoundException {
        DevSupport dev = devSupportRepository.findByDevName(devName)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + devName));
        String role = "ROLE_" + dev.getType().toUpperCase(); // ROLE_ADMIN or ROLE_DEV
        return new User(dev.getDevName(), dev.getPasswordHash(),
                List.of(new SimpleGrantedAuthority(role)));
    }

    // ── DevSupport CRUD ──────────────────────────────────────────────────────

    public List<DevSupport> getAllDevSupport() {
        return devSupportRepository.findAll();
    }

    @Transactional
    public DevSupport createDevSupport(UserRequest req, String createdBy) {
        DevSupport dev = DevSupport.builder()
                .devName(req.name())
                .role(req.role())
                .team(req.team())
                .type(req.type())
                .passwordHash(passwordEncoder.encode(req.password()))
                .passwordOnboard(false)   // admin-assigned temp password; member must change it
                .createdAt(LocalDateTime.now())
                .createdBy(createdBy)
                .build();
        DevSupport saved = devSupportRepository.save(dev);
        auditService.log("CREATE_DEV_USER", createdBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public DevSupport updateDevSupport(Long id, UserRequest req, String updatedBy) {
        DevSupport dev = devSupportRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("DevSupport not found: " + id));
        if (req.name()     != null) dev.setDevName(req.name());
        if (req.role()     != null) dev.setRole(req.role());
        if (req.team()     != null) dev.setTeam(req.team());
        if (req.type()     != null) dev.setType(req.type());
        if (req.password() != null) dev.setPasswordHash(passwordEncoder.encode(req.password()));
        DevSupport saved = devSupportRepository.save(dev);
        auditService.log("UPDATE_DEV_USER", updatedBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public void deleteDevSupport(Long id, String deletedBy) {
        devSupportRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("DevSupport not found: " + id));
        devSupportRepository.deleteById(id);
        auditService.log("DELETE_DEV_USER", deletedBy, "SUCCESS");
    }

    /**
     * First-login onboarding: member sets their own password.
     * Sets passwordOnboard = true so they won't be redirected again.
     */
    @Transactional
    public void changePassword(String devName, String newPassword) {
        DevSupport dev = devSupportRepository.findByDevName(devName)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + devName));
        dev.setPasswordHash(passwordEncoder.encode(newPassword));
        dev.setPasswordOnboard(true);
        devSupportRepository.save(dev);
        auditService.log("PASSWORD_CHANGED", devName, "SUCCESS");
    }

    // ── GeneralSupport CRUD ──────────────────────────────────────────────────

    public List<GeneralSupport> getAllGeneralSupport() {
        return generalSupportRepository.findAll();
    }

    @Transactional
    public GeneralSupport createGeneralSupport(UserRequest req, String createdBy) {
        GeneralSupport ae = GeneralSupport.builder()
                .aeName(req.name())
                .role(req.role())
                .team(req.team())
                .createdAt(LocalDateTime.now())
                .createdBy(createdBy)
                .build();
        GeneralSupport saved = generalSupportRepository.save(ae);
        auditService.log("CREATE_AE_USER", createdBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public GeneralSupport updateGeneralSupport(Long id, UserRequest req, String updatedBy) {
        GeneralSupport ae = generalSupportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("GeneralSupport not found: " + id));
        if (req.name() != null) ae.setAeName(req.name());
        if (req.role() != null) ae.setRole(req.role());
        if (req.team() != null) ae.setTeam(req.team());
        GeneralSupport saved = generalSupportRepository.save(ae);
        auditService.log("UPDATE_AE_USER", updatedBy, "SUCCESS");
        return saved;
    }

    @Transactional
    public void deleteGeneralSupport(Long id, String deletedBy) {
        generalSupportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("GeneralSupport not found: " + id));
        generalSupportRepository.deleteById(id);
        auditService.log("DELETE_AE_USER", deletedBy, "SUCCESS");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public DevSupport getDevByName(String devName) {
        return devSupportRepository.findByDevName(devName)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + devName));
    }
}
