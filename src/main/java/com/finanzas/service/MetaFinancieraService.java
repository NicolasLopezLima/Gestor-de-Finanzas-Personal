package com.finanzas.service;

import com.finanzas.dto.AbonoMetaDTO;
import com.finanzas.dto.MetaFinancieraDTO;
import com.finanzas.dto.MetasRitmoDTO;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface MetaFinancieraService {
    MetaFinancieraDTO crearMeta(MetaFinancieraDTO dto, Long usuarioId);
    MetaFinancieraDTO actualizarMeta(Long id, MetaFinancieraDTO dto, Long usuarioId);
    void eliminarMeta(Long id, Long usuarioId);
    List<MetaFinancieraDTO> listarActivas(Long usuarioId);
    List<MetaFinancieraDTO> listarTodas(Long usuarioId);
    // fecha: null usa hoy — permite cargar un abono de un día anterior que se haya pasado de registrar.
    MetaFinancieraDTO abonarMonto(Long id, BigDecimal monto, LocalDate fecha, Long usuarioId);
    List<AbonoMetaDTO> listarAbonos(Long metaId, Long usuarioId);
    void eliminarAbono(Long metaId, Long abonoId, Long usuarioId);
    MetaFinancieraDTO automatizarAbono(Long id, BigDecimal monto, Long usuarioId);
    MetaFinancieraDTO pausarAutomatizacion(Long id, Long usuarioId);
    MetasRitmoDTO obtenerResumenRitmo(Long usuarioId);
}
