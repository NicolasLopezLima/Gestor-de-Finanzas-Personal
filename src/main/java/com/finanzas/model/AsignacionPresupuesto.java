package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "asignaciones_presupuesto")
public class AsignacionPresupuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAsignacion tipo = TipoAsignacion.PERSONALIZADO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "presupuesto_id", nullable = false)
    private Presupuesto presupuesto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meta_id")
    private MetaFinanciera meta;

    public AsignacionPresupuesto() {}

    public Long getId() { return id; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public TipoAsignacion getTipo() { return tipo; }
    public void setTipo(TipoAsignacion tipo) { this.tipo = tipo; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public Presupuesto getPresupuesto() { return presupuesto; }
    public void setPresupuesto(Presupuesto presupuesto) { this.presupuesto = presupuesto; }
    public MetaFinanciera getMeta() { return meta; }
    public void setMeta(MetaFinanciera meta) { this.meta = meta; }
}
