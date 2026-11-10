package com.placewise.api.auth;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, UUID> {

    @Query("select a from LoginAttempt a where a.identifier = :identifier and a.ipAddress = :ip "
            + "and a.attemptedAt > :since order by a.attemptedAt asc")
    List<LoginAttempt> findRecent(@Param("identifier") String identifier, @Param("ip") String ip,
            @Param("since") Instant since);

    @Modifying(flushAutomatically = true)
    @Query("delete from LoginAttempt a where a.identifier = :identifier and a.ipAddress = :ip")
    int clear(@Param("identifier") String identifier, @Param("ip") String ip);
}
