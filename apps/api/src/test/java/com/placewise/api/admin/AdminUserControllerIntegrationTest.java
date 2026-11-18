package com.placewise.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class AdminUserControllerIntegrationTest extends IntegrationTestBase {

    private static final String USERS = "/api/v1/admin/users";

    private UUID adminId;
    private String admin;

    @BeforeEach
    void adminSignedIn() throws Exception {
        adminId = insertUser("admin@college.edu", "ADMIN", "ACTIVE");
        admin = accessTokenFor("admin@college.edu");
    }

    private ResultActions list(String token, String query) throws Exception {
        // A URI, not a template, so %20 and %25 reach the server as written.
        return mvc.perform(get(java.net.URI.create(USERS + query)).header("Authorization", "Bearer " + token));
    }

    private ResultActions create(String token, String body) throws Exception {
        return mvc.perform(post(USERS).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions setStatus(String token, UUID id, String status) throws Exception {
        return mvc.perform(patch(USERS + "/" + id + "/status").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + status + "\"}"));
    }

    private String staff(String name, String email, String role, UUID departmentId) {
        return departmentId == null
                ? json("{\"fullName\":\"%s\",\"email\":\"%s\",\"role\":\"%s\"}", name, email, role)
                : json("{\"fullName\":\"%s\",\"email\":\"%s\",\"role\":\"%s\",\"departmentId\":\"%s\"}",
                        name, email, role, departmentId);
    }

    // ---- who may use it

    @Test
    void onlyAdminsMayUseIt() throws Exception {
        mvc.perform(get(USERS)).andExpect(status().isUnauthorized());
        register("student@college.edu", "21CS001");
        List<String> others = List.of("student@college.edu", "faculty@college.edu", "tp@college.edu",
                "recruiter@college.edu");
        insertUser("faculty@college.edu", "FACULTY", "ACTIVE");
        insertUser("tp@college.edu", "TP_HEAD", "ACTIVE");
        insertUser("recruiter@college.edu", "RECRUITER", "ACTIVE");
        for (String email : others) {
            String token = accessTokenFor(email);
            list(token, "").andExpect(status().isForbidden())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
            create(token, staff("X", "x@college.edu", "FACULTY", departmentId("CSE"))).andExpect(status().isForbidden());
            setStatus(token, adminId, "INACTIVE").andExpect(status().isForbidden());
        }
        assertThat(jdbc.queryForObject("select count(*) from app_user where email = 'x@college.edu'", Integer.class)).isZero();
    }

    // ---- list

    @Test
    void listsUsersNewestFirstWithPaging() throws Exception {
        for (int i = 1; i <= 5; i++) {
            insertUser("staff" + i + "@college.edu", "FACULTY", "ACTIVE");
        }
        list(admin, "?size=4").andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4))
                .andExpect(jsonPath("$.totalItems").value(6))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items[0].password").doesNotExist())
                .andExpect(jsonPath("$.items[0].passwordHash").doesNotExist());
        list(admin, "?size=4&page=1").andExpect(jsonPath("$.items.length()").value(2));
        list(admin, "?size=0").andExpect(status().isBadRequest());
        list(admin, "?size=101").andExpect(status().isBadRequest());
        list(admin, "?role=ASTRONAUT").andExpect(status().isBadRequest());
    }

    @Test
    void filtersByRoleStatusAndDepartment() throws Exception {
        register("student@college.edu", "21CS001");
        insertUser("f1@college.edu", "FACULTY", "ACTIVE");
        insertUser("f2@college.edu", "FACULTY", "INACTIVE");
        insertUser("t1@college.edu", "TP_HEAD", "ACTIVE");

        list(admin, "?role=FACULTY").andExpect(jsonPath("$.totalItems").value(2));
        list(admin, "?role=TP_HEAD").andExpect(jsonPath("$.items[0].email").value("t1@college.edu"));
        list(admin, "?status=INACTIVE").andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].email").value("f2@college.edu"));
        list(admin, "?role=FACULTY&status=ACTIVE").andExpect(jsonPath("$.totalItems").value(1));

        // Faculty carry the department on the account, students on their student record.
        jdbc.update("update app_user set department_id = ? where email = 'f1@college.edu'", departmentId("ECE"));
        list(admin, "?departmentId=" + departmentId("ECE")).andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].email").value("f1@college.edu"))
                .andExpect(jsonPath("$.items[0].department.code").value("ECE"));
        list(admin, "?departmentId=" + departmentId("CSE")).andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].email").value("student@college.edu"));
        list(admin, "?departmentId=" + UUID.randomUUID()).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void searchesNameEmailAndRollNumberWithoutTreatingWildcardsAsPatterns() throws Exception {
        register("asha.rao@college.edu", "21CS777");
        insertUser("other@college.edu", "FACULTY", "ACTIVE");
        jdbc.update("update app_user set full_name = 'Ravi 100%' where email = 'other@college.edu'");

        list(admin, "?q=asha").andExpect(jsonPath("$.totalItems").value(1)); // matches the email
        list(admin, "?q=rao@").andExpect(jsonPath("$.items[0].email").value("asha.rao@college.edu"));
        list(admin, "?q=TEST%20STUDENT").andExpect(jsonPath("$.totalItems").value(1));
        list(admin, "?q=21cs777").andExpect(jsonPath("$.items[0].rollNo").value("21CS777"));
        list(admin, "?q=ravi%20100%25").andExpect(jsonPath("$.totalItems").value(1));
        list(admin, "?q=%25").andExpect(jsonPath("$.totalItems").value(1)); // only the one name with a %
        list(admin, "?q=_").andExpect(jsonPath("$.totalItems").value(0));
        list(admin, "?q=%20%20").andExpect(jsonPath("$.totalItems").value(3));
    }

    // ---- create

    @Test
    void createsAStaffAccountAndEmailsASetPasswordLinkThatWorksOnce() throws Exception {
        UUID cse = departmentId("CSE");
        MvcResult created = create(admin, staff("Dr Rao", "Dr.Rao@College.edu", "FACULTY", cse))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("dr.rao@college.edu"))
                .andExpect(jsonPath("$.role").value("FACULTY"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.department.code").value("CSE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andReturn();
        assertThat(created.getResponse().getContentAsString()).doesNotContain("token=").doesNotContain("passwordHash");

        // One email, to that address, with a link to the set-password page.
        assertThat(mailer.sent()).hasSize(1);
        assertThat(mailer.sent().get(0).to()).isEqualTo("dr.rao@college.edu");
        assertThat(mailer.sent().get(0).link()).contains("/set-password?token=");

        // The token is stored hashed, lives 24 hours, and nobody could have signed in before.
        assertThat(jdbc.queryForObject("select count(*) from password_reset_token where token_hash = ?", Integer.class,
                com.placewise.api.auth.TokenCodec.hash(mailer.lastToken()))).isEqualTo(1);
        long hours = jdbc.queryForObject(
                "select extract(epoch from (expires_at - created_at)) / 3600 from password_reset_token", Long.class);
        assertThat(hours).isEqualTo(24);
        mvc.perform(login("dr.rao@college.edu", PASSWORD, "10.7.0.1")).andExpect(status().isUnauthorized());

        // The person chooses their own password with the emailed token...
        String token = mailer.lastToken();
        mvc.perform(postJson("/api/v1/auth/reset-password",
                json("{\"token\":\"%s\",\"newPassword\":\"Chosen123Pass\"}", token))).andExpect(status().isNoContent());
        mvc.perform(login("dr.rao@college.edu", "Chosen123Pass", "10.7.0.2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("FACULTY"));
        // ...and the link works only once.
        mvc.perform(postJson("/api/v1/auth/reset-password",
                json("{\"token\":\"%s\",\"newPassword\":\"Another123Pass\"}", token))).andExpect(status().isBadRequest());
    }

    @Test
    void anExpiredSetPasswordLinkIsRefused() throws Exception {
        create(admin, staff("T P", "tp.new@college.edu", "TP_HEAD", null)).andExpect(status().isCreated());
        jdbc.update("update password_reset_token set expires_at = now() - interval '1 minute'");
        mvc.perform(postJson("/api/v1/auth/reset-password",
                json("{\"token\":\"%s\",\"newPassword\":\"Chosen123Pass\"}", mailer.lastToken())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void facultyNeedADepartmentAndOtherStaffMustNotHaveOne() throws Exception {
        create(admin, staff("F", "f@college.edu", "FACULTY", null)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.departmentId").exists());
        create(admin, staff("F", "f@college.edu", "FACULTY", UUID.randomUUID())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.departmentId").exists());
        for (String role : List.of("TP_HEAD", "RECRUITER", "ADMIN")) {
            create(admin, staff("X", "new-" + role.toLowerCase() + "@college.edu", role, departmentId("CSE"))).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.departmentId").exists());
            create(admin, staff("X", "new-" + role.toLowerCase() + "@college.edu", role, null)).andExpect(status().isCreated());
        }
        assertThat(mailer.sent()).hasSize(3);
    }

    @Test
    void studentsCannotBeCreatedHereAndTheBodyIsValidated() throws Exception {
        create(admin, staff("S", "s@college.edu", "STUDENT", null)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.role").exists());
        create(admin, "{\"fullName\":\"\",\"email\":\"not-an-email\",\"role\":\"ADMIN\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.fullName").exists()).andExpect(jsonPath("$.errors.email").exists());
        create(admin, "{\"fullName\":\"A\",\"email\":\"a@college.edu\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.role").exists());
        create(admin, "{\"fullName\":\"A\",\"email\":\"a@college.edu\",\"role\":\"WIZARD\"}").andExpect(status().isBadRequest());
        // A password in the request is not accepted, because there is nowhere for it to go.
        create(admin, "{\"fullName\":\"A\",\"email\":\"a@college.edu\",\"role\":\"ADMIN\",\"password\":\"Sup3rSecret\"}")
                .andExpect(status().isCreated());
        mvc.perform(login("a@college.edu", "Sup3rSecret", "10.7.0.3")).andExpect(status().isUnauthorized());
    }

    @Test
    void anEmailThatIsAlreadyInUseGivesConflictWhateverTheCase() throws Exception {
        create(admin, staff("One", "same@college.edu", "ADMIN", null)).andExpect(status().isCreated());
        create(admin, staff("Two", "SAME@college.edu", "RECRUITER", null)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors.email").exists());
        create(admin, staff("Three", "admin@college.edu", "RECRUITER", null)).andExpect(status().isConflict());
        assertThat(mailer.sent()).hasSize(1);
    }

    @Test
    void ifTheEmailCannotBeSentNoAccountIsLeftBehind() throws Exception {
        mailer.failInvites(true);
        create(admin, staff("Nobody", "nobody@college.edu", "ADMIN", null)).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("mail_unavailable"));
        assertThat(jdbc.queryForObject("select count(*) from app_user where email = 'nobody@college.edu'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from password_reset_token", Integer.class)).isZero();
    }

    // ---- status

    @Test
    void deactivatingEndsTheUsersSessionsAtOnce() throws Exception {
        UUID id = insertUser("staff@college.edu", "FACULTY", "ACTIVE");
        // With a department, since the response describes it after the sessions are revoked.
        jdbc.update("update app_user set department_id = ? where id = ?", departmentId("CSE"), id);
        MvcResult signIn = mvc.perform(login("staff@college.edu", PASSWORD, "10.8.0.1")).andReturn();
        String access = read(signIn, "$.accessToken");
        Cookie refresh = refreshCookie(signIn);
        Cookie otherDevice = refreshCookie(mvc.perform(login("staff@college.edu", PASSWORD, "10.8.0.2")).andReturn());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + access)).andExpect(status().isOk());

        setStatus(admin, id, "INACTIVE").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.department.code").value("CSE"));

        // Every refresh token is revoked, the access token already stops working, and sign-in is refused.
        assertThat(jdbc.queryForObject("select count(*) from refresh_token where user_id = ? and revoked_at is null",
                Integer.class, id)).isZero();
        mvc.perform(post("/api/v1/auth/refresh").cookie(refresh)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(otherDevice)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mvc.perform(login("staff@college.edu", PASSWORD, "10.8.0.3")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("account_disabled"));

        // Activating again lets them back in, with a new session.
        setStatus(admin, id, "ACTIVE").andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(login("staff@college.edu", PASSWORD, "10.8.0.4")).andExpect(status().isOk());
    }

    @Test
    void anAdminCannotDeactivateThemselves() throws Exception {
        setStatus(admin, adminId, "INACTIVE").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("cannot_deactivate_self"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        assertThat(jdbc.queryForObject("select status from app_user where id = ?", String.class, adminId)).isEqualTo("ACTIVE");
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + admin)).andExpect(status().isOk());
        // Activating oneself is harmless, and another admin can still be deactivated.
        setStatus(admin, adminId, "ACTIVE").andExpect(status().isOk());
        UUID other = insertUser("admin2@college.edu", "ADMIN", "ACTIVE");
        setStatus(admin, other, "INACTIVE").andExpect(status().isOk());
    }

    @Test
    void statusChangesValidateTheirInput() throws Exception {
        setStatus(admin, UUID.randomUUID(), "INACTIVE").andExpect(status().isNotFound());
        UUID id = insertUser("staff@college.edu", "FACULTY", "ACTIVE");
        setStatus(admin, id, "SUSPENDED").andExpect(status().isBadRequest());
        mvc.perform(patch(USERS + "/" + id + "/status").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(patch(USERS + "/not-a-uuid/status").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void aDeactivatedAdminLosesAdminAccessImmediately() throws Exception {
        UUID second = insertUser("admin2@college.edu", "ADMIN", "ACTIVE");
        String secondToken = accessTokenFor("admin2@college.edu");
        list(secondToken, "").andExpect(status().isOk());
        setStatus(admin, second, "INACTIVE").andExpect(status().isOk());
        list(secondToken, "").andExpect(status().isUnauthorized());
    }

    // ---- pending invites

    private ResultActions resend(String token, UUID id) throws Exception {
        return mvc.perform(post(USERS + "/" + id + "/resend-invite").header("Authorization", "Bearer " + token));
    }

    private UUID createStaff(String email, String role) throws Exception {
        MvcResult created = create(admin, staff("New Staff", email, role, null)).andExpect(status().isCreated()).andReturn();
        return UUID.fromString(read(created, "$.id"));
    }

    private void choosePassword(String token) throws Exception {
        mvc.perform(postJson("/api/v1/auth/reset-password",
                json("{\"token\":\"%s\",\"newPassword\":\"Chosen123Pass\"}", token))).andExpect(status().isNoContent());
    }

    @Test
    void anInvitedAccountIsPendingUntilItsOwnerChoosesAPassword() throws Exception {
        createStaff("pending@college.edu", "RECRUITER");
        list(admin, "?q=pending@").andExpect(jsonPath("$.items[0].invitePending").value(true));

        choosePassword(mailer.lastToken());
        list(admin, "?q=pending@").andExpect(jsonPath("$.items[0].invitePending").value(false));

        // Accounts that registered or were never invited are not pending.
        register("student@college.edu", "21CS001");
        list(admin, "?q=student@").andExpect(jsonPath("$.items[0].invitePending").value(false));
        list(admin, "?q=admin@").andExpect(jsonPath("$.items[0].invitePending").value(false));
    }

    @Test
    void resendingInvalidatesTheOldLinkAndEmailsANewOneThatLastsADay() throws Exception {
        UUID id = createStaff("resend@college.edu", "TP_HEAD");
        String oldToken = mailer.lastToken();

        resend(admin, id).andExpect(status().isOk()).andExpect(jsonPath("$.invitePending").value(true))
                .andExpect(jsonPath("$.password").doesNotExist());
        assertThat(mailer.sent()).hasSize(2);
        assertThat(mailer.sent().get(1).to()).isEqualTo("resend@college.edu");
        assertThat(mailer.sent().get(1).link()).contains("/set-password?token=");
        String newToken = mailer.lastToken();
        assertThat(newToken).isNotEqualTo(oldToken);

        long hours = jdbc.queryForObject(
                "select extract(epoch from (expires_at - created_at)) / 3600 from password_reset_token where used_at is null",
                Long.class);
        assertThat(hours).isEqualTo(24);

        // The first link no longer works, the second does.
        mvc.perform(postJson("/api/v1/auth/reset-password",
                json("{\"token\":\"%s\",\"newPassword\":\"Chosen123Pass\"}", oldToken))).andExpect(status().isBadRequest());
        choosePassword(newToken);
    }

    @Test
    void thereIsNothingToResendOnceAPasswordIsChosenOrForAccountsThatNeverNeededOne() throws Exception {
        UUID id = createStaff("done@college.edu", "RECRUITER");
        choosePassword(mailer.lastToken());
        int before = mailer.sent().size();
        resend(admin, id).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("no_pending_invite"));
        resend(admin, adminId).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("no_pending_invite"));
        register("student@college.edu", "21CS001");
        UUID student = jdbc.queryForObject("select id from app_user where email = 'student@college.edu'", UUID.class);
        resend(admin, student).andExpect(status().isConflict());
        resend(admin, UUID.randomUUID()).andExpect(status().isNotFound());
        assertThat(mailer.sent()).hasSize(before);
    }

    @Test
    void anInactiveAccountMustBeActivatedBeforeAnInviteIsResent() throws Exception {
        UUID id = createStaff("inactive@college.edu", "RECRUITER");
        setStatus(admin, id, "INACTIVE").andExpect(status().isOk()).andExpect(jsonPath("$.invitePending").value(true));
        resend(admin, id).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("account_inactive"));
        setStatus(admin, id, "ACTIVE").andExpect(status().isOk());
        resend(admin, id).andExpect(status().isOk());
    }

    @Test
    void ifTheResentEmailFailsTheOldLinkStillWorks() throws Exception {
        UUID id = createStaff("fail@college.edu", "RECRUITER");
        String oldToken = mailer.lastToken();
        mailer.failInvites(true);
        resend(admin, id).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("mail_unavailable"));
        mailer.failInvites(false);
        choosePassword(oldToken);
    }

    @Test
    void onlyAdminsMayResendInvites() throws Exception {
        UUID id = createStaff("target@college.edu", "RECRUITER");
        insertUser("faculty@college.edu", "FACULTY", "ACTIVE");
        resend(accessTokenFor("faculty@college.edu"), id).andExpect(status().isForbidden());
        mvc.perform(post(USERS + "/" + id + "/resend-invite")).andExpect(status().isUnauthorized());
    }

    // ---- overview

    @Test
    void theOverviewCountsAccountsByRoleAndStatus() throws Exception {
        register("s1@college.edu", "21CS001");
        register("s2@college.edu", "21CS002");
        insertUser("f1@college.edu", "FACULTY", "ACTIVE");
        insertUser("f2@college.edu", "FACULTY", "INACTIVE");
        createStaff("p1@college.edu", "RECRUITER");
        createStaff("p2@college.edu", "RECRUITER");
        UUID inactivePending = createStaff("p3@college.edu", "TP_HEAD");
        setStatus(admin, inactivePending, "INACTIVE").andExpect(status().isOk());

        mvc.perform(get("/api/v1/admin/overview").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(8))
                .andExpect(jsonPath("$.activeUsers").value(6))
                .andExpect(jsonPath("$.inactiveUsers").value(2))
                // Only active accounts count as waiting: an inactive one cannot use its link.
                .andExpect(jsonPath("$.pendingInvites").value(2))
                .andExpect(jsonPath("$.usersByRole.length()").value(5))
                .andExpect(jsonPath("$.usersByRole[?(@.role=='STUDENT')].total").value(2))
                .andExpect(jsonPath("$.usersByRole[?(@.role=='FACULTY')].total").value(2))
                .andExpect(jsonPath("$.usersByRole[?(@.role=='FACULTY')].active").value(1))
                .andExpect(jsonPath("$.usersByRole[?(@.role=='ADMIN')].total").value(1));
    }

    @Test
    void theOverviewIsForAdminsOnly() throws Exception {
        mvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());
        insertUser("faculty@college.edu", "FACULTY", "ACTIVE");
        mvc.perform(get("/api/v1/admin/overview").header("Authorization", "Bearer " + accessTokenFor("faculty@college.edu")))
                .andExpect(status().isForbidden());
    }
}
