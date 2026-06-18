package com.finanzas.service;

import com.finanzas.dto.PresupuestoDTO;
import java.util.List;

public interface PresupuestoService {
    PresupuestoDTO guardarPresupuesto(PresupuestoDTO dto);
    PresupuestoDTO obtenerPresupuesto(int anio, int mes);
    List<PresupuestoDTO> listarTodos();
}
