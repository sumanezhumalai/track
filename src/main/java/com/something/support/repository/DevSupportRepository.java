package com.something.support.repository;

import com.something.support.entity.DevSupport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DevSupportRepository extends JpaRepository<DevSupport, Long> {
    Optional<DevSupport> findByDevName(String devName);
}
