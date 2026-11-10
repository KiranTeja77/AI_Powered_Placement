package com.placewise.api.common;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Renders every error as application/problem+json (RFC 9457). */
@RestControllerAdvice
class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    static ProblemDetail problem(HttpStatus status, String code, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setType(URI.create("urn:placewise:problem:" + code));
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("code", code);
        return pd;
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> handleApi(ApiException ex) {
        ProblemDetail pd = problem(ex.status(), ex.code(), ex.getMessage());
        if (!ex.fieldErrors().isEmpty()) {
            pd.setProperty("errors", ex.fieldErrors());
        }
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(ex.status());
        if (ex.retryAfterSeconds() != null) {
            builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()));
        }
        return builder.body(pd);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> handleIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(problem(HttpStatus.CONFLICT, "conflict", "The request conflicts with existing data."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpected(Exception ex) {
        log.error("Unhandled error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem(
                HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "Something went wrong on our side."));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "validation_failed", "Some fields are not valid.");
        pd.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(pd);
    }
}
