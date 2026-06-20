package com.finanzas.controller;

import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.model.Usuario;
import com.finanzas.service.PeriodoService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/periodos")
public class PeriodoController {

    private final PeriodoService periodoService;
    private final UsuarioService usuarioService;

    public PeriodoController(PeriodoService periodoService, UsuarioService usuarioService) {
        this.periodoService = periodoService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/{anio}/{mes}")
    public ResponseEntity<PeriodoResumenDTO> obtener(@PathVariable int anio, @PathVariable int mes) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.obtenerPeriodo(anio, mes, uid));
    }

    @PostMapping("/{anio}/{mes}/transacciones")
    public ResponseEntity<TransaccionDTO> agregarTransaccion(
            @PathVariable int anio,
            @PathVariable int mes,
            @Valid @RequestBody TransaccionDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.agregarTransaccion(anio, mes, dto, uid));
    }

    @DeleteMapping("/transacciones/{id}")
    public ResponseEntity<Void> eliminarTransaccion(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        periodoService.eliminarTransaccion(id, uid);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{anio}/{mes}/cerrar")
    public ResponseEntity<PeriodoResumenDTO> cerrar(@PathVariable int anio, @PathVariable int mes) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.cerrarPeriodo(anio, mes, uid));
    }
}
