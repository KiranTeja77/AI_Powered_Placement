package com.placewise.api.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** An error that maps to an RFC 9457 problem+json response. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fieldErrors;
    private final Long retryAfterSeconds;

    public ApiException(HttpStatus status, String code, String detail,
            Map<String, String> fieldErrors, Long retryAfterSeconds) {
        super(detail);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors == null ? Map.of() : fieldErrors;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public static ApiException unauthorized(String detail) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", detail, null, null);
    }

    public static ApiException forbidden(String code, String detail) {
        return new ApiException(HttpStatus.FORBIDDEN, code, detail, null, null);
    }

    public static ApiException badRequest(String code, String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, detail, null, null);
    }

    public static ApiException conflict(String detail, Map<String, String> fieldErrors) {
        return new ApiException(HttpStatus.CONFLICT, "conflict", detail, fieldErrors, null);
    }

    public static ApiException invalid(String detail, Map<String, String> fieldErrors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation_failed", detail, fieldErrors, null);
    }

    public static ApiException notFound(String detail) {
        return new ApiException(HttpStatus.NOT_FOUND, "not_found", detail, null, null);
    }

    /** A dependency (such as the resume analyzer) is down; tell the client when to try again. */
    public static ApiException unavailable(String code, String detail, long retryAfterSeconds) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, code, detail, null, retryAfterSeconds);
    }

    public static ApiException tooManyRequests(String detail, long retryAfterSeconds) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "too_many_attempts", detail, null,
                retryAfterSeconds);
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public Map<String, String> fieldErrors() {
        return fieldErrors;
    }

    public Long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
