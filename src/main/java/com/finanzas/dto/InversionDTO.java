package com.finanzas.dto;

import com.finanzas.model.TipoInversion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public class InversionDTO {

    private Long id;

    @NotBlank
    private String nombre;

    @NotNull
    private TipoInversion tipo;

    @NotNull
    @Positive
    private BigDecimal montoInvertido;

    @NotNull
    @Positive
    private BigDecimal porcentajeCartera;

    private LocalDate fechaRegistro;

    private String notas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public TipoInversion getTipo() { return tipo; }
    public void setTipo(TipoInversion tipo) { this.tipo = tipo; }
    public BigDecimal getMontoInvertido() { return montoInvertido; }
    public void setMontoInvertido(BigDecimal montoInvertido) { this.montoInvertido = montoInvertido; }
    public BigDecimal getPorcentajeCartera() { return porcentajeCartera; }
    public void setPorcentajeCartera(BigDecimal porcentajeCartera) { this.porcentajeCartera = porcentajeCartera; }
    public LocalDate getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDate fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
