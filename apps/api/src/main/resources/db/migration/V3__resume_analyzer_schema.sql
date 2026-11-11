-- Resume analyzer: the skill and role catalogue, career interests and stored analyses.
-- skill, job_role and role_skill are filled from the AI service's JSON files by the repeatable
-- migration R__seed_catalogue, so the API and the analyzer always agree on what a skill is.

CREATE TABLE skill (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    slug       varchar(80)  NOT NULL,
    name       varchar(120) NOT NULL,
    category   varchar(80)  NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_skill_slug UNIQUE (slug)
);

CREATE TABLE job_role (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    slug       varchar(80)  NOT NULL,
    name       varchar(120) NOT NULL,
    summary    varchar(300) NOT NULL,
    -- Branch codes the role suits, e.g. ["CSE", "IT"].
    branches   jsonb        NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_role_slug UNIQUE (slug)
);

CREATE TABLE role_skill (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    role_id    uuid        NOT NULL REFERENCES job_role (id) ON DELETE CASCADE,
    skill_id   uuid        NOT NULL REFERENCES skill (id) ON DELETE CASCADE,
    importance varchar(16) NOT NULL,
    CONSTRAINT ck_role_skill_importance CHECK (importance IN ('core', 'important', 'bonus')),
    CONSTRAINT uq_role_skill UNIQUE (role_id, skill_id)
);
CREATE INDEX ix_role_skill_skill ON role_skill (skill_id);

-- Roles a student says they are interested in.
CREATE TABLE career_interest (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    student_id uuid        NOT NULL REFERENCES student (user_id) ON DELETE CASCADE,
    role_id    uuid        NOT NULL REFERENCES job_role (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_career_interest UNIQUE (student_id, role_id)
);
CREATE INDEX ix_career_interest_role ON career_interest (role_id);

CREATE TABLE resume_analysis (
    id               uuid PRIMARY KEY DEFAULT uuidv7(),
    student_id       uuid         NOT NULL REFERENCES student (user_id) ON DELETE CASCADE,
    -- The resume exactly as submitted. Never logged; only the owner can read the analysis.
    raw_text         text         NOT NULL,
    target_roles     jsonb        NOT NULL DEFAULT '[]'::jsonb,
    -- The analyzer's full answer for the text as submitted.
    result           jsonb        NOT NULL,
    -- Set after the student confirms, removes or adds skills: the edits, the resulting skill list
    -- and the recomputed role readiness.
    confirmed_skills jsonb,
    engine_version   varchar(32)  NOT NULL,
    -- Summary for the history list, so it never has to read the large documents above.
    top_role         varchar(80),
    top_score        numeric(5, 1),
    skill_count      integer      NOT NULL DEFAULT 0,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_resume_analysis_text CHECK (char_length(raw_text) BETWEEN 200 AND 20000),
    CONSTRAINT ck_resume_analysis_score CHECK (top_score IS NULL OR top_score BETWEEN 0 AND 100)
);
CREATE INDEX ix_resume_analysis_student_created ON resume_analysis (student_id, created_at DESC);
CREATE INDEX ix_resume_analysis_result ON resume_analysis USING GIN (result jsonb_path_ops);
