package com.finanzas.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Body de POST /api/metas/{id}/abonar. fecha es opcional — si no viene, se abona con la fecha
// de hoy (comportamiento de siempre); se agregó para poder cargar un abono de un día anterior
// que se haya pasado de registrar en su momento.
public class AbonoRequestDTO {

    private BigDecimal monto;
    private LocalDate fecha;

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
}
