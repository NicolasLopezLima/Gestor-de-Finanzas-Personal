package com.finanzas.controller;

import com.finanzas.dto.CategoriaDTO;
import com.finanzas.service.CategoriaService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;
    private final UsuarioService usuarioService;

    public CategoriaController(CategoriaService categoriaService, UsuarioService usuarioService) {
        this.categoriaService = categoriaService;
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<CategoriaDTO>> listar() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(categoriaService.listar(uid));
    }

    @PostMapping
    public ResponseEntity<CategoriaDTO> crear(@Valid @RequestBody CategoriaDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(categoriaService.crear(dto, uid));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaDTO> editar(@PathVariable Long id, @Valid @RequestBody CategoriaDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(categoriaService.editar(id, dto, uid));
    }

    @GetMapping("/{id}/uso")
    public ResponseEntity<Long> contarUso(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(categoriaService.contarUso(id, uid));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        categoriaService.eliminar(id, uid);
        return ResponseEntity.noContent().build();
    }
}
