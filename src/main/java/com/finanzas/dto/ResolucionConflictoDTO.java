package com.finanzas.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public class ResolucionConflictoDTO {

    @NotNull
    private Long existenteId;

    @NotNull
    @Valid
    private TransaccionDTO entrante;

    @NotNull
    private AccionConflicto accion;

    public Long getExistenteId() { return existenteId; }
    public void setExistenteId(Long existenteId) { this.existenteId = existenteId; }
    public TransaccionDTO getEntrante() { return entrante; }
    public void setEntrante(TransaccionDTO entrante) { this.entrante = entrante; }
    public AccionConflicto getAccion() { return accion; }
    public void setAccion(AccionConflicto accion) { this.accion = accion; }
}
