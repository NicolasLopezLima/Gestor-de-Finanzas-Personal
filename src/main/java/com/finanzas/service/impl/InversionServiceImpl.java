package com.finanzas.service.impl;

import com.finanzas.dto.InversionDTO;
import com.finanzas.model.Inversion;
import com.finanzas.model.TipoInversion;
import com.finanzas.repository.InversionRepository;
import com.finanzas.service.InversionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class InversionServiceImpl implements InversionService {

    private final InversionRepository inversionRepo;

    public InversionServiceImpl(InversionRepository inversionRepo) {
        this.inversionRepo = inversionRepo;
    }

    @Override
    public InversionDTO agregar(InversionDTO dto) {
        Inversion inv = new Inversion();
        inv.setNombre(dto.getNombre());
        inv.setTipo(dto.getTipo());
        inv.setMontoInvertido(dto.getMontoInvertido());
        inv.setPorcentajeCartera(dto.getPorcentajeCartera());
        inv.setFechaRegistro(dto.getFechaRegistro() != null ? dto.getFechaRegistro() : LocalDate.now());
        inv.setNotas(dto.getNotas());
        return toDTO(inversionRepo.save(inv));
    }

    @Override
    public InversionDTO actualizar(Long id, InversionDTO dto) {
        Inversion inv = inversionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inversión no encontrada: " + id));
        inv.setNombre(dto.getNombre());
        inv.setTipo(dto.getTipo());
        inv.setMontoInvertido(dto.getMontoInvertido());
        inv.setPorcentajeCartera(dto.getPorcentajeCartera());
        inv.setNotas(dto.getNotas());
        return toDTO(inversionRepo.save(inv));
    }

    @Override
    public void eliminar(Long id) {
        inversionRepo.deleteById(id);
    }

    @Override
    public List<InversionDTO> listarTodas() {
        return inversionRepo.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> resumenCartera() {
        List<Inversion> todas = inversionRepo.findAll();
        BigDecimal total = todas.stream()
                .map(Inversion::getMontoInvertido)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> porTipo = new LinkedHashMap<>();
        for (TipoInversion tipo : TipoInversion.values()) {
            BigDecimal suma = todas.stream()
                    .filter(i -> i.getTipo() == tipo)
                    .map(Inversion::getMontoInvertido)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            porTipo.put(tipo.name(), suma);
        }

        Map<String, BigDecimal> porcentajes = new LinkedHashMap<>();
        if (total.compareTo(BigDecimal.ZERO) > 0) {
            porTipo.forEach((tipo, monto) ->
                    porcentajes.put(tipo, monto.multiply(BigDecimal.valueOf(100))
                            .divide(total, 2, RoundingMode.HALF_UP)));
        }

        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("totalInvertido", total);
        resumen.put("montosPorTipo", porTipo);
        resumen.put("porcentajesReales", porcentajes);
        return resumen;
    }

    private InversionDTO toDTO(Inversion inv) {
        InversionDTO dto = new InversionDTO();
        dto.setId(inv.getId());
        dto.setNombre(inv.getNombre());
        dto.setTipo(inv.getTipo());
        dto.setMontoInvertido(inv.getMontoInvertido());
        dto.setPorcentajeCartera(inv.getPorcentajeCartera());
        dto.setFechaRegistro(inv.getFechaRegistro());
        dto.setNotas(inv.getNotas());
        return dto;
    }
}
