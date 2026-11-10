package com.placewise.api.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class TestMailConfig {

    @Bean
    @Primary
    RecordingMailer recordingMailer() {
        return new RecordingMailer();
    }
}
