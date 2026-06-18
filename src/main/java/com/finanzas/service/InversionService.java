package com.finanzas.service;

import com.finanzas.dto.InversionDTO;
import java.util.List;
import java.util.Map;

public interface InversionService {
    InversionDTO agregar(InversionDTO dto);
    InversionDTO actualizar(Long id, InversionDTO dto);
    void eliminar(Long id);
    List<InversionDTO> listarTodas();
    Map<String, Object> resumenCartera();
}
