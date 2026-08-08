package com.finanzas.dto;

import com.finanzas.model.TipoTransaccion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public class TransaccionDTO {

    private Long id;

    @NotBlank
    private String descripcion;

    @NotNull
    @Positive
    private BigDecimal monto;

    @NotNull
    private TipoTransaccion tipo;

    @NotBlank
    private String categoria;

    @NotNull
    private LocalDate fecha;

    private Long periodoId;

    private Long transaccionFijaId; // solo lectura, lo completa el servidor

    private boolean repetirTodosLosMeses; // solo se lee al crear (agregarTransaccion)

    // frecuencia/intervaloDias viajan en ambos sentidos: al crear (agregarTransaccion) los lee el
    // servidor si repetirTodosLosMeses es true; al leer (toDTO) el servidor los completa desde la
    // TransaccionFija vinculada, para que el frontend pueda mostrar la frecuencia real al editar.
    private String frecuencia; // nombre de FrecuenciaRecurrencia; null si no es recurrente
    private Integer intervaloDias; // solo tiene valor si frecuencia == "PERSONALIZADA"

    private Long metaId; // solo tiene sentido si tipo == META — a qué meta corresponde el abono

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public TipoTransaccion getTipo() { return tipo; }
    public void setTipo(TipoTransaccion tipo) { this.tipo = tipo; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public Long getPeriodoId() { return periodoId; }
    public void setPeriodoId(Long periodoId) { this.periodoId = periodoId; }
    public Long getTransaccionFijaId() { return transaccionFijaId; }
    public void setTransaccionFijaId(Long transaccionFijaId) { this.transaccionFijaId = transaccionFijaId; }
    public boolean isRepetirTodosLosMeses() { return repetirTodosLosMeses; }
    public void setRepetirTodosLosMeses(boolean repetirTodosLosMeses) { this.repetirTodosLosMeses = repetirTodosLosMeses; }
    public String getFrecuencia() { return frecuencia; }
    public void setFrecuencia(String frecuencia) { this.frecuencia = frecuencia; }
    public Integer getIntervaloDias() { return intervaloDias; }
    public void setIntervaloDias(Integer intervaloDias) { this.intervaloDias = intervaloDias; }
    public Long getMetaId() { return metaId; }
    public void setMetaId(Long metaId) { this.metaId = metaId; }
}
