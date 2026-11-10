package com.placewise.api.user;

import com.placewise.api.student.StudentRepository;
import org.springframework.stereotype.Component;

/** Builds API responses from entities. Call inside a transaction (department is lazy). */
@Component
public class UserMapper {

    private final StudentRepository students;

    UserMapper(StudentRepository students) {
        this.students = students;
    }

    public UserResponse toResponse(AppUser user) {
        Department dept = user.getDepartment();
        UserResponse.DepartmentResponse department = dept == null
                ? null
                : new UserResponse.DepartmentResponse(dept.getId(), dept.getCode(), dept.getName());
        UserResponse.StudentProfile profile = user.getRole() == Role.STUDENT
                ? students.findById(user.getId())
                        .map(s -> new UserResponse.StudentProfile(s.getRollNo(), s.getGraduationYear()))
                        .orElse(null)
                : null;
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole(),
                user.getStatus(), department, profile);
    }
}
