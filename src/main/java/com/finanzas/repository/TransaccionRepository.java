package com.finanzas.repository;

import com.finanzas.model.Transaccion;
import com.finanzas.model.TipoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {
    List<Transaccion> findByPeriodoId(Long periodoId);
    List<Transaccion> findByPeriodoIdAndTipo(Long periodoId, TipoTransaccion tipo);
    List<Transaccion> findByTransaccionFijaId(Long transaccionFijaId);

    // Abonos a Meta con fecha <= hoy, para aplicar (sumar a montoAcumulado) los que ya "pasaron"
    // pero todavía no se aplicaron — ver aplicarAbonosVencidos en PeriodoServiceImpl.
    List<Transaccion> findByPeriodo_Usuario_IdAndTipoAndMetaIsNotNullAndFechaLessThanEqual(
            Long usuarioId, TipoTransaccion tipo, LocalDate fecha);
    List<Transaccion> findByCategoriaAndTipoAndPeriodo_Usuario_Id(String categoria, TipoTransaccion tipo, Long usuarioId);
    long countByCategoriaAndTipoAndPeriodo_Usuario_Id(String categoria, TipoTransaccion tipo, Long usuarioId);

    // Suma histórica (todos los períodos, no solo el actual) de los gastos vinculados a una meta
    // — el "gastado" de la meta, independiente de cuánto se abonó (montoAcumulado).
    @Query("SELECT COALESCE(SUM(t.monto), 0) FROM Transaccion t WHERE t.meta.id = :metaId AND t.tipo = 'GASTO'")
    BigDecimal sumGastadoByMetaId(@Param("metaId") Long metaId);
}
