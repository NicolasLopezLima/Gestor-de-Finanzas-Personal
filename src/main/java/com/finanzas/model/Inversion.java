package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "inversiones")
public class Inversion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoInversion tipo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal montoInvertido;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeCartera;

    @Column(nullable = false)
    private LocalDate fechaRegistro;

    @Column(length = 500)
    private String notas;

    @Column(length = 20)
    private String ticker;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MercadoInversion mercado;

    @Column(precision = 15, scale = 4)
    private BigDecimal cantidad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = true)
    private Usuario usuario;

    public Inversion() {}

    public Long getId() { return id; }
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
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
    public MercadoInversion getMercado() { return mercado; }
    public void setMercado(MercadoInversion mercado) { this.mercado = mercado; }
    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
