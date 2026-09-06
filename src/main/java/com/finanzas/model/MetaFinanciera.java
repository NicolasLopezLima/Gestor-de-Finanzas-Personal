package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "metas_financieras")
public class MetaFinanciera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal montoObjetivo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal montoAcumulado = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDate fechaFin;

    // Nullable a propósito: se agregó después de que ya existían metas guardadas, y
    // ddl-auto=update no puede agregar una columna NOT NULL a una tabla con filas. Para metas
    // viejas sin este dato, el cálculo de ritmo de ahorro usa como respaldo la fecha del abono
    // más antiguo (ver MetaFinancieraServiceImpl.obtenerResumenRitmo).
    private LocalDate fechaCreacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoMeta estado = EstadoMeta.ACTIVA;

    @Column(length = 50)
    private String icono;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = true)
    private Usuario usuario;

    public MetaFinanciera() {}

    public Long getId() { return id; }
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
    public LocalDate getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDate fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public EstadoMeta getEstado() { return estado; }
    public void setEstado(EstadoMeta estado) { this.estado = estado; }
    public String getIcono() { return icono; }
    public void setIcono(String icono) { this.icono = icono; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
