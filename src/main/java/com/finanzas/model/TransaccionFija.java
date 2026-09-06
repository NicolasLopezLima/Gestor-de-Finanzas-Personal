package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

@Entity
@Table(name = "transacciones_fijas")
public class TransaccionFija {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoTransaccion tipo;

    @Column(nullable = false)
    private String categoria;

    @Column(nullable = false)
    private int dia;

    @Column(nullable = false)
    private int anioInicio;

    @Column(nullable = false)
    private int mesInicio;

    @Column(nullable = false)
    private boolean activa = true;

    // Los tres campos de abajo son nuevos y nullable a propósito: las filas creadas antes de que
    // existiera la frecuencia elegible no los tienen, y bajo ddl-auto=update no se puede agregar
    // una columna NOT NULL a una tabla con filas existentes. getFrecuenciaEfectiva()/
    // getFechaInicioEfectiva() son el único lugar que debe leerse — resuelven el fallback a
    // MENSUAL usando dia/anioInicio/mesInicio para esas filas legacy.
    @Enumerated(EnumType.STRING)
    private FrecuenciaRecurrencia frecuencia;

    private LocalDate fechaInicio;

    private Integer intervaloDias; // solo tiene sentido si frecuencia == PERSONALIZADA

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Solo se completa cuando tipo == META: a qué meta contribuye esta regla recurrente.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meta_id", nullable = true)
    private MetaFinanciera meta;

    public TransaccionFija() {}

    public Long getId() { return id; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public TipoTransaccion getTipo() { return tipo; }
    public void setTipo(TipoTransaccion tipo) { this.tipo = tipo; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public int getDia() { return dia; }
    public void setDia(int dia) { this.dia = dia; }
    public int getAnioInicio() { return anioInicio; }
    public void setAnioInicio(int anioInicio) { this.anioInicio = anioInicio; }
    public int getMesInicio() { return mesInicio; }
    public void setMesInicio(int mesInicio) { this.mesInicio = mesInicio; }
    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }
    public FrecuenciaRecurrencia getFrecuencia() { return frecuencia; }
    public void setFrecuencia(FrecuenciaRecurrencia frecuencia) { this.frecuencia = frecuencia; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
    public Integer getIntervaloDias() { return intervaloDias; }
    public void setIntervaloDias(Integer intervaloDias) { this.intervaloDias = intervaloDias; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public MetaFinanciera getMeta() { return meta; }
    public void setMeta(MetaFinanciera meta) { this.meta = meta; }

    public FrecuenciaRecurrencia getFrecuenciaEfectiva() {
        return frecuencia != null ? frecuencia : FrecuenciaRecurrencia.MENSUAL;
    }

    public LocalDate getFechaInicioEfectiva() {
        if (fechaInicio != null) return fechaInicio;
        int diasEnMesInicio = YearMonth.of(anioInicio, mesInicio).lengthOfMonth();
        return LocalDate.of(anioInicio, mesInicio, Math.min(dia, diasEnMesInicio));
    }
}
