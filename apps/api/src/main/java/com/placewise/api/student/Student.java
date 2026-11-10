package com.placewise.api.student;

import com.placewise.api.user.Department;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student")
public class Student {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "roll_no")
    private String rollNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "graduation_year")
    private int graduationYear;

    @Column(name = "created_at")
    private Instant createdAt;

    protected Student() {}

    public Student(UUID userId, String rollNo, Department department, int graduationYear, Instant now) {
        this.userId = userId;
        this.rollNo = rollNo;
        this.department = department;
        this.graduationYear = graduationYear;
        this.createdAt = now;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getRollNo() {
        return rollNo;
    }

    public Department getDepartment() {
        return department;
    }

    public int getGraduationYear() {
        return graduationYear;
    }
}
