package com.placewise.api.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * 401 and 403 responses for requests rejected by the security filter chain, as problem+json.
 * Bodies are built from constants only; no request data is echoed back.
 */
@Component
class ProblemSecurityHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        write(response, 401, "Unauthorized", "unauthorized", "Sign in to continue.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {
        write(response, 403, "Forbidden", "forbidden", "You do not have access to this resource.");
    }

    private static void write(HttpServletResponse response, int status, String title, String code,
            String detail) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"type\":\"urn:placewise:problem:" + code + "\",\"title\":\"" + title
                + "\",\"status\":" + status + ",\"detail\":\"" + detail + "\",\"code\":\"" + code + "\"}");
    }
}
