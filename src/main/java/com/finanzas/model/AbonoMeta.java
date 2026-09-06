package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "abonos_meta")
public class AbonoMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meta_id", nullable = false)
    private MetaFinanciera meta;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false)
    private LocalDateTime fecha;

    // Nullable: vincula el abono con la Transaccion que generó (para poder revertir ambos juntos
    // al deshacer). Los abonos de antes de esta funcionalidad quedan con transaccion = null.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaccion_id", nullable = true)
    private Transaccion transaccion;

    public AbonoMeta() {}

    public Long getId() { return id; }
    public MetaFinanciera getMeta() { return meta; }
    public void setMeta(MetaFinanciera meta) { this.meta = meta; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Transaccion getTransaccion() { return transaccion; }
    public void setTransaccion(Transaccion transaccion) { this.transaccion = transaccion; }
}
