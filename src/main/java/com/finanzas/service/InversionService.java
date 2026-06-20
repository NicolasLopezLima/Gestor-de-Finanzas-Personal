package com.finanzas.service;

import com.finanzas.dto.InversionDTO;
import java.util.List;
import java.util.Map;

public interface InversionService {
    InversionDTO agregar(InversionDTO dto, Long usuarioId);
    InversionDTO actualizar(Long id, InversionDTO dto, Long usuarioId);
    void eliminar(Long id, Long usuarioId);
    List<InversionDTO> listarTodas(Long usuarioId);
    Map<String, Object> resumenCartera(Long usuarioId);
}
