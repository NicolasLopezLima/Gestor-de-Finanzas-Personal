package com.finanzas.controller;

import com.finanzas.cotizaciones.CotizacionService;
import com.finanzas.dto.CotizacionDTO;
import com.finanzas.dto.EvolucionDTO;
import com.finanzas.dto.InversionDTO;
import com.finanzas.dto.TickerSugeridoDTO;
import com.finanzas.model.MercadoInversion;
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
    private final CotizacionService cotizacionService;

    public InversionController(InversionService inversionService, UsuarioService usuarioService, CotizacionService cotizacionService) {
        this.inversionService = inversionService;
        this.usuarioService = usuarioService;
        this.cotizacionService = cotizacionService;
    }

    @GetMapping("/buscar-tickers")
    public ResponseEntity<List<TickerSugeridoDTO>> buscarTickers(@RequestParam String q) {
        return ResponseEntity.ok(cotizacionService.buscarTickers(q));
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

    @GetMapping("/cotizaciones")
    public ResponseEntity<List<CotizacionDTO>> cotizaciones() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(inversionService.obtenerCotizaciones(uid));
    }

    @GetMapping("/evolucion")
    public ResponseEntity<EvolucionDTO> evolucion(@RequestParam String mercado, @RequestParam String periodo) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(inversionService.obtenerEvolucion(uid, MercadoInversion.valueOf(mercado.toUpperCase()), periodo.toUpperCase()));
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
