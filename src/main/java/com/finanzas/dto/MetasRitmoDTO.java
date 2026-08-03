package com.finanzas.dto;

import java.math.BigDecimal;
import java.util.List;

public class MetasRitmoDTO {

    private int metasActivasTotal;
    private int metasActivasConDatos;
    private int metasATiempo;
    private List<MetaRitmoDetalleDTO> detalle;

    // null cuando no hay suficiente historial de Transacciones para estimarlo (nunca un
    // promedio inventado sobre cero meses).
    private BigDecimal disponibleMensualPromedio;
    private BigDecimal ritmoNecesarioTotal;
    // null cuando disponibleMensualPromedio es null (no se puede comparar sin ese dato).
    private Boolean alcanzaParaTodas;

    public int getMetasActivasTotal() { return metasActivasTotal; }
    public void setMetasActivasTotal(int metasActivasTotal) { this.metasActivasTotal = metasActivasTotal; }
    public int getMetasActivasConDatos() { return metasActivasConDatos; }
    public void setMetasActivasConDatos(int metasActivasConDatos) { this.metasActivasConDatos = metasActivasConDatos; }
    public int getMetasATiempo() { return metasATiempo; }
    public void setMetasATiempo(int metasATiempo) { this.metasATiempo = metasATiempo; }
    public List<MetaRitmoDetalleDTO> getDetalle() { return detalle; }
    public void setDetalle(List<MetaRitmoDetalleDTO> detalle) { this.detalle = detalle; }
    public BigDecimal getDisponibleMensualPromedio() { return disponibleMensualPromedio; }
    public void setDisponibleMensualPromedio(BigDecimal disponibleMensualPromedio) { this.disponibleMensualPromedio = disponibleMensualPromedio; }
    public BigDecimal getRitmoNecesarioTotal() { return ritmoNecesarioTotal; }
    public void setRitmoNecesarioTotal(BigDecimal ritmoNecesarioTotal) { this.ritmoNecesarioTotal = ritmoNecesarioTotal; }
    public Boolean getAlcanzaParaTodas() { return alcanzaParaTodas; }
    public void setAlcanzaParaTodas(Boolean alcanzaParaTodas) { this.alcanzaParaTodas = alcanzaParaTodas; }
}
