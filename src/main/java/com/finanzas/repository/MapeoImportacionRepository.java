package com.finanzas.repository;

import com.finanzas.model.MapeoImportacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MapeoImportacionRepository extends JpaRepository<MapeoImportacion, Long> {
    Optional<MapeoImportacion> findByUsuarioIdAndFirmaEncabezados(Long usuarioId, String firmaEncabezados);
}
