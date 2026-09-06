package com.finanzas.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String googleId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String nombre;

    // CSV de secciones (DASHBOARD, TRANSACCIONES, PRESUPUESTO, METAS, INVERSIONES) cuyo tour de
    // onboarding ya se le mostro a este usuario — persistido acá (no en localStorage) para que no
    // se resetee si cambia de dispositivo, ya que está atado al mismo usuario de Google logueado.
    @Column(nullable = true)
    private String toursVistos;

    public Usuario() {}

    public Long getId() { return id; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getToursVistos() { return toursVistos; }
    public void setToursVistos(String toursVistos) { this.toursVistos = toursVistos; }
}
