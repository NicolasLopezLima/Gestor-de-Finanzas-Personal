package com.finanzas.repository;

import com.finanzas.model.Inversion;
import com.finanzas.model.TipoInversion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InversionRepository extends JpaRepository<Inversion, Long> {
    List<Inversion> findByUsuarioId(Long usuarioId);
    List<Inversion> findByTipoAndUsuarioId(TipoInversion tipo, Long usuarioId);
    Optional<Inversion> findByIdAndUsuarioId(Long id, Long usuarioId);
}
