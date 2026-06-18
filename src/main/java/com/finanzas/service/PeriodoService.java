package com.finanzas.service;

import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.TransaccionDTO;
import java.util.List;

public interface PeriodoService {
    PeriodoResumenDTO obtenerOCrearPeriodoActual();
    PeriodoResumenDTO obtenerPeriodo(int anio, int mes);
    List<PeriodoResumenDTO> listarTodos();
    TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto);
    void eliminarTransaccion(Long transaccionId);
    PeriodoResumenDTO cerrarPeriodo(int anio, int mes);
}
