package com.finanzas.dto;

import com.finanzas.model.TipoTransaccion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CategoriaDTO {

    private Long id;

    @NotBlank
    private String nombre;

    @NotNull
    private TipoTransaccion tipo;

    @NotBlank
    private String icono;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public TipoTransaccion getTipo() { return tipo; }
    public void setTipo(TipoTransaccion tipo) { this.tipo = tipo; }
    public String getIcono() { return icono; }
    public void setIcono(String icono) { this.icono = icono; }
}
