package com.finanzas.dto;

public class ConflictoImportacionDTO {

    private Long existenteId;
    private TransaccionDTO existente;
    private TransaccionDTO entrante;

    public ConflictoImportacionDTO() {}

    public ConflictoImportacionDTO(Long existenteId, TransaccionDTO existente, TransaccionDTO entrante) {
        this.existenteId = existenteId;
        this.existente = existente;
        this.entrante = entrante;
    }

    public Long getExistenteId() { return existenteId; }
    public void setExistenteId(Long existenteId) { this.existenteId = existenteId; }
    public TransaccionDTO getExistente() { return existente; }
    public void setExistente(TransaccionDTO existente) { this.existente = existente; }
    public TransaccionDTO getEntrante() { return entrante; }
    public void setEntrante(TransaccionDTO entrante) { this.entrante = entrante; }
}
