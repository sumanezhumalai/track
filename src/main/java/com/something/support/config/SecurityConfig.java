package com.something.support.config;

import com.something.support.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/ae").authenticated()
                .requestMatchers("/api/users/**", "/api/analytics/**").hasRole("ADMIN")

                // ── Kanban: read (all authenticated users) ───────────────────
                .requestMatchers(HttpMethod.GET,   "/api/kanban/**").authenticated()

                // ── Kanban: project admin actions ────────────────────────────
                .requestMatchers(HttpMethod.POST,   "/api/kanban/projects").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/kanban/projects/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/kanban/projects/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/kanban/projects/*/versions").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/kanban/projects/*/versions/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/kanban/projects/*/versions/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/kanban/projects/*/members").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/kanban/projects/*/members/**").hasRole("ADMIN")

                // ── Kanban: module admin actions ──────────────────────────────
                .requestMatchers(HttpMethod.POST,   "/api/kanban/modules").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/kanban/modules/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/kanban/modules/*/assignees").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/kanban/modules/*").hasRole("ADMIN")

                // ── Kanban: dev actions (move, reorder, subtasks) ─────────────
                .requestMatchers("/api/kanban/**").authenticated()

                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) -> res.sendError(401, "Unauthorized"))
                .accessDeniedHandler((req, res, e) -> res.sendError(403, "Forbidden"))
            );
        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
