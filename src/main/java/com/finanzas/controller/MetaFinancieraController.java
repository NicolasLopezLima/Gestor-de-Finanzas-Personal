package com.finanzas.controller;

import com.finanzas.dto.AbonoMetaDTO;
import com.finanzas.dto.MetaFinancieraDTO;
import com.finanzas.dto.MetasRitmoDTO;
import com.finanzas.service.MetaFinancieraService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/metas")
public class MetaFinancieraController {

    private final MetaFinancieraService metaService;
    private final UsuarioService usuarioService;

    public MetaFinancieraController(MetaFinancieraService metaService, UsuarioService usuarioService) {
        this.metaService = metaService;
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<MetaFinancieraDTO>> listar() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.listarTodas(uid));
    }

    @GetMapping("/activas")
    public ResponseEntity<List<MetaFinancieraDTO>> listarActivas() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.listarActivas(uid));
    }

    @GetMapping("/ritmo")
    public ResponseEntity<MetasRitmoDTO> ritmo() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.obtenerResumenRitmo(uid));
    }

    @PostMapping
    public ResponseEntity<MetaFinancieraDTO> crear(@Valid @RequestBody MetaFinancieraDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.crearMeta(dto, uid));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MetaFinancieraDTO> actualizar(@PathVariable Long id, @Valid @RequestBody MetaFinancieraDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.actualizarMeta(id, dto, uid));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        metaService.eliminarMeta(id, uid);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/abonar")
    public ResponseEntity<MetaFinancieraDTO> abonar(@PathVariable Long id, @RequestBody Map<String, BigDecimal> body) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.abonarMonto(id, body.get("monto"), uid));
    }

    @GetMapping("/{id}/abonos")
    public ResponseEntity<List<AbonoMetaDTO>> listarAbonos(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.listarAbonos(id, uid));
    }

    @DeleteMapping("/{metaId}/abonos/{abonoId}")
    public ResponseEntity<Void> eliminarAbono(@PathVariable Long metaId, @PathVariable Long abonoId) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        metaService.eliminarAbono(metaId, abonoId, uid);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/automatizar")
    public ResponseEntity<MetaFinancieraDTO> automatizar(@PathVariable Long id, @RequestBody Map<String, BigDecimal> body) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.automatizarAbono(id, body.get("monto"), uid));
    }

    @PostMapping("/{id}/pausar-automatizacion")
    public ResponseEntity<MetaFinancieraDTO> pausarAutomatizacion(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(metaService.pausarAutomatizacion(id, uid));
    }
}
