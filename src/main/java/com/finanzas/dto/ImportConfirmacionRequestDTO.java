package com.finanzas.dto;

import jakarta.validation.Valid;

import java.util.List;

public class ImportConfirmacionRequestDTO {

    @Valid
    private List<TransaccionDTO> nuevas;

    @Valid
    private List<ResolucionConflictoDTO> resoluciones;

    public List<TransaccionDTO> getNuevas() { return nuevas; }
    public void setNuevas(List<TransaccionDTO> nuevas) { this.nuevas = nuevas; }
    public List<ResolucionConflictoDTO> getResoluciones() { return resoluciones; }
    public void setResoluciones(List<ResolucionConflictoDTO> resoluciones) { this.resoluciones = resoluciones; }
}
