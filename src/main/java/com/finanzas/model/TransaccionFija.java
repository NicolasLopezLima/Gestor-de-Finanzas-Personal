package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

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
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
