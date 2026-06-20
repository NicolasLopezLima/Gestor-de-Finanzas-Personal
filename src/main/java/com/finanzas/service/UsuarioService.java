package com.finanzas.service;

import com.finanzas.model.Usuario;
import org.springframework.security.oauth2.core.user.OAuth2User;

public interface UsuarioService {
    Usuario obtenerOCrear(OAuth2User oauth2User);
    Usuario obtenerPorGoogleId(String googleId);
}
