package com.finanzas.controller;

import com.finanzas.model.Usuario;
import com.finanzas.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        Usuario u = UsuarioHelper.usuarioActual(usuarioService);
        return ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "nombre", u.getNombre(),
                "email", u.getEmail(),
                "toursVistos", toursVistosComoLista(u)
        ));
    }

    @PostMapping("/tours-vistos/{seccion}")
    public ResponseEntity<Void> marcarTourVisto(@PathVariable String seccion) {
        Usuario u = UsuarioHelper.usuarioActual(usuarioService);
        usuarioService.marcarTourVisto(u.getId(), seccion);
        return ResponseEntity.noContent().build();
    }

    private List<String> toursVistosComoLista(Usuario u) {
        String csv = u.getToursVistos();
        return csv == null || csv.isBlank() ? List.of() : Arrays.asList(csv.split(","));
    }
}
