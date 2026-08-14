package com.finanzas.service;

import com.finanzas.dto.DeteccionHistoricoDTO;
import com.finanzas.dto.ImportConfirmacionRequestDTO;
import com.finanzas.dto.ImportResultDTO;
import com.finanzas.dto.ImportacionResponseDTO;
import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.SeleccionHojaDTO;
import com.finanzas.dto.SeleccionMapeoDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.model.MetaFinanciera;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PeriodoService {
    PeriodoResumenDTO obtenerPeriodo(int anio, int mes, Long usuarioId);
    TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto, Long usuarioId);
    TransaccionDTO editarTransaccion(Long transaccionId, TransaccionDTO dto, Long usuarioId);
    void eliminarTransaccion(Long transaccionId, Long usuarioId);
    void cancelarRecurrencia(Long transaccionId, Long usuarioId);

    /**
     * Registra un abono a una meta como una Transaccion real de tipo META en el período de
     * "fecha" (afecta Disponible, se ve en Ingresos & Gastos), y actualiza el progreso de la meta
     * (montoAcumulado/estado/AbonoMeta). Única vía por la que se crea una transacción de tipo
     * META — no se expone como tipo elegible en el alta genérica de transacciones.
     */
    void registrarAbonoMeta(MetaFinanciera meta, BigDecimal monto, LocalDate fecha, Long usuarioId);
    PeriodoResumenDTO cerrarPeriodo(int anio, int mes, Long usuarioId);
    byte[] generarExportacionHistorica(Long usuarioId);
    ImportacionResponseDTO importarTransacciones(int anio, int mes, InputStream excel, String nombreArchivo, Long usuarioId);
    ImportacionResponseDTO importarTransaccionesConMapeo(int anio, int mes, InputStream excel, String nombreArchivo,
                                                          SeleccionMapeoDTO seleccion, Long usuarioId);
    ImportResultDTO confirmarImportacion(int anio, int mes, ImportConfirmacionRequestDTO request, Long usuarioId);

    DeteccionHistoricoDTO detectarHistorico(InputStream excel, String nombreArchivo, Long usuarioId);
    ImportacionResponseDTO importarHistorico(List<SeleccionHojaDTO> seleccion, SeleccionMapeoDTO mapeoOpcional,
                                              InputStream excel, String nombreArchivo, Long usuarioId);
    ImportResultDTO confirmarImportacionHistorico(ImportConfirmacionRequestDTO request, Long usuarioId);

    /**
     * Promedio de (ingresos - gastos) de los últimos hasta 6 meses ya completos (no cuenta el
     * mes actual, todavía en curso) con al menos un período cargado. Devuelve {@code null} si
     * no hay ningún mes completo con datos — nunca un promedio inventado sobre cero meses.
     */
    BigDecimal obtenerDisponibleMensualPromedio(Long usuarioId);
}
