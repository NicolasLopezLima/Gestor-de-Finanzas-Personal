package com.finanzas.service.impl;

import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.model.PeriodoMensual;
import com.finanzas.model.TipoTransaccion;
import com.finanzas.model.Transaccion;
import com.finanzas.model.Usuario;
import com.finanzas.repository.PeriodoMensualRepository;
import com.finanzas.repository.TransaccionRepository;
import com.finanzas.repository.UsuarioRepository;
import com.finanzas.service.PeriodoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PeriodoServiceImpl implements PeriodoService {

    private final PeriodoMensualRepository periodoRepo;
    private final TransaccionRepository transaccionRepo;
    private final UsuarioRepository usuarioRepo;

    public PeriodoServiceImpl(PeriodoMensualRepository periodoRepo,
                              TransaccionRepository transaccionRepo,
                              UsuarioRepository usuarioRepo) {
        this.periodoRepo = periodoRepo;
        this.transaccionRepo = transaccionRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @Override
    public PeriodoResumenDTO obtenerPeriodo(int anio, int mes, Long usuarioId) {
        PeriodoMensual periodo = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Periodo no encontrado: " + anio + "/" + mes));
        return toResumenDTO(periodo);
    }

    @Override
    public TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));

        PeriodoMensual periodo = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId)
                .orElseGet(() -> {
                    PeriodoMensual nuevo = new PeriodoMensual(anio, mes);
                    nuevo.setUsuario(usuario);
                    return periodoRepo.save(nuevo);
                });

        if (periodo.isCerrado()) {
            throw new IllegalStateException("El periodo está cerrado y no acepta nuevas transacciones.");
        }

        Transaccion t = new Transaccion();
        t.setDescripcion(dto.getDescripcion());
        t.setMonto(dto.getMonto());
        t.setTipo(dto.getTipo());
        t.setCategoria(dto.getCategoria());
        t.setFecha(dto.getFecha() != null ? dto.getFecha() : LocalDate.now());
        t.setPeriodo(periodo);

        return toDTO(transaccionRepo.save(t));
    }

    @Override
    public void eliminarTransaccion(Long transaccionId, Long usuarioId) {
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaccion no encontrada: " + transaccionId));
        if (!t.getPeriodo().getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado");
        }
        if (t.getPeriodo().isCerrado()) {
            throw new IllegalStateException("No se puede eliminar una transaccion de un periodo cerrado.");
        }
        transaccionRepo.delete(t);
    }

    @Override
    public PeriodoResumenDTO cerrarPeriodo(int anio, int mes, Long usuarioId) {
        PeriodoMensual periodo = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Periodo no encontrado: " + anio + "/" + mes));
        periodo.setCerrado(true);
        return toResumenDTO(periodoRepo.save(periodo));
    }

    private PeriodoResumenDTO toResumenDTO(PeriodoMensual periodo) {
        List<Transaccion> transacciones = transaccionRepo.findByPeriodoId(periodo.getId());

        BigDecimal ingresos = transacciones.stream()
                .filter(t -> t.getTipo() == TipoTransaccion.INGRESO)
                .map(Transaccion::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal gastos = transacciones.stream()
                .filter(t -> t.getTipo() == TipoTransaccion.GASTO)
                .map(Transaccion::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PeriodoResumenDTO dto = new PeriodoResumenDTO();
        dto.setId(periodo.getId());
        dto.setAnio(periodo.getAnio());
        dto.setMes(periodo.getMes());
        dto.setCerrado(periodo.isCerrado());
        dto.setTotalIngresos(ingresos);
        dto.setTotalGastos(gastos);
        dto.setBalance(ingresos.subtract(gastos));
        dto.setTransacciones(transacciones.stream().map(this::toDTO).collect(Collectors.toList()));
        return dto;
    }

    private TransaccionDTO toDTO(Transaccion t) {
        TransaccionDTO dto = new TransaccionDTO();
        dto.setId(t.getId());
        dto.setDescripcion(t.getDescripcion());
        dto.setMonto(t.getMonto());
        dto.setTipo(t.getTipo());
        dto.setCategoria(t.getCategoria());
        dto.setFecha(t.getFecha());
        dto.setPeriodoId(t.getPeriodo().getId());
        return dto;
    }
}
