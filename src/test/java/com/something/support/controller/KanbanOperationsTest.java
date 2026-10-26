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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class KanbanOperationsTest {

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
        if (devRepo.findByDevName("test_admin").isEmpty()) {
            devRepo.save(DevSupport.builder()
                    .devName("test_admin")
                    .type("admin")
                    .role("Admin")
                    .team("DevSupport")
                    .passwordHash(encoder.encode("pass123"))
                    .passwordOnboard(true)
                    .build());
        }
        if (devRepo.findByDevName("test_john").isEmpty()) {
            devRepo.save(DevSupport.builder()
                    .devName("test_john")
                    .type("dev")
                    .role("Dev")
                    .team("DevSupport")
                    .passwordHash(encoder.encode("pass123"))
                    .passwordOnboard(true)
                    .build());
        }
        if (devRepo.findByDevName("test_alice").isEmpty()) {
            devRepo.save(DevSupport.builder()
                    .devName("test_alice")
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
    void testSubtaskCreationAndCollaborativeAssigneeVisibility() throws Exception {
        HttpClient adminClient = createClient();
        login(adminClient, "test_admin", "pass123");

        HttpClient aliceClient = createClient();
        login(aliceClient, "test_alice", "pass123");

        // 1. Create a Project
        String projPayload = "{\"projectName\":\"Kanban Test " + System.currentTimeMillis() + "\",\"description\":\"Test desc\"}";
        HttpRequest createProjReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/projects"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(projPayload))
                .build();
        HttpResponse<String> projResp = adminClient.send(createProjReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, projResp.statusCode());
        JsonNode projNode = mapper.readTree(projResp.body());
        long projectId = projNode.get("projectId").asLong();

        // Add test_john and test_alice as members
        for (String member : List.of("test_john", "test_alice")) {
            HttpRequest addMemReq = HttpRequest.newBuilder()
                    .uri(URI.create(base() + "/api/kanban/projects/" + projectId + "/members"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{\"devName\":\"" + member + "\"}"))
                    .build();
            adminClient.send(addMemReq, HttpResponse.BodyHandlers.ofString());
        }

        // Get default version id from board
        HttpRequest getBoardReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/projects/" + projectId + "/board"))
                .GET().build();
        HttpResponse<String> boardResp = adminClient.send(getBoardReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, boardResp.statusCode());
        JsonNode boardNode = mapper.readTree(boardResp.body());
        long versionId = boardNode.get("versionId").asLong();

        // 2. Create Module with Subtasks and Multiple Assignees (test_john first, test_alice second)
        String modulePayload = mapper.writeValueAsString(new Object() {
            public final String title = "Collaborative Module With Subtasks";
            public final String description = "Testing subtasks & multiple assignees";
            public final String priority = "high";
            public final String status = "start";
            public final List<String> assigneeDevNames = List.of("test_john", "test_alice");
            public final List<String> subtaskTexts = List.of("Subtask 1", "Subtask 2", "Subtask 3");
        });

        HttpRequest createModReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules?versionId=" + versionId))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(modulePayload))
                .build();
        HttpResponse<String> modResp = adminClient.send(createModReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, modResp.statusCode(), "Module creation failed: " + modResp.body());

        JsonNode modNode = mapper.readTree(modResp.body());
        long moduleId = modNode.get("moduleId").asLong();

        // Problem 1 Check:
        // Response should have subtasks serialized
        assertTrue(modNode.has("subtasks"), "Creation response must include 'subtasks' field: " + modResp.body());
        assertEquals(3, modNode.get("subtasks").size(), "Creation response should contain 3 subtasks: " + modResp.body());

        // Board query check for subtasks
        HttpResponse<String> adminBoardResp = adminClient.send(getBoardReq, HttpResponse.BodyHandlers.ofString());
        JsonNode adminBoard = mapper.readTree(adminBoardResp.body());
        JsonNode startCards = adminBoard.get("columns").get("start");
        assertNotNull(startCards);
        JsonNode createdCard = null;
        for (JsonNode card : startCards) {
            if (card.get("moduleId").asLong() == moduleId) {
                createdCard = card;
                break;
            }
        }
        assertNotNull(createdCard, "Created card must exist in admin board");
        assertEquals(3, createdCard.get("subtasks").size(), "Board response must contain 3 subtasks");

        // Problem 2 Check:
        // Alice is the SECOND assignee (john_dev was first).
        // Alice should be able to see this module on her board!
        HttpRequest aliceBoardReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/projects/" + projectId + "/board"))
                .GET().build();
        HttpResponse<String> aliceBoardResp = aliceClient.send(aliceBoardReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, aliceBoardResp.statusCode());
        JsonNode aliceBoard = mapper.readTree(aliceBoardResp.body());
        JsonNode aliceStartCards = aliceBoard.get("columns").get("start");
        assertNotNull(aliceStartCards);

        boolean aliceSeesModule = false;
        for (JsonNode card : aliceStartCards) {
            if (card.get("moduleId").asLong() == moduleId) {
                aliceSeesModule = true;
                break;
            }
        }
        assertTrue(aliceSeesModule, "Collaborative module must be visible to alice_dev (the second assignee)!");

        // Inconsistency 1 Check:
        // Updating module via PUT /api/kanban/modules/{id} must preserve subtasks in response
        String updatePayload = mapper.writeValueAsString(new Object() {
            public final String title = "Collaborative Module (Updated)";
            public final String priority = "medium";
            public final List<String> assigneeDevNames = List.of("test_john", "test_alice");
        });
        HttpRequest updateModReq = HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/" + moduleId))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(updatePayload))
                .build();
        HttpResponse<String> updateModResp = adminClient.send(updateModReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, updateModResp.statusCode());
        JsonNode updatedModNode = mapper.readTree(updateModResp.body());
        assertTrue(updatedModNode.has("subtasks"), "Update response must have subtasks");
        assertEquals(3, updatedModNode.get("subtasks").size(), "Update response must preserve existing subtasks!");

        // Inconsistency 2 Check:
        // Create Module assigned only to test_john
        String johnOnlyPayload = mapper.writeValueAsString(new Object() {
            public final String title = "John Only Task";
            public final String priority = "low";
            public final String status = "start";
            public final List<String> assigneeDevNames = List.of("test_john");
        });
        HttpResponse<String> johnModResp = adminClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules?versionId=" + versionId))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(johnOnlyPayload))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(201, johnModResp.statusCode());
        long johnModId = mapper.readTree(johnModResp.body()).get("moduleId").asLong();

        // Alice attempts to move John's module -> should fail 403 Forbidden
        String movePayload = "{\"status\":\"testing\",\"position\":0}";
        HttpResponse<String> aliceMoveJohnResp = aliceClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/" + johnModId + "/move"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(movePayload))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(403, aliceMoveJohnResp.statusCode(), "Unassigned dev should not be allowed to move someone else's module!");

        // Alice moves the collaborative module (where she IS assigned) -> should succeed 200 OK
        HttpResponse<String> aliceMoveCollabResp = aliceClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/" + moduleId + "/move"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(movePayload))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, aliceMoveCollabResp.statusCode(), "Assigned collaborative dev should be allowed to move their module!");

        // Inconsistency 3 Check:
        // Dev cannot add subtask -> 403 Forbidden
        String subtaskPayload = "{\"text\":\"Dev added subtask\"}";
        HttpResponse<String> devAddSubResp = aliceClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/" + moduleId + "/subtasks"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(subtaskPayload))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(403, devAddSubResp.statusCode(), "Dev cannot add subtasks!");

        // Admin CAN add subtask -> 201 Created
        HttpResponse<String> adminAddSubResp = adminClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/" + moduleId + "/subtasks"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(subtaskPayload))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(201, adminAddSubResp.statusCode(), "Admin can add subtask!");
        long newSubtaskId = mapper.readTree(adminAddSubResp.body()).get("subtaskId").asLong();

        // Alice (assigned to moduleId) CAN toggle subtask -> 200 OK
        HttpResponse<String> aliceToggleResp = aliceClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/subtasks/" + newSubtaskId + "/toggle"))
                .method("PATCH", HttpRequest.BodyPublishers.noBody())
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, aliceToggleResp.statusCode(), "Assigned dev can toggle subtask!");

        // Dev cannot delete subtask -> 403 Forbidden
        HttpResponse<String> devDelSubResp = aliceClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/subtasks/" + newSubtaskId))
                .DELETE()
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(403, devDelSubResp.statusCode(), "Dev cannot delete subtasks!");

        // Admin CAN delete subtask -> 204 No Content
        HttpResponse<String> adminDelSubResp = adminClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/subtasks/" + newSubtaskId))
                .DELETE()
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(204, adminDelSubResp.statusCode(), "Admin can delete subtasks!");

        // Inconsistency 4 Check:
        // Batch reorder updates both status and position
        final long vId = versionId;
        String reorderPayload = mapper.writeValueAsString(new Object() {
            public final Long versionId = vId;
            public final String status = "start";
            public final List<Long> orderedModuleIds = List.of(moduleId, johnModId);
        });
        HttpResponse<String> reorderResp = adminClient.send(HttpRequest.newBuilder()
                .uri(URI.create(base() + "/api/kanban/modules/reorder"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(reorderPayload))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, reorderResp.statusCode());

        // Verify that moduleId status is now 'start' and position is 0
        HttpResponse<String> finalBoardResp = adminClient.send(getBoardReq, HttpResponse.BodyHandlers.ofString());
        JsonNode finalStartCards = mapper.readTree(finalBoardResp.body()).get("columns").get("start");
        assertEquals(2, finalStartCards.size());
        assertEquals(moduleId, finalStartCards.get(0).get("moduleId").asLong());
        assertEquals(0, finalStartCards.get(0).get("position").asInt());
        assertEquals("start", finalStartCards.get(0).get("status").asText());
    }
}
