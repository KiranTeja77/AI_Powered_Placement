package com.placewise.api.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    @Query("select u from AppUser u where lower(u.email) = lower(:email)")
    Optional<AppUser> findByEmailIgnoreCase(@Param("email") String email);

    @Query("select count(u) > 0 from AppUser u where lower(u.email) = lower(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);
}
