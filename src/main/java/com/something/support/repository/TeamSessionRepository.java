package com.something.support.repository;

import com.something.support.entity.TeamSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TeamSessionRepository extends JpaRepository<TeamSession, Long> {
    List<TeamSession> findByStartTimeBetween(LocalDateTime from, LocalDateTime to);
    List<TeamSession> findByDevNameIgnoreCase(String devName);
}
