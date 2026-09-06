package com.finanzas.dto;

/** Ritmo de ahorro de una meta activa: qué % del ritmo necesario para llegar a tiempo estás logrando. */
public class MetaRitmoDetalleDTO {

    private String nombre;
    private int porcentajeRitmo;

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public int getPorcentajeRitmo() { return porcentajeRitmo; }
    public void setPorcentajeRitmo(int porcentajeRitmo) { this.porcentajeRitmo = porcentajeRitmo; }
}
