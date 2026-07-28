package com.finanzas.service;

import com.finanzas.dto.ImportConfirmacionRequestDTO;
import com.finanzas.dto.ImportResultDTO;
import com.finanzas.dto.ImportacionResponseDTO;
import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.SeleccionMapeoDTO;
import com.finanzas.dto.TransaccionDTO;
import java.io.InputStream;

public interface PeriodoService {
    PeriodoResumenDTO obtenerPeriodo(int anio, int mes, Long usuarioId);
    TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto, Long usuarioId);
    TransaccionDTO editarTransaccion(Long transaccionId, TransaccionDTO dto, Long usuarioId);
    void eliminarTransaccion(Long transaccionId, Long usuarioId);
    PeriodoResumenDTO cerrarPeriodo(int anio, int mes, Long usuarioId);
    byte[] generarPlantillaTransacciones(int anio, int mes, Long usuarioId);
    ImportacionResponseDTO importarTransacciones(int anio, int mes, InputStream excel, String nombreArchivo, Long usuarioId);
    ImportacionResponseDTO importarTransaccionesConMapeo(int anio, int mes, InputStream excel, String nombreArchivo,
                                                          SeleccionMapeoDTO seleccion, Long usuarioId);
    ImportResultDTO confirmarImportacion(int anio, int mes, ImportConfirmacionRequestDTO request, Long usuarioId);
}
