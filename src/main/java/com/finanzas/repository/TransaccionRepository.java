package com.finanzas.repository;

import com.finanzas.model.Transaccion;
import com.finanzas.model.TipoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {
    List<Transaccion> findByPeriodoId(Long periodoId);
    List<Transaccion> findByPeriodoIdAndTipo(Long periodoId, TipoTransaccion tipo);
}
