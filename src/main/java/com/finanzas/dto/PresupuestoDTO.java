package com.finanzas.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;

public class PresupuestoDTO {

    private Long id;

    @NotNull
    private Integer anio;

    @NotNull
    private Integer mes;

    @NotNull
    @Positive
    private BigDecimal sueldo;

    private List<AsignacionDTO> asignaciones;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }
    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }
    public BigDecimal getSueldo() { return sueldo; }
    public void setSueldo(BigDecimal sueldo) { this.sueldo = sueldo; }
    public List<AsignacionDTO> getAsignaciones() { return asignaciones; }
    public void setAsignaciones(List<AsignacionDTO> asignaciones) { this.asignaciones = asignaciones; }

    public static class AsignacionDTO {
        private Long id;
        private String categoria;
        private BigDecimal monto;
        private Long metaId;
        private String metaNombre;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getCategoria() { return categoria; }
        public void setCategoria(String categoria) { this.categoria = categoria; }
        public BigDecimal getMonto() { return monto; }
        public void setMonto(BigDecimal monto) { this.monto = monto; }
        public Long getMetaId() { return metaId; }
        public void setMetaId(Long metaId) { this.metaId = metaId; }
        public String getMetaNombre() { return metaNombre; }
        public void setMetaNombre(String metaNombre) { this.metaNombre = metaNombre; }
    }
}
