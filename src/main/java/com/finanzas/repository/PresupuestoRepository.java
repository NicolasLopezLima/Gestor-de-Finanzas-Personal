package com.finanzas.repository;

import com.finanzas.model.Presupuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PresupuestoRepository extends JpaRepository<Presupuesto, Long> {
    Optional<Presupuesto> findByAnioAndMes(int anio, int mes);
}
