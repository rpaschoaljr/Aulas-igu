package org.bitforlife.Todo;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException() {
        super("Recurso nao encontrado");
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
