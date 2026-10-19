package com.something.support.controller;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerTest {

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private String base() {
        return "http://localhost:" + port + "/egssupport";
    }

    @Test
    void anonymous_api_returns_401() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/sessions"))
                .GET().build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, resp.statusCode());
    }

    @Test
    void bad_login_returns_401() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"name\":\"nobody\",\"password\":\"wrong\"}"))
                .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, resp.statusCode());
    }
}
