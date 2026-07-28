package com.finanzas.dto;

import java.util.List;

public class ImportacionResponseDTO {

    private boolean requiereResolucion;
    private ImportResultDTO resultado;
    private ImportPreviewDTO preview;
    private boolean requiereMapeo;
    private List<String> encabezadosDetectados;

    public ImportacionResponseDTO() {}

    public ImportacionResponseDTO(boolean requiereResolucion, ImportResultDTO resultado, ImportPreviewDTO preview) {
        this.requiereResolucion = requiereResolucion;
        this.resultado = resultado;
        this.preview = preview;
    }

    public static ImportacionResponseDTO requiereMapeo(List<String> encabezadosDetectados) {
        ImportacionResponseDTO dto = new ImportacionResponseDTO();
        dto.requiereMapeo = true;
        dto.encabezadosDetectados = encabezadosDetectados;
        return dto;
    }

    public boolean isRequiereResolucion() { return requiereResolucion; }
    public void setRequiereResolucion(boolean requiereResolucion) { this.requiereResolucion = requiereResolucion; }
    public ImportResultDTO getResultado() { return resultado; }
    public void setResultado(ImportResultDTO resultado) { this.resultado = resultado; }
    public ImportPreviewDTO getPreview() { return preview; }
    public void setPreview(ImportPreviewDTO preview) { this.preview = preview; }
    public boolean isRequiereMapeo() { return requiereMapeo; }
    public void setRequiereMapeo(boolean requiereMapeo) { this.requiereMapeo = requiereMapeo; }
    public List<String> getEncabezadosDetectados() { return encabezadosDetectados; }
    public void setEncabezadosDetectados(List<String> encabezadosDetectados) { this.encabezadosDetectados = encabezadosDetectados; }
}
