package com.finanzas.service;

import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.TransaccionDTO;
import java.util.List;

public interface PeriodoService {
    PeriodoResumenDTO obtenerPeriodo(int anio, int mes, Long usuarioId);
    TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto, Long usuarioId);
    void eliminarTransaccion(Long transaccionId, Long usuarioId);
    PeriodoResumenDTO cerrarPeriodo(int anio, int mes, Long usuarioId);
}
