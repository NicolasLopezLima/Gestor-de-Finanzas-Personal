package com.finanzas.repository;

import com.finanzas.model.Presupuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PresupuestoRepository extends JpaRepository<Presupuesto, Long> {
    Optional<Presupuesto> findByAnioAndMesAndUsuarioId(int anio, int mes, Long usuarioId);
}
