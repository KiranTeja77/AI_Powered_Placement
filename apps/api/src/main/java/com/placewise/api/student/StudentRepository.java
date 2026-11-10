package com.placewise.api.student;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    Optional<Student> findByRollNo(String rollNo);

    boolean existsByRollNo(String rollNo);
}
