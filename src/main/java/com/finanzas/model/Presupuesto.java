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
    public List<AsignacionPresupuesto> getAsignaciones() { return asignaciones; }
}
