package com.finanzas.repository;

import com.finanzas.model.TransaccionFija;
import com.finanzas.model.TipoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransaccionFijaRepository extends JpaRepository<TransaccionFija, Long> {
    List<TransaccionFija> findByUsuarioIdAndActivaTrue(Long usuarioId);
    List<TransaccionFija> findByUsuarioIdAndTipoAndCategoria(Long usuarioId, TipoTransaccion tipo, String categoria);
}
