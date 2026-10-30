package com.something.support.controller;

import com.something.support.entity.DevSupport;
import com.something.support.repository.DevSupportRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class AnalyticsControllerIntegrationTest {

    @LocalServerPort
    int port;

    @Autowired
    DevSupportRepository devRepo;

    @Autowired
    PasswordEncoder encoder;

    private final ObjectMapper mapper = new ObjectMapper();

    private String base() {
        return "http://localhost:" + port + "/egssupport";
    }

    @BeforeEach
    void seedUsers() {
        if (devRepo.findByDevName("test_analytics_admin").isEmpty()) {
            devRepo.save(DevSupport.builder()
                    .devName("test_analytics_admin")
                    .type("admin")
                    .role("Admin")
                    .team("DevSupport")
                    .passwordHash(encoder.encode("pass123"))
                    .passwordOnboard(true)
                    .build());
        }
        if (devRepo.findByDevName("test_analytics_dev").isEmpty()) {
            devRepo.save(DevSupport.builder()
                    .devName("test_analytics_dev")
                    .type("dev")
                    .role("Dev")
                    .team("DevSupport")
                    .passwordHash(encoder.encode("pass123"))
                    .passwordOnboard(true)
                    .build());
        }
    }

    private HttpClient createClient() {
        CookieManager cookieManager = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        return HttpClient.newBuilder().cookieHandler(cookieManager).build();
    }

    private void login(HttpClient client, String username, String password) throws Exception {
        String body = mapper.writeValueAsString(new LoginReq(username, password));
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, resp.statusCode(), "Login should succeed: " + resp.body());
    }

    record LoginReq(String name, String password) {}

    @Test
    void testDashboardStatsAsAdminAndDev() throws Exception {
        HttpClient adminClient = createClient();
        login(adminClient, "test_analytics_admin", "pass123");

        HttpRequest adminReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/dashboard/stats"))
                .GET()
                .build();
        HttpResponse<String> adminResp = adminClient.send(adminReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, adminResp.statusCode());

        JsonNode adminJson = mapper.readTree(adminResp.body());
        assertTrue(adminJson.get("isAdmin").asBoolean());
        assertNotNull(adminJson.get("adminStats"));
        assertTrue(adminJson.get("devStats").isNull());

        // Dev
        HttpClient devClient = createClient();
        login(devClient, "test_analytics_dev", "pass123");

        HttpRequest devReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/dashboard/stats"))
                .GET()
                .build();
        HttpResponse<String> devResp = devClient.send(devReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, devResp.statusCode());

        JsonNode devJson = mapper.readTree(devResp.body());
        assertFalse(devJson.get("isAdmin").asBoolean());
        assertTrue(devJson.get("adminStats").isNull());
        assertNotNull(devJson.get("devStats"));
        assertEquals("test_analytics_dev", devJson.get("devStats").get("devName").asText());
    }

    @Test
    void testModuleAnalyticsSecurity() throws Exception {
        HttpClient adminClient = createClient();
        login(adminClient, "test_analytics_admin", "pass123");

        HttpRequest adminReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/analytics/modules"))
                .GET()
                .build();
        HttpResponse<String> adminResp = adminClient.send(adminReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, adminResp.statusCode());

        JsonNode adminJson = mapper.readTree(adminResp.body());
        assertNotNull(adminJson.get("summary"));
        assertNotNull(adminJson.get("pipelineDistribution"));

        // Dev trying to access admin analytics -> 403 Forbidden
        HttpClient devClient = createClient();
        login(devClient, "test_analytics_dev", "pass123");

        HttpRequest devReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/analytics/modules"))
                .GET()
                .build();
        HttpResponse<String> devResp = devClient.send(devReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(403, devResp.statusCode());
    }
}
