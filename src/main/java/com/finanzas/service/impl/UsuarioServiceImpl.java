package com.finanzas.service.impl;

import com.finanzas.model.Usuario;
import com.finanzas.repository.UsuarioRepository;
import com.finanzas.service.UsuarioService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepo;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepo) {
        this.usuarioRepo = usuarioRepo;
    }

    @Override
    public Usuario obtenerOCrear(OAuth2User oauth2User) {
        String googleId = oauth2User.getAttribute("sub");
        return usuarioRepo.findByGoogleId(googleId).orElseGet(() -> {
            Usuario nuevo = new Usuario();
            nuevo.setGoogleId(googleId);
            nuevo.setEmail(oauth2User.getAttribute("email"));
            nuevo.setNombre(oauth2User.getAttribute("name"));
            return usuarioRepo.save(nuevo);
        });
    }

    @Override
    public Usuario obtenerPorGoogleId(String googleId) {
        return usuarioRepo.findByGoogleId(googleId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + googleId));
    }
}
