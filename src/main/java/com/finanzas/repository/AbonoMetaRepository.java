package com.finanzas.repository;

import com.finanzas.model.AbonoMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AbonoMetaRepository extends JpaRepository<AbonoMeta, Long> {
    List<AbonoMeta> findByMetaIdOrderByFechaDesc(Long metaId);
    void deleteByMetaId(Long metaId);
    Optional<AbonoMeta> findByTransaccionId(Long transaccionId);
}
