package com.finanzas.dto;

import java.util.List;

public class DeteccionHistoricoDTO {

    private List<HojaDetectadaDTO> hojas = List.of();
    private boolean requiereMapeo;
    private List<String> encabezadosReferencia = List.of();
    private boolean requiereAnioComun;

    public List<HojaDetectadaDTO> getHojas() { return hojas; }
    public void setHojas(List<HojaDetectadaDTO> hojas) { this.hojas = hojas; }
    public boolean isRequiereMapeo() { return requiereMapeo; }
    public void setRequiereMapeo(boolean requiereMapeo) { this.requiereMapeo = requiereMapeo; }
    public List<String> getEncabezadosReferencia() { return encabezadosReferencia; }
    public void setEncabezadosReferencia(List<String> encabezadosReferencia) { this.encabezadosReferencia = encabezadosReferencia; }
    public boolean isRequiereAnioComun() { return requiereAnioComun; }
    public void setRequiereAnioComun(boolean requiereAnioComun) { this.requiereAnioComun = requiereAnioComun; }
}
