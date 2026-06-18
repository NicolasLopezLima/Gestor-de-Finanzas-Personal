package com.finanzas.service;

import com.finanzas.dto.MetaFinancieraDTO;
import java.math.BigDecimal;
import java.util.List;

public interface MetaFinancieraService {
    MetaFinancieraDTO crearMeta(MetaFinancieraDTO dto);
    MetaFinancieraDTO actualizarMeta(Long id, MetaFinancieraDTO dto);
    void eliminarMeta(Long id);
    List<MetaFinancieraDTO> listarActivas();
    List<MetaFinancieraDTO> listarTodas();
    MetaFinancieraDTO abonarMonto(Long id, BigDecimal monto);
}
