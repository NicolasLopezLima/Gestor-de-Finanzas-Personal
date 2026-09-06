package com.finanzas.dto;

import java.util.List;

public class FilaErrorDTO {

    private String tabla; // opcional: "Ingresos"/"Gastos" cuando la fila viene de tablas independientes
    private int fila;
    private List<String> errores;

    public FilaErrorDTO() {}

    public FilaErrorDTO(int fila, List<String> errores) {
        this(null, fila, errores);
    }

    public FilaErrorDTO(String tabla, int fila, List<String> errores) {
        this.tabla = tabla;
        this.fila = fila;
        this.errores = errores;
    }

    public String getTabla() { return tabla; }
    public void setTabla(String tabla) { this.tabla = tabla; }
    public int getFila() { return fila; }
    public void setFila(int fila) { this.fila = fila; }
    public List<String> getErrores() { return errores; }
    public void setErrores(List<String> errores) { this.errores = errores; }
}
