package com.finanzas.controller;

import com.finanzas.dto.MetaFinancieraDTO;
import com.finanzas.service.MetaFinancieraService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/metas")
@CrossOrigin(origins = "*")
public class MetaFinancieraController {

    private final MetaFinancieraService metaService;

    public MetaFinancieraController(MetaFinancieraService metaService) {
        this.metaService = metaService;
    }

    @GetMapping
    public ResponseEntity<List<MetaFinancieraDTO>> listar() {
        return ResponseEntity.ok(metaService.listarTodas());
    }

    @GetMapping("/activas")
    public ResponseEntity<List<MetaFinancieraDTO>> listarActivas() {
        return ResponseEntity.ok(metaService.listarActivas());
    }

    @PostMapping
    public ResponseEntity<MetaFinancieraDTO> crear(@Valid @RequestBody MetaFinancieraDTO dto) {
        return ResponseEntity.ok(metaService.crearMeta(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MetaFinancieraDTO> actualizar(@PathVariable Long id, @Valid @RequestBody MetaFinancieraDTO dto) {
        return ResponseEntity.ok(metaService.actualizarMeta(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        metaService.eliminarMeta(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/abonar")
    public ResponseEntity<MetaFinancieraDTO> abonar(@PathVariable Long id, @RequestBody Map<String, BigDecimal> body) {
        return ResponseEntity.ok(metaService.abonarMonto(id, body.get("monto")));
    }
}
