-- Auth and identity schema. Primary keys are UUIDv7 (native in PostgreSQL 18).

CREATE TABLE department (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    code       varchar(16)  NOT NULL,
    name       varchar(120) NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_department_code UNIQUE (code)
);

CREATE TABLE app_user (
    id            uuid PRIMARY KEY DEFAULT uuidv7(),
    email         varchar(254) NOT NULL,
    password_hash varchar(100) NOT NULL,
    full_name     varchar(120) NOT NULL,
    role          varchar(16)  NOT NULL,
    status        varchar(16)  NOT NULL DEFAULT 'ACTIVE',
    department_id uuid REFERENCES department (id),
    last_login_at timestamptz,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_app_user_role CHECK (role IN ('STUDENT', 'FACULTY', 'TP_HEAD', 'ADMIN', 'RECRUITER')),
    CONSTRAINT ck_app_user_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
-- Emails are stored lower-case by the application; the index enforces it for any writer.
CREATE UNIQUE INDEX uq_app_user_email ON app_user (lower(email));
CREATE INDEX ix_app_user_role ON app_user (role);

CREATE TABLE student (
    user_id         uuid PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    roll_no         varchar(32) NOT NULL,
    department_id   uuid        NOT NULL REFERENCES department (id),
    graduation_year integer     NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_roll_no UNIQUE (roll_no),
    CONSTRAINT ck_student_graduation_year CHECK (graduation_year BETWEEN 2000 AND 2100)
);
CREATE INDEX ix_student_department ON student (department_id);

CREATE TABLE faculty_assignment (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    faculty_id uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    student_id uuid        NOT NULL REFERENCES student (user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_faculty_assignment UNIQUE (faculty_id, student_id)
);
CREATE INDEX ix_faculty_assignment_student ON faculty_assignment (student_id);

-- Opaque refresh tokens, stored only as SHA-256 hashes. A family is one login session;
-- reusing a revoked token revokes the whole family.
CREATE TABLE refresh_token (
    id          uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id     uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    family_id   uuid        NOT NULL,
    token_hash  varchar(64) NOT NULL,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);
CREATE INDEX ix_refresh_token_family ON refresh_token (family_id);
CREATE INDEX ix_refresh_token_user ON refresh_token (user_id);

CREATE TABLE password_reset_token (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash)
);
CREATE INDEX ix_password_reset_token_user ON password_reset_token (user_id);

-- Failed sign-in attempts, used for the 5 per 15 minutes per account and IP limit.
CREATE TABLE login_attempt (
    id           uuid PRIMARY KEY DEFAULT uuidv7(),
    identifier   varchar(254) NOT NULL,
    ip_address   varchar(64)  NOT NULL,
    attempted_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX ix_login_attempt_lookup ON login_attempt (identifier, ip_address, attempted_at);
