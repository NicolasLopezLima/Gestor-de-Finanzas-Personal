package com.finanzas.service.impl;

import com.finanzas.dto.CategoriaDTO;
import com.finanzas.model.Categoria;
import com.finanzas.model.TipoTransaccion;
import com.finanzas.model.Transaccion;
import com.finanzas.model.TransaccionFija;
import com.finanzas.model.Usuario;
import com.finanzas.repository.CategoriaRepository;
import com.finanzas.repository.TransaccionFijaRepository;
import com.finanzas.repository.TransaccionRepository;
import com.finanzas.repository.UsuarioRepository;
import com.finanzas.service.CategoriaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoriaServiceImpl implements CategoriaService {

    /** Mismas categorías/íconos que estaban hardcodeados en el frontend hasta ahora. */
    private static final Map<String, String> DEFAULT_INGRESO = new LinkedHashMap<>();
    private static final Map<String, String> DEFAULT_GASTO = new LinkedHashMap<>();
    static {
        DEFAULT_INGRESO.put("Sueldo", "payments");
        DEFAULT_INGRESO.put("Freelance", "laptop_mac");
        DEFAULT_INGRESO.put("Inversiones", "trending_up");
        DEFAULT_INGRESO.put("Alquiler cobrado", "home");
        DEFAULT_INGRESO.put("Bono", "redeem");
        DEFAULT_INGRESO.put("Regalo", "redeem");
        DEFAULT_INGRESO.put("Otros ingresos", "add_circle");

        DEFAULT_GASTO.put("Alimentación", "shopping_cart");
        DEFAULT_GASTO.put("Transporte", "directions_car");
        DEFAULT_GASTO.put("Vivienda", "home");
        DEFAULT_GASTO.put("Salud", "medical_services");
        DEFAULT_GASTO.put("Educación", "school");
        DEFAULT_GASTO.put("Ropa", "checkroom");
        DEFAULT_GASTO.put("Entretenimiento", "movie");
        DEFAULT_GASTO.put("Servicios", "lightbulb");
        DEFAULT_GASTO.put("Restaurantes", "restaurant");
        DEFAULT_GASTO.put("Tecnología", "computer");
        DEFAULT_GASTO.put("Viajes", "flight");
        DEFAULT_GASTO.put("Deporte", "sports_soccer");
        DEFAULT_GASTO.put("Seguros", "shield");
        DEFAULT_GASTO.put("Otros gastos", "remove_circle");
    }

    private final CategoriaRepository categoriaRepo;
    private final UsuarioRepository usuarioRepo;
    private final TransaccionRepository transaccionRepo;
    private final TransaccionFijaRepository transaccionFijaRepo;

    public CategoriaServiceImpl(CategoriaRepository categoriaRepo, UsuarioRepository usuarioRepo,
                                 TransaccionRepository transaccionRepo, TransaccionFijaRepository transaccionFijaRepo) {
        this.categoriaRepo = categoriaRepo;
        this.usuarioRepo = usuarioRepo;
        this.transaccionRepo = transaccionRepo;
        this.transaccionFijaRepo = transaccionFijaRepo;
    }

    @Override
    public List<CategoriaDTO> listar(Long usuarioId) {
        List<Categoria> categorias = categoriaRepo.findByUsuarioIdOrderByTipoAscNombreAsc(usuarioId);
        if (categorias.isEmpty()) {
            categorias = sembrarDefault(usuarioId);
        }
        return categorias.stream().map(this::toDTO).collect(Collectors.toList());
    }

    private List<Categoria> sembrarDefault(Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        List<Categoria> nuevas = new java.util.ArrayList<>();
        DEFAULT_INGRESO.forEach((nombre, icono) -> nuevas.add(nuevaCategoria(nombre, TipoTransaccion.INGRESO, icono, usuario)));
        DEFAULT_GASTO.forEach((nombre, icono) -> nuevas.add(nuevaCategoria(nombre, TipoTransaccion.GASTO, icono, usuario)));
        return categoriaRepo.saveAll(nuevas);
    }

    private Categoria nuevaCategoria(String nombre, TipoTransaccion tipo, String icono, Usuario usuario) {
        Categoria c = new Categoria();
        c.setNombre(nombre);
        c.setTipo(tipo);
        c.setIcono(icono);
        c.setUsuario(usuario);
        return c;
    }

    @Override
    public CategoriaDTO crear(CategoriaDTO dto, Long usuarioId) {
        if (categoriaRepo.existsByUsuarioIdAndTipoAndNombreIgnoreCase(usuarioId, dto.getTipo(), dto.getNombre().trim())) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre.");
        }
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        Categoria c = nuevaCategoria(dto.getNombre().trim(), dto.getTipo(), dto.getIcono(), usuario);
        return toDTO(categoriaRepo.save(c));
    }

    @Override
    public CategoriaDTO editar(Long id, CategoriaDTO dto, Long usuarioId) {
        Categoria c = obtenerPropia(id, usuarioId);
        String nombreNuevo = dto.getNombre().trim();

        if (!nombreNuevo.equalsIgnoreCase(c.getNombre())
                && categoriaRepo.existsByUsuarioIdAndTipoAndNombreIgnoreCase(usuarioId, c.getTipo(), nombreNuevo)) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre.");
        }

        if (!nombreNuevo.equalsIgnoreCase(c.getNombre())) {
            String nombreViejo = c.getNombre();
            List<Transaccion> afectadas = transaccionRepo.findByCategoriaAndTipoAndPeriodo_Usuario_Id(nombreViejo, c.getTipo(), usuarioId);
            afectadas.forEach(t -> t.setCategoria(nombreNuevo));
            transaccionRepo.saveAll(afectadas);

            List<TransaccionFija> fijasAfectadas = transaccionFijaRepo.findByUsuarioIdAndTipoAndCategoria(usuarioId, c.getTipo(), nombreViejo);
            fijasAfectadas.forEach(f -> f.setCategoria(nombreNuevo));
            transaccionFijaRepo.saveAll(fijasAfectadas);
        }

        c.setNombre(nombreNuevo);
        c.setIcono(dto.getIcono());
        return toDTO(categoriaRepo.save(c));
    }

    @Override
    public long contarUso(Long id, Long usuarioId) {
        Categoria c = obtenerPropia(id, usuarioId);
        return transaccionRepo.countByCategoriaAndTipoAndPeriodo_Usuario_Id(c.getNombre(), c.getTipo(), usuarioId);
    }

    @Override
    public void eliminar(Long id, Long usuarioId) {
        Categoria c = obtenerPropia(id, usuarioId);
        categoriaRepo.delete(c);
    }

    private Categoria obtenerPropia(Long id, Long usuarioId) {
        Categoria c = categoriaRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada: " + id));
        if (!c.getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado");
        }
        return c;
    }

    private CategoriaDTO toDTO(Categoria c) {
        CategoriaDTO dto = new CategoriaDTO();
        dto.setId(c.getId());
        dto.setNombre(c.getNombre());
        dto.setTipo(c.getTipo());
        dto.setIcono(c.getIcono());
        return dto;
    }
}
