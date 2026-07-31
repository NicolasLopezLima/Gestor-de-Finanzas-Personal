package com.finanzas.repository;

import com.finanzas.model.Categoria;
import com.finanzas.model.TipoTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findByUsuarioIdOrderByTipoAscNombreAsc(Long usuarioId);
    boolean existsByUsuarioIdAndTipoAndNombreIgnoreCase(Long usuarioId, TipoTransaccion tipo, String nombre);
}
