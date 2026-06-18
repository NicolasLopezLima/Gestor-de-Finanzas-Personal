package com.finanzas.dto;

import java.math.BigDecimal;
import java.util.List;

public class PeriodoResumenDTO {

    private Long id;
    private int anio;
    private int mes;
    private boolean cerrado;
    private BigDecimal totalIngresos;
    private BigDecimal totalGastos;
    private BigDecimal balance;
    private List<TransaccionDTO> transacciones;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public int getAnio() { return anio; }
    public void setAnio(int anio) { this.anio = anio; }
    public int getMes() { return mes; }
    public void setMes(int mes) { this.mes = mes; }
    public boolean isCerrado() { return cerrado; }
    public void setCerrado(boolean cerrado) { this.cerrado = cerrado; }
    public BigDecimal getTotalIngresos() { return totalIngresos; }
    public void setTotalIngresos(BigDecimal totalIngresos) { this.totalIngresos = totalIngresos; }
    public BigDecimal getTotalGastos() { return totalGastos; }
    public void setTotalGastos(BigDecimal totalGastos) { this.totalGastos = totalGastos; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public List<TransaccionDTO> getTransacciones() { return transacciones; }
    public void setTransacciones(List<TransaccionDTO> transacciones) { this.transacciones = transacciones; }
}
