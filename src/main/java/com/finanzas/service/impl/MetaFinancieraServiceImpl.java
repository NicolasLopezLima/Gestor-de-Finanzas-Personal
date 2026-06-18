package com.finanzas.service.impl;

import com.finanzas.dto.MetaFinancieraDTO;
import com.finanzas.model.EstadoMeta;
import com.finanzas.model.MetaFinanciera;
import com.finanzas.repository.MetaFinancieraRepository;
import com.finanzas.service.MetaFinancieraService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MetaFinancieraServiceImpl implements MetaFinancieraService {

    private final MetaFinancieraRepository metaRepo;

    public MetaFinancieraServiceImpl(MetaFinancieraRepository metaRepo) {
        this.metaRepo = metaRepo;
    }

    @Override
    public MetaFinancieraDTO crearMeta(MetaFinancieraDTO dto) {
        MetaFinanciera meta = new MetaFinanciera();
        meta.setNombre(dto.getNombre());
        meta.setDescripcion(dto.getDescripcion());
        meta.setMontoObjetivo(dto.getMontoObjetivo());
        meta.setMontoAcumulado(BigDecimal.ZERO);
        meta.setFechaFin(dto.getFechaFin());
        meta.setEstado(EstadoMeta.ACTIVA);
        return toDTO(metaRepo.save(meta));
    }

    @Override
    public MetaFinancieraDTO actualizarMeta(Long id, MetaFinancieraDTO dto) {
        MetaFinanciera meta = metaRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        meta.setNombre(dto.getNombre());
        meta.setDescripcion(dto.getDescripcion());
        meta.setMontoObjetivo(dto.getMontoObjetivo());
        meta.setFechaFin(dto.getFechaFin());
        return toDTO(metaRepo.save(meta));
    }

    @Override
    public void eliminarMeta(Long id) {
        metaRepo.deleteById(id);
    }

    @Override
    public List<MetaFinancieraDTO> listarActivas() {
        actualizarEstadosVencidos();
        return metaRepo.findByEstado(EstadoMeta.ACTIVA).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<MetaFinancieraDTO> listarTodas() {
        actualizarEstadosVencidos();
        return metaRepo.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public MetaFinancieraDTO abonarMonto(Long id, BigDecimal monto) {
        MetaFinanciera meta = metaRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        meta.setMontoAcumulado(meta.getMontoAcumulado().add(monto));
        if (meta.getMontoAcumulado().compareTo(meta.getMontoObjetivo()) >= 0) {
            meta.setEstado(EstadoMeta.COMPLETADA);
        }
        return toDTO(metaRepo.save(meta));
    }

    private void actualizarEstadosVencidos() {
        metaRepo.findByEstado(EstadoMeta.ACTIVA).forEach(meta -> {
            if (meta.getFechaFin().isBefore(LocalDate.now())
                    && meta.getMontoAcumulado().compareTo(meta.getMontoObjetivo()) < 0) {
                meta.setEstado(EstadoMeta.VENCIDA);
                metaRepo.save(meta);
            }
        });
    }

    private MetaFinancieraDTO toDTO(MetaFinanciera m) {
        MetaFinancieraDTO dto = new MetaFinancieraDTO();
        dto.setId(m.getId());
        dto.setNombre(m.getNombre());
        dto.setDescripcion(m.getDescripcion());
        dto.setMontoObjetivo(m.getMontoObjetivo());
        dto.setMontoAcumulado(m.getMontoAcumulado());
        dto.setFechaFin(m.getFechaFin());
        dto.setEstado(m.getEstado());
        int progreso = m.getMontoObjetivo().compareTo(BigDecimal.ZERO) > 0
                ? m.getMontoAcumulado().multiply(BigDecimal.valueOf(100))
                        .divide(m.getMontoObjetivo(), 0, RoundingMode.DOWN).intValue()
                : 0;
        dto.setPorcentajeProgreso(Math.min(progreso, 100));
        return dto;
    }
}
