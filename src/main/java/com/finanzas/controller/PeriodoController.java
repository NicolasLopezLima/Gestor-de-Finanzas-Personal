package com.finanzas.controller;

import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.service.PeriodoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/periodos")
@CrossOrigin(origins = "*")
public class PeriodoController {

    private final PeriodoService periodoService;

    public PeriodoController(PeriodoService periodoService) {
        this.periodoService = periodoService;
    }

    @GetMapping("/actual")
    public ResponseEntity<PeriodoResumenDTO> actual() {
        return ResponseEntity.ok(periodoService.obtenerOCrearPeriodoActual());
    }

    @GetMapping
    public ResponseEntity<List<PeriodoResumenDTO>> listar() {
        return ResponseEntity.ok(periodoService.listarTodos());
    }

    @GetMapping("/{anio}/{mes}")
    public ResponseEntity<PeriodoResumenDTO> obtener(@PathVariable int anio, @PathVariable int mes) {
        return ResponseEntity.ok(periodoService.obtenerPeriodo(anio, mes));
    }

    @PostMapping("/{anio}/{mes}/transacciones")
    public ResponseEntity<TransaccionDTO> agregarTransaccion(
            @PathVariable int anio,
            @PathVariable int mes,
            @Valid @RequestBody TransaccionDTO dto) {
        return ResponseEntity.ok(periodoService.agregarTransaccion(anio, mes, dto));
    }

    @DeleteMapping("/transacciones/{id}")
    public ResponseEntity<Void> eliminarTransaccion(@PathVariable Long id) {
        periodoService.eliminarTransaccion(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{anio}/{mes}/cerrar")
    public ResponseEntity<PeriodoResumenDTO> cerrar(@PathVariable int anio, @PathVariable int mes) {
        return ResponseEntity.ok(periodoService.cerrarPeriodo(anio, mes));
    }
}
