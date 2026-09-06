package com.finanzas.dto;

import java.math.BigDecimal;
import java.util.List;

public class CotizacionDTO {

    private Long inversionId;
    private String ticker;
    private String mercado;
    private BigDecimal precioActual;
    private BigDecimal variacionDiariaPct;
    private BigDecimal valorMercado;
    private BigDecimal gananciaPerdida;
    private BigDecimal gananciaPerdidaPct;
    private boolean disponible;
    private String mensaje;
    private List<BigDecimal> historico = List.of();

    public Long getInversionId() { return inversionId; }
    public void setInversionId(Long inversionId) { this.inversionId = inversionId; }
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
    public String getMercado() { return mercado; }
    public void setMercado(String mercado) { this.mercado = mercado; }
    public BigDecimal getPrecioActual() { return precioActual; }
    public void setPrecioActual(BigDecimal precioActual) { this.precioActual = precioActual; }
    public BigDecimal getVariacionDiariaPct() { return variacionDiariaPct; }
    public void setVariacionDiariaPct(BigDecimal variacionDiariaPct) { this.variacionDiariaPct = variacionDiariaPct; }
    public BigDecimal getValorMercado() { return valorMercado; }
    public void setValorMercado(BigDecimal valorMercado) { this.valorMercado = valorMercado; }
    public BigDecimal getGananciaPerdida() { return gananciaPerdida; }
    public void setGananciaPerdida(BigDecimal gananciaPerdida) { this.gananciaPerdida = gananciaPerdida; }
    public BigDecimal getGananciaPerdidaPct() { return gananciaPerdidaPct; }
    public void setGananciaPerdidaPct(BigDecimal gananciaPerdidaPct) { this.gananciaPerdidaPct = gananciaPerdidaPct; }
    public boolean isDisponible() { return disponible; }
    public void setDisponible(boolean disponible) { this.disponible = disponible; }
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public List<BigDecimal> getHistorico() { return historico; }
    public void setHistorico(List<BigDecimal> historico) { this.historico = historico; }
}
