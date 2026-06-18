package com.finanzas.repository;

import com.finanzas.model.Inversion;
import com.finanzas.model.TipoInversion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InversionRepository extends JpaRepository<Inversion, Long> {
    List<Inversion> findByTipo(TipoInversion tipo);
}
