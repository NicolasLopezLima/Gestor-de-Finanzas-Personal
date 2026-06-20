package com.finanzas.controller;

import com.finanzas.dto.PresupuestoDTO;
import com.finanzas.service.PresupuestoService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/presupuestos")
public class PresupuestoController {

    private final PresupuestoService presupuestoService;
    private final UsuarioService usuarioService;

    public PresupuestoController(PresupuestoService presupuestoService, UsuarioService usuarioService) {
        this.presupuestoService = presupuestoService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/{anio}/{mes}")
    public ResponseEntity<PresupuestoDTO> obtener(@PathVariable int anio, @PathVariable int mes) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(presupuestoService.obtenerPresupuesto(anio, mes, uid));
    }

    @PostMapping
    public ResponseEntity<PresupuestoDTO> guardar(@Valid @RequestBody PresupuestoDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(presupuestoService.guardarPresupuesto(dto, uid));
    }
}
