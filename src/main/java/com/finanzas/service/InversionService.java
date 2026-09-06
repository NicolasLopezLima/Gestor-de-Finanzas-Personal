package com.finanzas.service;

import com.finanzas.dto.CotizacionDTO;
import com.finanzas.dto.EvolucionDTO;
import com.finanzas.dto.InversionDTO;
import com.finanzas.model.MercadoInversion;
import java.util.List;
import java.util.Map;

public interface InversionService {
    InversionDTO agregar(InversionDTO dto, Long usuarioId);
    InversionDTO actualizar(Long id, InversionDTO dto, Long usuarioId);
    void eliminar(Long id, Long usuarioId);
    List<InversionDTO> listarTodas(Long usuarioId);
    Map<String, Object> resumenCartera(Long usuarioId);
    List<CotizacionDTO> obtenerCotizaciones(Long usuarioId);
    EvolucionDTO obtenerEvolucion(Long usuarioId, MercadoInversion mercado, String periodo);
}
