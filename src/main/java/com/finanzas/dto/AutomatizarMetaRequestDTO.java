package com.finanzas.dto;

import java.math.BigDecimal;

// Body de POST /api/metas/{id}/automatizar. dia es opcional — si no viene, se usa el día de hoy
// (comportamiento de siempre); se agregó para poder elegir cualquier día del mes en el que cae
// el abono automático, en vez de quedar fijo al día en que se activó la automatización.
public class AutomatizarMetaRequestDTO {

    private BigDecimal monto;
    private Integer dia;

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public Integer getDia() { return dia; }
    public void setDia(Integer dia) { this.dia = dia; }
}
