package com.finanzas.service;

import com.finanzas.dto.PresupuestoDTO;

public interface PresupuestoService {
    PresupuestoDTO guardarPresupuesto(PresupuestoDTO dto, Long usuarioId);
    PresupuestoDTO obtenerPresupuesto(int anio, int mes, Long usuarioId);
}
