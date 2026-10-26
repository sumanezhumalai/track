package com.something.support.service;

import com.something.support.dto.SessionRequest;
import com.something.support.entity.TeamSession;
import com.something.support.repository.TeamSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    TeamSessionRepository repo;

    @Mock
    AuditService auditService;

    @InjectMocks
    SessionService service;

    @Test
    void createSession_setsStartTime() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TeamSession s = service.createSession(
                new SessionRequest("devA", "aeB", null), "devA", true);

        assertNotNull(s.getStartTime(), "startTime must be set server-side");
        assertNull(s.getEndTime(), "endTime must be null for a new session");
        verify(auditService).log("CREATE_SESSION", "devA", "SUCCESS");
    }

    @Test
    void endSession_setsEndTimeAndDescription() {
        TeamSession existing = TeamSession.builder()
                .sessionId(1L)
                .devName("devA")
                .aeName("aeB")
                .startTime(java.time.LocalDateTime.now().minusMinutes(30))
                .build();
        when(repo.findById(1L)).thenReturn(java.util.Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TeamSession ended = service.endSession(1L, "resolved the issue", "admin");

        assertNotNull(ended.getEndTime(), "endTime must be set on end");
        assertEquals("resolved the issue", ended.getSessionDescription());
        verify(auditService).log("END_SESSION", "admin", "SUCCESS");
    }
}
