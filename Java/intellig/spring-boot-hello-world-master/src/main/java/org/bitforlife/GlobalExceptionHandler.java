package org.bitforlife;

import org.bitforlife.Todo.ResourceNotFoundException;

import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleValidation(ResourceNotFoundException ex
    ) {
        String message = ex.getMessage();
        int statusCode = HttpStatus.NOT_FOUND.value();
        Map<String, String> errors = new HashMap<>(Map.of("error", message));
        errors.put("statusCode", Integer.toString(statusCode));

        return ResponseEntity.status(statusCode).body(errors);

    }
}
