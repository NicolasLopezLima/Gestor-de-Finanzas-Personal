package com.finanzas.controller;

import com.finanzas.dto.PresupuestoDTO;
import com.finanzas.service.PresupuestoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/presupuestos")
@CrossOrigin(origins = "*")
public class PresupuestoController {

    private final PresupuestoService presupuestoService;

    public PresupuestoController(PresupuestoService presupuestoService) {
        this.presupuestoService = presupuestoService;
    }

    @GetMapping
    public ResponseEntity<List<PresupuestoDTO>> listar() {
        return ResponseEntity.ok(presupuestoService.listarTodos());
    }

    @GetMapping("/{anio}/{mes}")
    public ResponseEntity<PresupuestoDTO> obtener(@PathVariable int anio, @PathVariable int mes) {
        return ResponseEntity.ok(presupuestoService.obtenerPresupuesto(anio, mes));
    }

    @PostMapping
    public ResponseEntity<PresupuestoDTO> guardar(@Valid @RequestBody PresupuestoDTO dto) {
        return ResponseEntity.ok(presupuestoService.guardarPresupuesto(dto));
    }
}
