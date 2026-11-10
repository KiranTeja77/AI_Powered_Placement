package com.placewise.api.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = {
        "app.admin.email=First.Admin@College.edu",
        "app.admin.password=Adm1nSecret99"
})
class AdminSeederIntegrationTest extends IntegrationTestBase {

    @Autowired AdminSeeder seeder;

    @Test
    void createsTheFirstAdminFromConfigurationOnce() throws Exception {
        // The base class empties the tables before each test, so run the seeder as startup would.
        seeder.run(null);
        seeder.run(null);

        assertThat(jdbc.queryForObject("select count(*) from app_user where role = 'ADMIN'", Integer.class)).isEqualTo(1);
        mvc.perform(login("first.admin@college.edu", "Adm1nSecret99", "10.9.1.1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void neverOverwritesAnExistingAccount() throws Exception {
        insertUser("first.admin@college.edu", "FACULTY", "ACTIVE");
        seeder.run(null);
        assertThat(jdbc.queryForObject("select role from app_user", String.class)).isEqualTo("FACULTY");
        mvc.perform(login("first.admin@college.edu", PASSWORD, "10.9.1.2")).andExpect(status().isOk());
    }
}
