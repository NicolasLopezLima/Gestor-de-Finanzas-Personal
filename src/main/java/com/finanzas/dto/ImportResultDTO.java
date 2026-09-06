package com.finanzas.dto;

public class ImportResultDTO {

    private int importadas;
    private PeriodoResumenDTO periodo;

    public int getImportadas() { return importadas; }
    public void setImportadas(int importadas) { this.importadas = importadas; }
    public PeriodoResumenDTO getPeriodo() { return periodo; }
    public void setPeriodo(PeriodoResumenDTO periodo) { this.periodo = periodo; }
}
