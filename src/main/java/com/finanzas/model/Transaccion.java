package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transacciones")
public class Transaccion {

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
    private LocalDate fecha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "periodo_id", nullable = false)
    private PeriodoMensual periodo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaccion_fija_id", nullable = true)
    private TransaccionFija transaccionFija;

    // Solo se completa cuando tipo == META: identifica a qué meta corresponde este abono.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meta_id", nullable = true)
    private MetaFinanciera meta;

    public Transaccion() {}

    public Long getId() { return id; }
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
    public PeriodoMensual getPeriodo() { return periodo; }
    public void setPeriodo(PeriodoMensual periodo) { this.periodo = periodo; }
    public TransaccionFija getTransaccionFija() { return transaccionFija; }
    public void setTransaccionFija(TransaccionFija transaccionFija) { this.transaccionFija = transaccionFija; }
    public MetaFinanciera getMeta() { return meta; }
    public void setMeta(MetaFinanciera meta) { this.meta = meta; }
}
