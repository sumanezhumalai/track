package com.something.support.repository;

import com.something.support.entity.GeneralSupport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GeneralSupportRepository extends JpaRepository<GeneralSupport, Long> {
}
