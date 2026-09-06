package com.finanzas.dto;

public class SeleccionHojaDTO {

    private String nombreHoja;
    private int anio;
    private int mes;
    private boolean incluir;

    public String getNombreHoja() { return nombreHoja; }
    public void setNombreHoja(String nombreHoja) { this.nombreHoja = nombreHoja; }
    public int getAnio() { return anio; }
    public void setAnio(int anio) { this.anio = anio; }
    public int getMes() { return mes; }
    public void setMes(int mes) { this.mes = mes; }
    public boolean isIncluir() { return incluir; }
    public void setIncluir(boolean incluir) { this.incluir = incluir; }
}
