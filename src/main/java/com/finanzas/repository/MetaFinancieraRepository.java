package com.finanzas.repository;

import com.finanzas.model.EstadoMeta;
import com.finanzas.model.MetaFinanciera;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MetaFinancieraRepository extends JpaRepository<MetaFinanciera, Long> {
    List<MetaFinanciera> findByEstado(EstadoMeta estado);
}
