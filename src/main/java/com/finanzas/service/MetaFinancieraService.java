package com.finanzas.service;

import com.finanzas.dto.MetaFinancieraDTO;
import java.math.BigDecimal;
import java.util.List;

public interface MetaFinancieraService {
    MetaFinancieraDTO crearMeta(MetaFinancieraDTO dto, Long usuarioId);
    MetaFinancieraDTO actualizarMeta(Long id, MetaFinancieraDTO dto, Long usuarioId);
    void eliminarMeta(Long id, Long usuarioId);
    List<MetaFinancieraDTO> listarActivas(Long usuarioId);
    List<MetaFinancieraDTO> listarTodas(Long usuarioId);
    MetaFinancieraDTO abonarMonto(Long id, BigDecimal monto, Long usuarioId);
}
