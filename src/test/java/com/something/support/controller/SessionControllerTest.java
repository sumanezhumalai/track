package com.something.support.controller;

import com.something.support.entity.DevSupport;
import com.something.support.repository.DevSupportRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SessionControllerTest {

    @LocalServerPort int port;
    @Autowired DevSupportRepository devRepo;
    @Autowired PasswordEncoder encoder;

    private final HttpClient http = HttpClient.newBuilder()
            .cookieHandler(new java.net.CookieManager())
            .build();

    private String base() { return "http://localhost:" + port + "/egssupport"; }

    private String sessionCookie;

    @BeforeEach
    void seedDevUser() throws Exception {
        // Seed a dev user for role tests
        if (devRepo.findByDevName("testdev").isEmpty()) {
            devRepo.save(DevSupport.builder()
                    .devName("testdev")
                    .role("Dev")
                    .team("DevSupport")
                    .type("dev")
                    .passwordHash(encoder.encode("devpass"))
                    .passwordOnboard(true)
                    .createdAt(LocalDateTime.now())
                    .createdBy("test")
                    .build());
        }
        // Login as testdev to get session cookie
        HttpRequest loginReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"name\":\"testdev\",\"password\":\"devpass\"}"))
                .build();
        http.send(loginReq, HttpResponse.BodyHandlers.ofString());
    }

    @Autowired com.something.support.repository.TeamSessionRepository sessionRepo;

    @Test
    @Order(1)
    void dev_cannot_delete_other_dev_session() throws Exception {
        com.something.support.entity.TeamSession otherSession = sessionRepo.save(
                com.something.support.entity.TeamSession.builder()
                        .devName("otherDev")
                        .aeName("aeTest")
                        .sessionDescription("Belongs to other dev")
                        .startTime(LocalDateTime.now())
                        .createdAt(LocalDateTime.now())
                        .build());

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions/" + otherSession.getSessionId()))
                .DELETE().build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(403, resp.statusCode());
    }

    @Test
    @Order(4)
    void dev_can_delete_own_session() throws Exception {
        com.something.support.entity.TeamSession ownSession = sessionRepo.save(
                com.something.support.entity.TeamSession.builder()
                        .devName("testdev")
                        .aeName("aeTest")
                        .sessionDescription("To be deleted by owner")
                        .startTime(LocalDateTime.now())
                        .createdAt(LocalDateTime.now())
                        .build());

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions/" + ownSession.getSessionId()))
                .DELETE().build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(204, resp.statusCode());
    }

    @Test
    @Order(2)
    void dev_cannot_create_session_for_other_dev() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"devName\":\"otherDev\",\"aeName\":\"aeB\"}"))
                .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(403, resp.statusCode());
    }

    @Test
    @Order(3)
    void dev_can_create_and_end_own_session() throws Exception {
        // 1. Create own session as testdev
        HttpRequest createReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"devName\":\"testdev\",\"aeName\":\"aeB\",\"sessionDescription\":\"investigation\"}"))
                .build();
        HttpResponse<String> createResp = http.send(createReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, createResp.statusCode());

        // Extract session ID from response
        String body = createResp.body();
        // {"sessionId":X,...}
        int idStart = body.indexOf("\"sessionId\":") + 12;
        int idEnd = body.indexOf(",", idStart);
        String sessionId = body.substring(idStart, idEnd).trim();

        // 2. End own session
        HttpRequest endReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions/" + sessionId + "/end"))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(
                        "{\"sessionDescription\":\"issue resolved\"}"))
                .build();
        HttpResponse<String> endResp = http.send(endReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, endResp.statusCode());
    }

    @Test
    @Order(5)
    void dev_only_receives_own_sessions_in_list() throws Exception {
        sessionRepo.save(
                com.something.support.entity.TeamSession.builder()
                        .devName("otherDevSecret")
                        .aeName("aeTest")
                        .sessionDescription("Secret other dev session")
                        .startTime(LocalDateTime.now())
                        .createdAt(LocalDateTime.now())
                        .build());

        HttpRequest getReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions"))
                .GET().build();
        HttpResponse<String> getResp = http.send(getReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, getResp.statusCode());
        String body = getResp.body();
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("otherDevSecret"),
                "Dev should NOT see sessions belonging to other developers");
    }

    @Test
    @Order(6)
    void dev_can_list_ae_users_but_not_dev_users() throws Exception {
        // Dev should be able to get /api/users/ae for dropdown
        HttpRequest aeReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/users/ae"))
                .GET().build();
        HttpResponse<String> aeResp = http.send(aeReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, aeResp.statusCode(), "Dev should be able to list GeneralSupport (AE) engineers");

        // Dev should NOT be able to get /api/users/dev
        HttpRequest devReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/users/dev"))
                .GET().build();
        HttpResponse<String> devResp = http.send(devReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(403, devResp.statusCode(), "Dev should not be able to list devSupport users");
    }
}
