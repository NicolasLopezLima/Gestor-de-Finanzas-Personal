package com.finanzas.exception;

import com.finanzas.dto.FilaErrorDTO;

import java.util.List;

public class ImportValidationException extends RuntimeException {

    private final List<FilaErrorDTO> filasConError;

    public ImportValidationException(String message, List<FilaErrorDTO> filasConError) {
        super(message);
        this.filasConError = filasConError;
    }

    public List<FilaErrorDTO> getFilasConError() { return filasConError; }
}
