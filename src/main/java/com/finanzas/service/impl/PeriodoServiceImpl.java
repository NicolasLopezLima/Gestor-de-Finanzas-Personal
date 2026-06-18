package com.finanzas.service.impl;

import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.model.PeriodoMensual;
import com.finanzas.model.TipoTransaccion;
import com.finanzas.model.Transaccion;
import com.finanzas.repository.PeriodoMensualRepository;
import com.finanzas.repository.TransaccionRepository;
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

    public PeriodoServiceImpl(PeriodoMensualRepository periodoRepo, TransaccionRepository transaccionRepo) {
        this.periodoRepo = periodoRepo;
        this.transaccionRepo = transaccionRepo;
    }

    @Override
    public PeriodoResumenDTO obtenerOCrearPeriodoActual() {
        LocalDate hoy = LocalDate.now();
        PeriodoMensual periodo = periodoRepo.findByAnioAndMes(hoy.getYear(), hoy.getMonthValue())
                .orElseGet(() -> {
                    PeriodoMensual nuevo = new PeriodoMensual(hoy.getYear(), hoy.getMonthValue());
                    return periodoRepo.save(nuevo);
                });
        return toResumenDTO(periodo);
    }

    @Override
    public PeriodoResumenDTO obtenerPeriodo(int anio, int mes) {
        PeriodoMensual periodo = periodoRepo.findByAnioAndMes(anio, mes)
                .orElseThrow(() -> new IllegalArgumentException("Periodo no encontrado: " + anio + "/" + mes));
        return toResumenDTO(periodo);
    }

    @Override
    public List<PeriodoResumenDTO> listarTodos() {
        return periodoRepo.findAll().stream()
                .map(this::toResumenDTO)
                .collect(Collectors.toList());
    }

    @Override
    public TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto) {
        PeriodoMensual periodo = periodoRepo.findByAnioAndMes(anio, mes)
                .orElseGet(() -> periodoRepo.save(new PeriodoMensual(anio, mes)));

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

        Transaccion guardada = transaccionRepo.save(t);
        return toDTO(guardada);
    }

    @Override
    public void eliminarTransaccion(Long transaccionId) {
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaccion no encontrada: " + transaccionId));
        if (t.getPeriodo().isCerrado()) {
            throw new IllegalStateException("No se puede eliminar una transaccion de un periodo cerrado.");
        }
        transaccionRepo.delete(t);
    }

    @Override
    public PeriodoResumenDTO cerrarPeriodo(int anio, int mes) {
        PeriodoMensual periodo = periodoRepo.findByAnioAndMes(anio, mes)
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
