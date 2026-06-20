package com.finanzas.controller;

import com.finanzas.model.Usuario;
import com.finanzas.service.UsuarioService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;

public class UsuarioHelper {

    public static Usuario usuarioActual(UsuarioService usuarioService) {
        OAuth2User principal = (OAuth2User) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return usuarioService.obtenerOCrear(principal);
    }
}
