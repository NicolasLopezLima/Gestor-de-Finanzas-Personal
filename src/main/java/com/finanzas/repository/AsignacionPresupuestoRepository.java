package com.finanzas.repository;

import com.finanzas.model.AsignacionPresupuesto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AsignacionPresupuestoRepository extends JpaRepository<AsignacionPresupuesto, Long> {
    List<AsignacionPresupuesto> findByMetaId(Long metaId);
}
