package com.finanzas.service.impl;

import com.finanzas.dto.PresupuestoDTO;
import com.finanzas.model.AsignacionPresupuesto;
import com.finanzas.model.MetaFinanciera;
import com.finanzas.model.Presupuesto;
import com.finanzas.model.Usuario;
import com.finanzas.repository.MetaFinancieraRepository;
import com.finanzas.repository.PresupuestoRepository;
import com.finanzas.repository.UsuarioRepository;
import com.finanzas.service.PresupuestoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class PresupuestoServiceImpl implements PresupuestoService {

    private final PresupuestoRepository presupuestoRepo;
    private final MetaFinancieraRepository metaRepo;
    private final UsuarioRepository usuarioRepo;

    public PresupuestoServiceImpl(PresupuestoRepository presupuestoRepo,
                                   MetaFinancieraRepository metaRepo,
                                   UsuarioRepository usuarioRepo) {
        this.presupuestoRepo = presupuestoRepo;
        this.metaRepo = metaRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @Override
    public PresupuestoDTO guardarPresupuesto(PresupuestoDTO dto, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));

        Presupuesto presupuesto = presupuestoRepo.findByAnioAndMesAndUsuarioId(dto.getAnio(), dto.getMes(), usuarioId)
                .orElse(new Presupuesto());

        presupuesto.setAnio(dto.getAnio());
        presupuesto.setMes(dto.getMes());
        presupuesto.setSueldo(dto.getSueldo());
        presupuesto.setUsuario(usuario);
        presupuesto.getAsignaciones().clear();

        if (dto.getAsignaciones() != null) {
            for (PresupuestoDTO.AsignacionDTO a : dto.getAsignaciones()) {
                AsignacionPresupuesto asig = new AsignacionPresupuesto();
                asig.setCategoria(a.getCategoria());
                asig.setMonto(a.getMonto());
                asig.setTipo(a.getTipo() != null
                        ? com.finanzas.model.TipoAsignacion.valueOf(a.getTipo())
                        : com.finanzas.model.TipoAsignacion.PERSONALIZADO);
                asig.setPresupuesto(presupuesto);
                if (a.getMetaId() != null) {
                    MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(a.getMetaId(), usuarioId).orElse(null);
                    asig.setMeta(meta);
                }
                presupuesto.getAsignaciones().add(asig);
            }
        }

        return toDTO(presupuestoRepo.save(presupuesto));
    }

    @Override
    public PresupuestoDTO obtenerPresupuesto(int anio, int mes, Long usuarioId) {
        Presupuesto p = presupuestoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Presupuesto no encontrado: " + anio + "/" + mes));
        return toDTO(p);
    }

    private PresupuestoDTO toDTO(Presupuesto p) {
        PresupuestoDTO dto = new PresupuestoDTO();
        dto.setId(p.getId());
        dto.setAnio(p.getAnio());
        dto.setMes(p.getMes());
        dto.setSueldo(p.getSueldo());

        List<PresupuestoDTO.AsignacionDTO> asigs = new ArrayList<>();
        for (AsignacionPresupuesto a : p.getAsignaciones()) {
            PresupuestoDTO.AsignacionDTO adto = new PresupuestoDTO.AsignacionDTO();
            adto.setId(a.getId());
            adto.setCategoria(a.getCategoria());
            adto.setMonto(a.getMonto());
            adto.setTipo(a.getTipo() != null ? a.getTipo().name() : "PERSONALIZADO");
            if (a.getMeta() != null) {
                adto.setMetaId(a.getMeta().getId());
                adto.setMetaNombre(a.getMeta().getNombre());
            }
            asigs.add(adto);
        }
        dto.setAsignaciones(asigs);
        return dto;
    }
}
