package com.finanzas.repository;

import com.finanzas.model.AbonoMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AbonoMetaRepository extends JpaRepository<AbonoMeta, Long> {
    List<AbonoMeta> findByMetaIdOrderByFechaDesc(Long metaId);
}
