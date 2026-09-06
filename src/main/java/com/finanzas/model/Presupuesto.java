package com.finanzas.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "presupuestos")
public class Presupuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int anio;

    @Column(nullable = false)
    private int mes;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal sueldo;

    // Nullable a propósito: se agregó después de que ya existían presupuestos guardados, y
    // ddl-auto=update no puede agregar una columna NOT NULL a una tabla con filas. Un valor
    // null se interpreta como CINCUENTA_TREINTA_VEINTE (el comportamiento de antes de este
    // campo existir) en PresupuestoServiceImpl.toDTO.
    @Enumerated(EnumType.STRING)
    private TipoRegla tipoRegla;

    @Column(precision = 5, scale = 2)
    private BigDecimal porcentajeAhorroPersonalizado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = true)
    private Usuario usuario;

    @OneToMany(mappedBy = "presupuesto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AsignacionPresupuesto> asignaciones = new ArrayList<>();

    public Presupuesto() {}

    public Long getId() { return id; }
    public int getAnio() { return anio; }
    public void setAnio(int anio) { this.anio = anio; }
    public int getMes() { return mes; }
    public void setMes(int mes) { this.mes = mes; }
    public BigDecimal getSueldo() { return sueldo; }
    public void setSueldo(BigDecimal sueldo) { this.sueldo = sueldo; }
    public TipoRegla getTipoRegla() { return tipoRegla; }
    public void setTipoRegla(TipoRegla tipoRegla) { this.tipoRegla = tipoRegla; }
    public BigDecimal getPorcentajeAhorroPersonalizado() { return porcentajeAhorroPersonalizado; }
    public void setPorcentajeAhorroPersonalizado(BigDecimal porcentajeAhorroPersonalizado) { this.porcentajeAhorroPersonalizado = porcentajeAhorroPersonalizado; }
    public List<AsignacionPresupuesto> getAsignaciones() { return asignaciones; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
