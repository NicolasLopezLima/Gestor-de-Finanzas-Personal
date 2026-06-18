package com.finanzas.controller;

import com.finanzas.dto.InversionDTO;
import com.finanzas.service.InversionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inversiones")
@CrossOrigin(origins = "*")
public class InversionController {

    private final InversionService inversionService;

    public InversionController(InversionService inversionService) {
        this.inversionService = inversionService;
    }

    @GetMapping
    public ResponseEntity<List<InversionDTO>> listar() {
        return ResponseEntity.ok(inversionService.listarTodas());
    }

    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> resumen() {
        return ResponseEntity.ok(inversionService.resumenCartera());
    }

    @PostMapping
    public ResponseEntity<InversionDTO> agregar(@Valid @RequestBody InversionDTO dto) {
        return ResponseEntity.ok(inversionService.agregar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InversionDTO> actualizar(@PathVariable Long id, @Valid @RequestBody InversionDTO dto) {
        return ResponseEntity.ok(inversionService.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        inversionService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
