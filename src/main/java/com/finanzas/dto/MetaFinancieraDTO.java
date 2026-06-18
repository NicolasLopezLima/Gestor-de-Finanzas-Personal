package com.finanzas.dto;

import com.finanzas.model.EstadoMeta;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public class MetaFinancieraDTO {

    private Long id;

    @NotBlank
    private String nombre;

    private String descripcion;

    @NotNull
    @Positive
    private BigDecimal montoObjetivo;

    private BigDecimal montoAcumulado;

    @NotNull
    @Future
    private LocalDate fechaFin;

    private EstadoMeta estado;

    private int porcentajeProgreso;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMontoObjetivo() { return montoObjetivo; }
    public void setMontoObjetivo(BigDecimal montoObjetivo) { this.montoObjetivo = montoObjetivo; }
    public BigDecimal getMontoAcumulado() { return montoAcumulado; }
    public void setMontoAcumulado(BigDecimal montoAcumulado) { this.montoAcumulado = montoAcumulado; }
    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
    public EstadoMeta getEstado() { return estado; }
    public void setEstado(EstadoMeta estado) { this.estado = estado; }
    public int getPorcentajeProgreso() { return porcentajeProgreso; }
    public void setPorcentajeProgreso(int porcentajeProgreso) { this.porcentajeProgreso = porcentajeProgreso; }
}
