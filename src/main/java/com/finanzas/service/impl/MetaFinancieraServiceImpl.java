package com.finanzas.service.impl;

import com.finanzas.dto.MetaFinancieraDTO;
import com.finanzas.model.EstadoMeta;
import com.finanzas.model.MetaFinanciera;
import com.finanzas.model.Usuario;
import com.finanzas.repository.MetaFinancieraRepository;
import com.finanzas.repository.UsuarioRepository;
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
    private final UsuarioRepository usuarioRepo;

    public MetaFinancieraServiceImpl(MetaFinancieraRepository metaRepo, UsuarioRepository usuarioRepo) {
        this.metaRepo = metaRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @Override
    public MetaFinancieraDTO crearMeta(MetaFinancieraDTO dto, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        MetaFinanciera meta = new MetaFinanciera();
        meta.setNombre(dto.getNombre());
        meta.setDescripcion(dto.getDescripcion());
        meta.setMontoObjetivo(dto.getMontoObjetivo());
        meta.setMontoAcumulado(BigDecimal.ZERO);
        meta.setFechaFin(dto.getFechaFin());
        meta.setEstado(EstadoMeta.ACTIVA);
        meta.setUsuario(usuario);
        return toDTO(metaRepo.save(meta));
    }

    @Override
    public MetaFinancieraDTO actualizarMeta(Long id, MetaFinancieraDTO dto, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        meta.setNombre(dto.getNombre());
        meta.setDescripcion(dto.getDescripcion());
        meta.setMontoObjetivo(dto.getMontoObjetivo());
        meta.setFechaFin(dto.getFechaFin());
        return toDTO(metaRepo.save(meta));
    }

    @Override
    public void eliminarMeta(Long id, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        metaRepo.delete(meta);
    }

    @Override
    public List<MetaFinancieraDTO> listarActivas(Long usuarioId) {
        actualizarEstadosVencidos(usuarioId);
        return metaRepo.findByEstadoAndUsuarioId(EstadoMeta.ACTIVA, usuarioId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<MetaFinancieraDTO> listarTodas(Long usuarioId) {
        actualizarEstadosVencidos(usuarioId);
        return metaRepo.findByUsuarioId(usuarioId).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public MetaFinancieraDTO abonarMonto(Long id, BigDecimal monto, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        meta.setMontoAcumulado(meta.getMontoAcumulado().add(monto));
        if (meta.getMontoAcumulado().compareTo(meta.getMontoObjetivo()) >= 0) {
            meta.setEstado(EstadoMeta.COMPLETADA);
        }
        return toDTO(metaRepo.save(meta));
    }

    private void actualizarEstadosVencidos(Long usuarioId) {
        metaRepo.findByEstadoAndUsuarioId(EstadoMeta.ACTIVA, usuarioId).forEach(meta -> {
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
