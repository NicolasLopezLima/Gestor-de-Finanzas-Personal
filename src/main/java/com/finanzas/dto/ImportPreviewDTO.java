package com.finanzas.dto;

import java.util.List;

public class ImportPreviewDTO {

    private int totalFilasLeidas;
    private List<TransaccionDTO> nuevas;
    private List<ConflictoImportacionDTO> conflictos;

    public ImportPreviewDTO() {}

    public ImportPreviewDTO(int totalFilasLeidas, List<TransaccionDTO> nuevas, List<ConflictoImportacionDTO> conflictos) {
        this.totalFilasLeidas = totalFilasLeidas;
        this.nuevas = nuevas;
        this.conflictos = conflictos;
    }

    public int getTotalFilasLeidas() { return totalFilasLeidas; }
    public void setTotalFilasLeidas(int totalFilasLeidas) { this.totalFilasLeidas = totalFilasLeidas; }
    public List<TransaccionDTO> getNuevas() { return nuevas; }
    public void setNuevas(List<TransaccionDTO> nuevas) { this.nuevas = nuevas; }
    public List<ConflictoImportacionDTO> getConflictos() { return conflictos; }
    public void setConflictos(List<ConflictoImportacionDTO> conflictos) { this.conflictos = conflictos; }
}
