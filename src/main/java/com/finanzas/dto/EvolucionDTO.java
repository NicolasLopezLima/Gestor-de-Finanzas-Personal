package com.finanzas.dto;

import java.math.BigDecimal;
import java.util.List;

public class EvolucionDTO {

    private String mercado;
    private String periodo;
    private List<Long> timestamps = List.of();
    private List<BigDecimal> valoresPct = List.of();
    private BigDecimal variacionTotalPct;
    private boolean disponible;
    private String mensaje;

    public String getMercado() { return mercado; }
    public void setMercado(String mercado) { this.mercado = mercado; }
    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }
    public List<Long> getTimestamps() { return timestamps; }
    public void setTimestamps(List<Long> timestamps) { this.timestamps = timestamps; }
    public List<BigDecimal> getValoresPct() { return valoresPct; }
    public void setValoresPct(List<BigDecimal> valoresPct) { this.valoresPct = valoresPct; }
    public BigDecimal getVariacionTotalPct() { return variacionTotalPct; }
    public void setVariacionTotalPct(BigDecimal variacionTotalPct) { this.variacionTotalPct = variacionTotalPct; }
    public boolean isDisponible() { return disponible; }
    public void setDisponible(boolean disponible) { this.disponible = disponible; }
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
}
