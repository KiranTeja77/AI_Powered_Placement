package com.placewise.api.user;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {

    List<Department> findAllByOrderByCodeAsc();
}
