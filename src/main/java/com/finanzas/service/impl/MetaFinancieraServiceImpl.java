package com.finanzas.service.impl;

import com.finanzas.dto.AbonoMetaDTO;
import com.finanzas.dto.MetaFinancieraDTO;
import com.finanzas.dto.MetaRitmoDetalleDTO;
import com.finanzas.dto.MetasRitmoDTO;
import com.finanzas.model.AbonoMeta;
import com.finanzas.model.EstadoMeta;
import com.finanzas.model.MetaFinanciera;
import com.finanzas.model.Usuario;
import com.finanzas.model.AsignacionPresupuesto;
import com.finanzas.model.FrecuenciaRecurrencia;
import com.finanzas.model.TipoTransaccion;
import com.finanzas.model.TransaccionFija;
import com.finanzas.repository.AbonoMetaRepository;
import com.finanzas.repository.AsignacionPresupuestoRepository;
import com.finanzas.repository.MetaFinancieraRepository;
import com.finanzas.repository.TransaccionFijaRepository;
import com.finanzas.repository.TransaccionRepository;
import com.finanzas.repository.UsuarioRepository;
import com.finanzas.service.MetaFinancieraService;
import com.finanzas.service.PeriodoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class MetaFinancieraServiceImpl implements MetaFinancieraService {

    private final MetaFinancieraRepository metaRepo;
    private final UsuarioRepository usuarioRepo;
    private final AbonoMetaRepository abonoRepo;
    private final AsignacionPresupuestoRepository asignacionPresupuestoRepo;
    private final PeriodoService periodoService;
    private final TransaccionFijaRepository transaccionFijaRepo;
    private final TransaccionRepository transaccionRepo;

    public MetaFinancieraServiceImpl(MetaFinancieraRepository metaRepo, UsuarioRepository usuarioRepo,
                                      AbonoMetaRepository abonoRepo, AsignacionPresupuestoRepository asignacionPresupuestoRepo,
                                      PeriodoService periodoService, TransaccionFijaRepository transaccionFijaRepo,
                                      TransaccionRepository transaccionRepo) {
        this.periodoService = periodoService;
        this.metaRepo = metaRepo;
        this.usuarioRepo = usuarioRepo;
        this.abonoRepo = abonoRepo;
        this.asignacionPresupuestoRepo = asignacionPresupuestoRepo;
        this.transaccionFijaRepo = transaccionFijaRepo;
        this.transaccionRepo = transaccionRepo;
    }

    @Override
    public MetaFinancieraDTO crearMeta(MetaFinancieraDTO dto, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        MetaFinanciera meta = new MetaFinanciera();
        meta.setNombre(dto.getNombre());
        meta.setDescripcion(dto.getDescripcion());
        meta.setMontoObjetivo(dto.getMontoObjetivo());
        meta.setMontoAcumulado(BigDecimal.ZERO);
        meta.setFechaFin(dto.getFechaFin());
        meta.setEstado(EstadoMeta.ACTIVA);
        meta.setIcono(dto.getIcono());
        meta.setUsuario(usuario);
        meta.setFechaCreacion(LocalDate.now());
        return toDTO(metaRepo.save(meta));
    }

    @Override
    public MetaFinancieraDTO actualizarMeta(Long id, MetaFinancieraDTO dto, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        meta.setNombre(dto.getNombre());
        meta.setDescripcion(dto.getDescripcion());
        meta.setMontoObjetivo(dto.getMontoObjetivo());
        meta.setFechaFin(dto.getFechaFin());
        meta.setIcono(dto.getIcono());
        return toDTO(metaRepo.save(meta));
    }

    @Override
    public void eliminarMeta(Long id, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        // Los abonos ya registrados referencian la meta por FK sin cascade — hay que borrarlos
        // primero, si no MySQL rechaza el delete de la meta con una violación de integridad.
        abonoRepo.deleteByMetaId(id);
        // Si alguna partida del Presupuesto quedó vinculada a esta meta (ej. la categoría fija
        // "Colchón" apuntando a un fondo de emergencia puntual), desvincularla en vez de que la
        // FK bloquee el borrado — la partida del presupuesto sigue existiendo, solo pierde el
        // link a esta meta en particular.
        List<AsignacionPresupuesto> asignacionesVinculadas = asignacionPresupuestoRepo.findByMetaId(id);
        asignacionesVinculadas.forEach(a -> a.setMeta(null));
        asignacionPresupuestoRepo.saveAll(asignacionesVinculadas);
        metaRepo.delete(meta);
    }

    @Override
    public List<MetaFinancieraDTO> listarActivas(Long usuarioId) {
        actualizarEstadosVencidos(usuarioId);
        return metaRepo.findByEstadoAndUsuarioId(EstadoMeta.ACTIVA, usuarioId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<MetaFinancieraDTO> listarTodas(Long usuarioId) {
        actualizarEstadosVencidos(usuarioId);
        return metaRepo.findByUsuarioId(usuarioId).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public MetaFinancieraDTO abonarMonto(Long id, BigDecimal monto, LocalDate fecha, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        // El abono se registra como una Transaccion real (tipo META) que afecta Disponible y se
        // ve en Ingresos & Gastos — PeriodoService es quien sabe crear transacciones y períodos,
        // y desde ahí actualiza montoAcumulado/estado/AbonoMeta.
        periodoService.registrarAbonoMeta(meta, monto, fecha != null ? fecha : LocalDate.now(), usuarioId);
        return toDTO(metaRepo.findByIdAndUsuarioId(id, usuarioId).orElseThrow());
    }

    @Override
    public List<AbonoMetaDTO> listarAbonos(Long metaId, Long usuarioId) {
        metaRepo.findByIdAndUsuarioId(metaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + metaId));
        return abonoRepo.findByMetaIdOrderByFechaDesc(metaId).stream()
                .map(this::toAbonoDTO).collect(Collectors.toList());
    }

    @Override
    public void eliminarAbono(Long metaId, Long abonoId, Long usuarioId) {
        metaRepo.findByIdAndUsuarioId(metaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + metaId));
        AbonoMeta abono = abonoRepo.findById(abonoId)
                .orElseThrow(() -> new IllegalArgumentException("Abono no encontrado: " + abonoId));
        if (!abono.getMeta().getId().equals(metaId)) {
            throw new IllegalStateException("No autorizado");
        }
        if (abono.getTransaccion() != null) {
            // eliminarTransaccion ya revierte el abono (resta monto, vuelve a ACTIVA si hace
            // falta) y borra el AbonoMeta antes de borrar la transacción — un solo camino.
            periodoService.eliminarTransaccion(abono.getTransaccion().getId(), usuarioId);
            return;
        }
        // Abono de antes de esta funcionalidad, sin transacción vinculada: revertir a mano.
        MetaFinanciera meta = abono.getMeta();
        meta.setMontoAcumulado(meta.getMontoAcumulado().subtract(abono.getMonto()).max(BigDecimal.ZERO));
        if (meta.getEstado() == EstadoMeta.COMPLETADA && meta.getMontoAcumulado().compareTo(meta.getMontoObjetivo()) < 0) {
            meta.setEstado(EstadoMeta.ACTIVA);
        }
        metaRepo.save(meta);
        abonoRepo.delete(abono);
    }

    @Override
    public MetaFinancieraDTO automatizarAbono(Long id, BigDecimal monto, Long usuarioId) {
        MetaFinanciera meta = metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));

        Optional<TransaccionFija> existente = transaccionFijaRepo.findByMetaIdAndActivaTrue(id);
        TransaccionFija fija = existente.orElseGet(TransaccionFija::new);
        fija.setDescripcion("Abono a " + meta.getNombre());
        fija.setMonto(monto);
        fija.setTipo(TipoTransaccion.META);
        fija.setCategoria(meta.getNombre());
        fija.setMeta(meta);
        fija.setUsuario(usuario);
        fija.setActiva(true);
        if (existente.isEmpty()) {
            LocalDate hoy = LocalDate.now();
            fija.setDia(hoy.getDayOfMonth());
            fija.setAnioInicio(hoy.getYear());
            fija.setMesInicio(hoy.getMonthValue());
            fija.setFechaInicio(hoy);
            fija.setFrecuencia(FrecuenciaRecurrencia.MENSUAL);
        }
        transaccionFijaRepo.save(fija);

        // Dispara la generación del mes actual ya mismo (mismo mecanismo que cualquier
        // transacción recurrente) — así el primer aporte automático no espera al próximo mes.
        LocalDate hoy = LocalDate.now();
        periodoService.obtenerPeriodo(hoy.getYear(), hoy.getMonthValue(), usuarioId);

        return toDTO(metaRepo.findByIdAndUsuarioId(id, usuarioId).orElseThrow());
    }

    @Override
    public MetaFinancieraDTO pausarAutomatizacion(Long id, Long usuarioId) {
        metaRepo.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Meta no encontrada: " + id));
        TransaccionFija fija = transaccionFijaRepo.findByMetaIdAndActivaTrue(id)
                .orElseThrow(() -> new IllegalStateException("Esta meta no tiene una automatización activa."));
        fija.setActiva(false);
        transaccionFijaRepo.save(fija);

        // Igual que "Dejar de repetir" en transacciones normales: se borran (revirtiendo el
        // abono de cada una) las instancias futuras ya generadas, dejando intactas las de meses
        // pasados/el actual. Acá no hay una transacción "de referencia" como en cancelarRecurrencia,
        // así que el corte de "futuro" es directamente contra hoy.
        LocalDate hoy = LocalDate.now();
        List<Long> idsFuturas = transaccionRepo.findByTransaccionFijaId(fija.getId()).stream()
                .filter(t -> t.getFecha().isAfter(hoy))
                .map(t -> t.getId())
                .collect(Collectors.toList());
        idsFuturas.forEach(txId -> periodoService.eliminarTransaccion(txId, usuarioId));

        return toDTO(metaRepo.findByIdAndUsuarioId(id, usuarioId).orElseThrow());
    }

    @Override
    public MetasRitmoDTO obtenerResumenRitmo(Long usuarioId) {
        List<MetaFinanciera> activas = metaRepo.findByEstadoAndUsuarioId(EstadoMeta.ACTIVA, usuarioId);
        LocalDate hoy = LocalDate.now();

        int metasATiempo = 0;
        int metasConDatos = 0;
        List<MetaRitmoDetalleDTO> detalle = new ArrayList<>();
        BigDecimal ritmoNecesarioTotal = BigDecimal.ZERO;

        for (MetaFinanciera meta : activas) {
            List<AbonoMeta> abonos = abonoRepo.findByMetaIdOrderByFechaDesc(meta.getId());

            // Fecha de inicio efectiva: la de creación si existe (metas nuevas siempre la
            // tienen), o si no la del abono más antiguo (la lista viene ordenada de más
            // reciente a más viejo, así que el último elemento es el primer aporte). Si no hay
            // ninguna de las dos no hay forma honesta de estimar un ritmo — se descarta la meta
            // del cálculo en vez de inventar un número.
            LocalDate inicio = meta.getFechaCreacion();
            if (inicio == null && !abonos.isEmpty()) {
                inicio = abonos.get(abonos.size() - 1).getFecha().toLocalDate();
            }
            if (inicio == null) continue;

            metasConDatos++;
            long mesesTranscurridos = Math.max(1, ChronoUnit.MONTHS.between(inicio, hoy));
            BigDecimal ritmoReal = meta.getMontoAcumulado()
                    .divide(BigDecimal.valueOf(mesesTranscurridos), 2, RoundingMode.HALF_UP);

            long mesesHastaLimite = Math.max(1, ChronoUnit.MONTHS.between(hoy, meta.getFechaFin()));
            // montoFaltante > 0 siempre para una meta ACTIVA (al llegar al objetivo pasa a
            // COMPLETADA en abonarMonto), así que ritmoNecesario nunca es cero acá.
            BigDecimal montoFaltante = meta.getMontoObjetivo().subtract(meta.getMontoAcumulado());
            BigDecimal ritmoNecesario = montoFaltante
                    .divide(BigDecimal.valueOf(mesesHastaLimite), 2, RoundingMode.HALF_UP);

            int porcentajeRitmo = ritmoReal.multiply(BigDecimal.valueOf(100))
                    .divide(ritmoNecesario, 0, RoundingMode.HALF_UP).intValue();
            if (porcentajeRitmo >= 100) metasATiempo++;
            ritmoNecesarioTotal = ritmoNecesarioTotal.add(ritmoNecesario);

            MetaRitmoDetalleDTO d = new MetaRitmoDetalleDTO();
            d.setNombre(meta.getNombre());
            d.setPorcentajeRitmo(porcentajeRitmo);
            detalle.add(d);
        }

        // El disponible es lo que efectivamente sobró de Ingresos/Gastos, ANTES de contar la
        // plata que ya se destina a abonar metas (los abonos no se registran como gasto) — por
        // eso comparar este disponible contra la suma de ritmo necesario de todas las metas es
        // justamente la pregunta correcta: "¿lo que me sobra por mes alcanza para todo lo que
        // mis metas juntas necesitan?".
        BigDecimal disponible = metasConDatos > 0 ? periodoService.obtenerDisponibleMensualPromedio(usuarioId) : null;

        MetasRitmoDTO dto = new MetasRitmoDTO();
        dto.setMetasActivasTotal(activas.size());
        dto.setMetasActivasConDatos(metasConDatos);
        dto.setMetasATiempo(metasATiempo);
        dto.setDetalle(detalle);
        if (metasConDatos > 0) {
            dto.setRitmoNecesarioTotal(ritmoNecesarioTotal);
            dto.setDisponibleMensualPromedio(disponible);
            dto.setAlcanzaParaTodas(disponible != null ? disponible.compareTo(ritmoNecesarioTotal) >= 0 : null);
        }
        return dto;
    }

    private AbonoMetaDTO toAbonoDTO(AbonoMeta a) {
        AbonoMetaDTO dto = new AbonoMetaDTO();
        dto.setId(a.getId());
        dto.setMonto(a.getMonto());
        dto.setFecha(a.getFecha());
        dto.setTransaccionId(a.getTransaccion() != null ? a.getTransaccion().getId() : null);
        return dto;
    }

    private void actualizarEstadosVencidos(Long usuarioId) {
        metaRepo.findByEstadoAndUsuarioId(EstadoMeta.ACTIVA, usuarioId).forEach(meta -> {
            if (meta.getFechaFin().isBefore(LocalDate.now())
                    && meta.getMontoAcumulado().compareTo(meta.getMontoObjetivo()) < 0) {
                meta.setEstado(EstadoMeta.VENCIDA);
                metaRepo.save(meta);
            }
        });
    }

    private MetaFinancieraDTO toDTO(MetaFinanciera m) {
        MetaFinancieraDTO dto = new MetaFinancieraDTO();
        dto.setId(m.getId());
        dto.setNombre(m.getNombre());
        dto.setDescripcion(m.getDescripcion());
        dto.setMontoObjetivo(m.getMontoObjetivo());
        dto.setMontoAcumulado(m.getMontoAcumulado());
        dto.setFechaFin(m.getFechaFin());
        dto.setEstado(m.getEstado());
        dto.setIcono(m.getIcono());
        int progreso = m.getMontoObjetivo().compareTo(BigDecimal.ZERO) > 0
                ? m.getMontoAcumulado().multiply(BigDecimal.valueOf(100))
                        .divide(m.getMontoObjetivo(), 0, RoundingMode.DOWN).intValue()
                : 0;
        dto.setPorcentajeProgreso(Math.min(progreso, 100));
        transaccionFijaRepo.findByMetaIdAndActivaTrue(m.getId()).ifPresent(fija -> {
            dto.setAutomatizado(true);
            dto.setMontoAutomatico(fija.getMonto());
        });

        // Aportado/Gastado/Disponible — el progreso de arriba ya quedó fijado solo con
        // montoAcumulado, esto es puramente informativo y no lo vuelve a tocar.
        BigDecimal aportado = m.getMontoAcumulado();
        BigDecimal gastado = transaccionRepo.sumGastadoByMetaId(m.getId());
        dto.setAportado(aportado);
        dto.setGastado(gastado);
        dto.setDisponible(aportado.subtract(gastado));
        return dto;
    }
}
