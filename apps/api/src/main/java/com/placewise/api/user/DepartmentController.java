package com.placewise.api.user;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public list used by the registration form. */
@RestController
@RequestMapping("/api/v1/departments")
class DepartmentController {

    private final DepartmentRepository departments;

    DepartmentController(DepartmentRepository departments) {
        this.departments = departments;
    }

    @GetMapping
    List<UserResponse.DepartmentResponse> list() {
        return departments.findAllByOrderByCodeAsc().stream()
                .map(d -> new UserResponse.DepartmentResponse(d.getId(), d.getCode(), d.getName()))
                .toList();
    }
}
