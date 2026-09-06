package com.finanzas.repository;

import com.finanzas.model.PeriodoMensual;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PeriodoMensualRepository extends JpaRepository<PeriodoMensual, Long> {
    Optional<PeriodoMensual> findByAnioAndMesAndUsuarioId(int anio, int mes, Long usuarioId);
    boolean existsByAnioAndMesAndUsuarioId(int anio, int mes, Long usuarioId);
    List<PeriodoMensual> findAllByUsuarioIdOrderByAnioAscMesAsc(Long usuarioId);
}
