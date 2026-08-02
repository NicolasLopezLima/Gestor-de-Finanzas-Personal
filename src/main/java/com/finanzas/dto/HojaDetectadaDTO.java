package com.finanzas.dto;

public class HojaDetectadaDTO {

    private String nombreHoja;
    private Integer anioInferido;
    private Integer mesInferido;
    private boolean incluir;
    private boolean pareceTransacciones;

    public String getNombreHoja() { return nombreHoja; }
    public void setNombreHoja(String nombreHoja) { this.nombreHoja = nombreHoja; }
    public Integer getAnioInferido() { return anioInferido; }
    public void setAnioInferido(Integer anioInferido) { this.anioInferido = anioInferido; }
    public Integer getMesInferido() { return mesInferido; }
    public void setMesInferido(Integer mesInferido) { this.mesInferido = mesInferido; }
    public boolean isIncluir() { return incluir; }
    public void setIncluir(boolean incluir) { this.incluir = incluir; }
    public boolean isPareceTransacciones() { return pareceTransacciones; }
    public void setPareceTransacciones(boolean pareceTransacciones) { this.pareceTransacciones = pareceTransacciones; }
}
