package com.finanzas.service;

import com.finanzas.dto.CategoriaDTO;
import java.util.List;

public interface CategoriaService {
    List<CategoriaDTO> listar(Long usuarioId);
    CategoriaDTO crear(CategoriaDTO dto, Long usuarioId);
    CategoriaDTO editar(Long id, CategoriaDTO dto, Long usuarioId);
    long contarUso(Long id, Long usuarioId);
    void eliminar(Long id, Long usuarioId);
}
