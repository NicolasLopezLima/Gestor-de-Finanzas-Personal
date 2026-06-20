package com.finanzas.controller;

import com.finanzas.dto.InversionDTO;
import com.finanzas.service.InversionService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inversiones")
public class InversionController {

    private final InversionService inversionService;
    private final UsuarioService usuarioService;

    public InversionController(InversionService inversionService, UsuarioService usuarioService) {
        this.inversionService = inversionService;
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<InversionDTO>> listar() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(inversionService.listarTodas(uid));
    }

    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> resumen() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(inversionService.resumenCartera(uid));
    }

    @PostMapping
    public ResponseEntity<InversionDTO> agregar(@Valid @RequestBody InversionDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(inversionService.agregar(dto, uid));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InversionDTO> actualizar(@PathVariable Long id, @Valid @RequestBody InversionDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(inversionService.actualizar(id, dto, uid));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        inversionService.eliminar(id, uid);
        return ResponseEntity.noContent().build();
    }
}
