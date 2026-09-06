package com.finanzas.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AbonoMetaDTO {

    private Long id;
    private BigDecimal monto;
    private LocalDateTime fecha;
    private Long transaccionId; // null en abonos de antes de esta funcionalidad

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Long getTransaccionId() { return transaccionId; }
    public void setTransaccionId(Long transaccionId) { this.transaccionId = transaccionId; }
}
