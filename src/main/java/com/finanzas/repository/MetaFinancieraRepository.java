package com.finanzas.repository;

import com.finanzas.model.EstadoMeta;
import com.finanzas.model.MetaFinanciera;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MetaFinancieraRepository extends JpaRepository<MetaFinanciera, Long> {
    List<MetaFinanciera> findByUsuarioId(Long usuarioId);
    List<MetaFinanciera> findByEstadoAndUsuarioId(EstadoMeta estado, Long usuarioId);
    Optional<MetaFinanciera> findByIdAndUsuarioId(Long id, Long usuarioId);
}
