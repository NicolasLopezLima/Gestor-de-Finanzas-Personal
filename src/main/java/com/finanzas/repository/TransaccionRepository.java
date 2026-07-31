package com.finanzas.repository;

import com.finanzas.model.Transaccion;
import com.finanzas.model.TipoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {
    List<Transaccion> findByPeriodoId(Long periodoId);
    List<Transaccion> findByPeriodoIdAndTipo(Long periodoId, TipoTransaccion tipo);
    List<Transaccion> findByTransaccionFijaId(Long transaccionFijaId);
    List<Transaccion> findByCategoriaAndTipoAndPeriodo_Usuario_Id(String categoria, TipoTransaccion tipo, Long usuarioId);
    long countByCategoriaAndTipoAndPeriodo_Usuario_Id(String categoria, TipoTransaccion tipo, Long usuarioId);
}
