package com.finanzas.service.impl;

import com.finanzas.dto.ConflictoImportacionDTO;
import com.finanzas.dto.DeteccionHistoricoDTO;
import com.finanzas.dto.FilaErrorDTO;
import com.finanzas.dto.HojaDetectadaDTO;
import com.finanzas.dto.ImportConfirmacionRequestDTO;
import com.finanzas.dto.ImportPreviewDTO;
import com.finanzas.dto.ImportResultDTO;
import com.finanzas.dto.ImportacionResponseDTO;
import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.ResolucionConflictoDTO;
import com.finanzas.dto.SeleccionHojaDTO;
import com.finanzas.dto.SeleccionMapeoDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.excel.ColumnMapping;
import com.finanzas.excel.ImportParseResult;
import com.finanzas.excel.TransaccionExcelService;
import com.finanzas.exception.ImportValidationException;
import com.finanzas.model.MapeoImportacion;
import com.finanzas.model.ModoImporte;
import com.finanzas.model.PeriodoMensual;
import com.finanzas.model.TipoTransaccion;
import com.finanzas.model.Transaccion;
import com.finanzas.model.TransaccionFija;
import com.finanzas.model.Usuario;
import com.finanzas.repository.MapeoImportacionRepository;
import com.finanzas.repository.PeriodoMensualRepository;
import com.finanzas.repository.TransaccionFijaRepository;
import com.finanzas.repository.TransaccionRepository;
import com.finanzas.repository.UsuarioRepository;
import com.finanzas.service.PeriodoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class PeriodoServiceImpl implements PeriodoService {

    private final PeriodoMensualRepository periodoRepo;
    private final TransaccionRepository transaccionRepo;
    private final UsuarioRepository usuarioRepo;
    private final TransaccionExcelService excelService;
    private final MapeoImportacionRepository mapeoRepo;
    private final TransaccionFijaRepository transaccionFijaRepo;

    public PeriodoServiceImpl(PeriodoMensualRepository periodoRepo,
                              TransaccionRepository transaccionRepo,
                              UsuarioRepository usuarioRepo,
                              TransaccionExcelService excelService,
                              MapeoImportacionRepository mapeoRepo,
                              TransaccionFijaRepository transaccionFijaRepo) {
        this.periodoRepo = periodoRepo;
        this.transaccionRepo = transaccionRepo;
        this.usuarioRepo = usuarioRepo;
        this.excelService = excelService;
        this.mapeoRepo = mapeoRepo;
        this.transaccionFijaRepo = transaccionFijaRepo;
    }

    @Override
    public PeriodoResumenDTO obtenerPeriodo(int anio, int mes, Long usuarioId) {
        PeriodoMensual periodo = obtenerOCrearPeriodo(anio, mes, usuarioId);
        return toResumenDTO(periodo);
    }

    /**
     * Busca el período o lo crea si es la primera vez que se toca (mismo criterio que ya
     * usaban agregarTransaccion/importar/confirmar, ahora unificado acá), y de paso genera
     * las transacciones fijas del usuario que todavía no existan en ese período.
     */
    private PeriodoMensual obtenerOCrearPeriodo(int anio, int mes, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        PeriodoMensual periodo = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId)
                .orElseGet(() -> {
                    PeriodoMensual nuevo = new PeriodoMensual(anio, mes);
                    nuevo.setUsuario(usuario);
                    return periodoRepo.save(nuevo);
                });
        generarFijasPendientes(periodo, usuarioId);
        return periodo;
    }

    /** Genera, si hace falta, la transacción de este período para cada fija activa del usuario. */
    private void generarFijasPendientes(PeriodoMensual periodo, Long usuarioId) {
        List<TransaccionFija> fijas = transaccionFijaRepo.findByUsuarioIdAndActivaTrue(usuarioId);
        if (fijas.isEmpty()) return;

        List<Transaccion> existentes = transaccionRepo.findByPeriodoId(periodo.getId());
        int diasEnMes = YearMonth.of(periodo.getAnio(), periodo.getMes()).lengthOfMonth();

        for (TransaccionFija fija : fijas) {
            boolean esAnteriorAInicio = periodo.getAnio() < fija.getAnioInicio()
                    || (periodo.getAnio() == fija.getAnioInicio() && periodo.getMes() < fija.getMesInicio());
            if (esAnteriorAInicio) continue;

            boolean yaGenerada = existentes.stream()
                    .anyMatch(t -> t.getTransaccionFija() != null && t.getTransaccionFija().getId().equals(fija.getId()));
            if (yaGenerada) continue;

            Transaccion t = new Transaccion();
            t.setDescripcion(fija.getDescripcion());
            t.setMonto(fija.getMonto());
            t.setTipo(fija.getTipo());
            t.setCategoria(fija.getCategoria());
            t.setFecha(LocalDate.of(periodo.getAnio(), periodo.getMes(), Math.min(fija.getDia(), diasEnMes)));
            t.setPeriodo(periodo);
            t.setTransaccionFija(fija);
            transaccionRepo.save(t);
        }
    }

    @Override
    public TransaccionDTO agregarTransaccion(int anio, int mes, TransaccionDTO dto, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        PeriodoMensual periodo = obtenerOCrearPeriodo(anio, mes, usuarioId);

        if (periodo.isCerrado()) {
            throw new IllegalStateException("El periodo está cerrado y no acepta nuevas transacciones.");
        }

        LocalDate fecha = dto.getFecha() != null ? dto.getFecha() : LocalDate.now();

        TransaccionFija fija = null;
        if (dto.isRepetirTodosLosMeses()) {
            fija = new TransaccionFija();
            fija.setDescripcion(dto.getDescripcion());
            fija.setMonto(dto.getMonto());
            fija.setTipo(dto.getTipo());
            fija.setCategoria(dto.getCategoria());
            fija.setDia(fecha.getDayOfMonth());
            fija.setAnioInicio(anio);
            fija.setMesInicio(mes);
            fija.setUsuario(usuario);
            fija = transaccionFijaRepo.save(fija);
        }

        Transaccion t = new Transaccion();
        t.setDescripcion(dto.getDescripcion());
        t.setMonto(dto.getMonto());
        t.setTipo(dto.getTipo());
        t.setCategoria(dto.getCategoria());
        t.setFecha(fecha);
        t.setPeriodo(periodo);
        t.setTransaccionFija(fija);

        return toDTO(transaccionRepo.save(t));
    }

    @Override
    public void cancelarRecurrencia(Long transaccionId, Long usuarioId) {
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaccion no encontrada: " + transaccionId));
        if (!t.getPeriodo().getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado");
        }
        TransaccionFija fija = t.getTransaccionFija();
        if (fija == null) {
            throw new IllegalStateException("Esta transacción no es una transacción fija.");
        }
        fija.setActiva(false);
        transaccionFijaRepo.save(fija);

        // Las instancias ya generadas para meses posteriores a este todavía no "pasaron" de
        // verdad (se generaron solo porque el usuario miró ese período por adelantado) — se
        // borran para que la recurrencia deje de verse a partir de acá. Los meses anteriores
        // (incluido este) quedan intactos como transacciones normales.
        List<Transaccion> futuras = transaccionRepo.findByTransaccionFijaId(fija.getId()).stream()
                .filter(x -> x.getFecha().isAfter(t.getFecha()))
                .collect(Collectors.toList());
        transaccionRepo.deleteAll(futuras);
    }

    @Override
    public TransaccionDTO editarTransaccion(Long transaccionId, TransaccionDTO dto, Long usuarioId) {
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaccion no encontrada: " + transaccionId));
        if (!t.getPeriodo().getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado");
        }
        if (t.getPeriodo().isCerrado()) {
            throw new IllegalStateException("No se puede editar una transacción de un periodo cerrado.");
        }
        t.setDescripcion(dto.getDescripcion());
        t.setMonto(dto.getMonto());
        t.setTipo(dto.getTipo());
        t.setCategoria(dto.getCategoria());
        t.setFecha(dto.getFecha());
        return toDTO(transaccionRepo.save(t));
    }

    @Override
    public void eliminarTransaccion(Long transaccionId, Long usuarioId) {
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaccion no encontrada: " + transaccionId));
        if (!t.getPeriodo().getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado");
        }
        if (t.getPeriodo().isCerrado()) {
            throw new IllegalStateException("No se puede eliminar una transaccion de un periodo cerrado.");
        }
        transaccionRepo.delete(t);
    }

    @Override
    public PeriodoResumenDTO cerrarPeriodo(int anio, int mes, Long usuarioId) {
        PeriodoMensual periodo = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Periodo no encontrado: " + anio + "/" + mes));
        periodo.setCerrado(true);
        return toResumenDTO(periodoRepo.save(periodo));
    }

    private PeriodoResumenDTO toResumenDTO(PeriodoMensual periodo) {
        List<Transaccion> transacciones = transaccionRepo.findByPeriodoId(periodo.getId());

        BigDecimal ingresos = transacciones.stream()
                .filter(t -> t.getTipo() == TipoTransaccion.INGRESO)
                .map(Transaccion::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal gastos = transacciones.stream()
                .filter(t -> t.getTipo() == TipoTransaccion.GASTO)
                .map(Transaccion::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PeriodoResumenDTO dto = new PeriodoResumenDTO();
        dto.setId(periodo.getId());
        dto.setAnio(periodo.getAnio());
        dto.setMes(periodo.getMes());
        dto.setCerrado(periodo.isCerrado());
        dto.setTotalIngresos(ingresos);
        dto.setTotalGastos(gastos);
        dto.setBalance(ingresos.subtract(gastos));
        dto.setTransacciones(transacciones.stream().map(this::toDTO).collect(Collectors.toList()));
        return dto;
    }

    private TransaccionDTO toDTO(Transaccion t) {
        TransaccionDTO dto = new TransaccionDTO();
        dto.setId(t.getId());
        dto.setDescripcion(t.getDescripcion());
        dto.setMonto(t.getMonto());
        dto.setTipo(t.getTipo());
        dto.setCategoria(t.getCategoria());
        dto.setFecha(t.getFecha());
        dto.setPeriodoId(t.getPeriodo().getId());
        dto.setTransaccionFijaId(t.getTransaccionFija() != null ? t.getTransaccionFija().getId() : null);
        return dto;
    }

    @Override
    public byte[] generarExportacionHistorica(Long usuarioId) {
        List<TransaccionExcelService.PeriodoParaExportar> conDatos = periodoRepo.findAllByUsuarioIdOrderByAnioAscMesAsc(usuarioId).stream()
                .map(p -> new TransaccionExcelService.PeriodoParaExportar(p.getAnio(), p.getMes(),
                        transaccionRepo.findByPeriodoId(p.getId()).stream().map(this::toDTO).collect(Collectors.toList())))
                .filter(p -> !p.transacciones().isEmpty())
                .collect(Collectors.toList());
        if (conDatos.isEmpty()) {
            throw new IllegalStateException("Todavía no cargaste ninguna transacción para exportar.");
        }
        return excelService.generarExportacionHistorica(conDatos);
    }

    @Override
    public ImportacionResponseDTO importarTransacciones(int anio, int mes, InputStream excel, String nombreArchivo, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        Optional<PeriodoMensual> periodoExistente = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId);
        if (periodoExistente.isPresent() && periodoExistente.get().isCerrado()) {
            throw new IllegalStateException("El periodo está cerrado y no acepta nuevas transacciones.");
        }

        byte[] contenido = leerTodosLosBytes(excel);
        List<String> encabezados = excelService.peekEncabezados(new ByteArrayInputStream(contenido), nombreArchivo);
        if (encabezados.isEmpty()) {
            throw new ImportValidationException("El archivo no contiene encabezados de columnas.", List.of());
        }

        if (excelService.headerCoincideTemplate(encabezados)) {
            ImportParseResult resultado = excelService.parsearFilas(new ByteArrayInputStream(contenido), nombreArchivo, anio, mes);
            return procesarResultadoImportacion(resultado, anio, mes, usuario);
        }

        String firma = excelService.firmaEncabezados(encabezados);
        Optional<MapeoImportacion> guardado = mapeoRepo.findByUsuarioIdAndFirmaEncabezados(usuarioId, firma);
        if (guardado.isPresent()) {
            MapeoImportacion m = guardado.get();
            MapeoCampos campos = new MapeoCampos(m.getColumnaFecha(), m.getColumnaCategoria(), m.getColumnaDescripcion(),
                    m.getColumnaMonto(), m.getColumnaTipo(), m.getTipoFijo(), m.getColumnaMontoIngreso(), m.getColumnaMontoGasto(),
                    m.getColumnaDescripcionIngreso(), m.getColumnaDescripcionGasto());
            ImportParseResult resultado = parsearConMapeo(contenido, nombreArchivo, anio, mes, encabezados, modoDe(m), campos);
            return procesarResultadoImportacion(resultado, anio, mes, usuario);
        }

        return ImportacionResponseDTO.requiereMapeo(encabezados);
    }

    /** Compatibilidad con mapeos guardados antes de que existiera el campo modo_importe. */
    private ModoImporte modoDe(MapeoImportacion m) {
        if (m.getModoImporte() != null) return m.getModoImporte();
        return (m.getColumnaTipo() != null) ? ModoImporte.COLUMNA_CON_TIPO : ModoImporte.COLUMNA_TIPO_FIJO;
    }

    @Override
    public ImportacionResponseDTO importarTransaccionesConMapeo(int anio, int mes, InputStream excel, String nombreArchivo,
                                                                  SeleccionMapeoDTO seleccion, Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
        Optional<PeriodoMensual> periodoExistente = periodoRepo.findByAnioAndMesAndUsuarioId(anio, mes, usuarioId);
        if (periodoExistente.isPresent() && periodoExistente.get().isCerrado()) {
            throw new IllegalStateException("El periodo está cerrado y no acepta nuevas transacciones.");
        }

        validarSeleccionMapeo(seleccion);

        byte[] contenido = leerTodosLosBytes(excel);
        List<String> encabezados = excelService.peekEncabezados(new ByteArrayInputStream(contenido), nombreArchivo);
        MapeoCampos campos = new MapeoCampos(seleccion.getColumnaFecha(), seleccion.getColumnaCategoria(), seleccion.getColumnaDescripcion(),
                seleccion.getColumnaMonto(), seleccion.getColumnaTipo(), seleccion.getTipoFijo(), seleccion.getColumnaMontoIngreso(),
                seleccion.getColumnaMontoGasto(), seleccion.getColumnaDescripcionIngreso(), seleccion.getColumnaDescripcionGasto());

        ImportParseResult resultado = parsearConMapeo(contenido, nombreArchivo, anio, mes, encabezados, seleccion.getModoImporte(), campos);
        ImportacionResponseDTO respuesta = procesarResultadoImportacion(resultado, anio, mes, usuario);

        if (seleccion.isRecordarMapeo()) {
            String firma = excelService.firmaEncabezados(encabezados);
            MapeoImportacion m = mapeoRepo.findByUsuarioIdAndFirmaEncabezados(usuarioId, firma).orElseGet(MapeoImportacion::new);
            m.setUsuario(usuario);
            m.setFirmaEncabezados(firma);
            m.setColumnaFecha(esBlank(seleccion.getColumnaFecha()) ? null : seleccion.getColumnaFecha());
            m.setColumnaCategoria(esBlank(seleccion.getColumnaCategoria()) ? null : seleccion.getColumnaCategoria());
            m.setModoImporte(seleccion.getModoImporte());
            boolean dosColumnas = seleccion.getModoImporte() == ModoImporte.DOS_COLUMNAS;
            boolean tablasIndependientes = seleccion.getModoImporte() == ModoImporte.TABLAS_INDEPENDIENTES;
            boolean tipoFijo = seleccion.getModoImporte() == ModoImporte.COLUMNA_TIPO_FIJO;
            m.setColumnaDescripcion(tablasIndependientes ? null : seleccion.getColumnaDescripcion());
            m.setColumnaMonto(dosColumnas || tablasIndependientes ? null : seleccion.getColumnaMonto());
            m.setColumnaTipo(tipoFijo || dosColumnas || tablasIndependientes ? null : seleccion.getColumnaTipo());
            m.setTipoFijo(tipoFijo ? seleccion.getTipoFijo() : null);
            m.setColumnaMontoIngreso(dosColumnas || tablasIndependientes ? seleccion.getColumnaMontoIngreso() : null);
            m.setColumnaMontoGasto(dosColumnas || tablasIndependientes ? seleccion.getColumnaMontoGasto() : null);
            m.setColumnaDescripcionIngreso(tablasIndependientes ? seleccion.getColumnaDescripcionIngreso() : null);
            m.setColumnaDescripcionGasto(tablasIndependientes ? seleccion.getColumnaDescripcionGasto() : null);
            mapeoRepo.save(m);
        }

        return respuesta;
    }

    /** Agrupa los nombres de columna elegidos (por el asistente o guardados), con los mismos nombres de campo en ambos orígenes. */
    private record MapeoCampos(String colFecha, String colCategoria, String colDescripcion, String colMonto,
                                String colTipo, TipoTransaccion tipoFijo, String colMontoIngreso, String colMontoGasto,
                                String colDescripcionIngreso, String colDescripcionGasto) {}

    /**
     * Fecha y Categoría son columnas opcionales del mapeo: si el nombre elegido para una de
     * ellas no existe en los encabezados de UNA hoja puntual (por ej. una columna que se agregó
     * recién en meses más nuevos), esa hoja simplemente no aporta ese dato — no debe tratarse
     * como un error de esa hoja. Devuelve el nombre tal cual si existe, o {@code null} si no.
     */
    private String nombreSiExisteEnHoja(List<String> encabezadosHoja, String nombreColumna) {
        if (nombreColumna == null || nombreColumna.isBlank()) return null;
        boolean existe = encabezadosHoja.stream()
                .anyMatch(h -> h != null && h.trim().equalsIgnoreCase(nombreColumna.trim()));
        return existe ? nombreColumna : null;
    }

    /**
     * Resuelve el mapeo elegido contra los encabezados del archivo y parsea sus filas. En
     * {@code TABLAS_INDEPENDIENTES} corre dos pasadas independientes (Ingresos y Gastos, cada
     * una como un {@code COLUMNA_TIPO_FIJO}) y combina el resultado, ya que cada tabla tiene su
     * propio largo y no están relacionadas fila a fila.
     */
    private ImportParseResult parsearConMapeo(byte[] contenido, String nombreArchivo, int anio, int mes,
                                               List<String> encabezados, ModoImporte modo, MapeoCampos c) {
        if (modo == ModoImporte.TABLAS_INDEPENDIENTES) {
            ColumnMapping mapeoIngresos = excelService.resolverMapeoPersonalizado(encabezados,
                    c.colFecha(), c.colDescripcionIngreso(), c.colCategoria(),
                    ModoImporte.COLUMNA_TIPO_FIJO, c.colMontoIngreso(), null, TipoTransaccion.INGRESO, null, null);
            ColumnMapping mapeoGastos = excelService.resolverMapeoPersonalizado(encabezados,
                    c.colFecha(), c.colDescripcionGasto(), c.colCategoria(),
                    ModoImporte.COLUMNA_TIPO_FIJO, c.colMontoGasto(), null, TipoTransaccion.GASTO, null, null);
            ImportParseResult ingresos = excelService.parsearFilasConMapeo(new ByteArrayInputStream(contenido), nombreArchivo, anio, mes, mapeoIngresos);
            ImportParseResult gastos = excelService.parsearFilasConMapeo(new ByteArrayInputStream(contenido), nombreArchivo, anio, mes, mapeoGastos);
            return combinarResultados(ingresos, "Ingresos", gastos, "Gastos");
        }
        ColumnMapping mapeo = excelService.resolverMapeoPersonalizado(encabezados,
                c.colFecha(), c.colDescripcion(), c.colCategoria(), modo, c.colMonto(), c.colTipo(), c.tipoFijo(),
                c.colMontoIngreso(), c.colMontoGasto());
        return excelService.parsearFilasConMapeo(new ByteArrayInputStream(contenido), nombreArchivo, anio, mes, mapeo);
    }

    private ImportParseResult combinarResultados(ImportParseResult a, String etiquetaA, ImportParseResult b, String etiquetaB) {
        List<TransaccionDTO> validas = new ArrayList<>(a.filasValidas());
        validas.addAll(b.filasValidas());
        List<FilaErrorDTO> errores = new ArrayList<>();
        a.errores().forEach(fe -> errores.add(new FilaErrorDTO(etiquetaA, fe.getFila(), fe.getErrores())));
        b.errores().forEach(fe -> errores.add(new FilaErrorDTO(etiquetaB, fe.getFila(), fe.getErrores())));
        return new ImportParseResult(validas, errores, a.totalFilasLeidas() + b.totalFilasLeidas());
    }

    private void validarSeleccionMapeo(SeleccionMapeoDTO seleccion) {
        if (seleccion.getModoImporte() == null) {
            throw new ImportValidationException("Elegí cómo identificar el Monto y el Tipo de cada fila.", List.of());
        }
        if (seleccion.getModoImporte() != ModoImporte.TABLAS_INDEPENDIENTES && esBlank(seleccion.getColumnaDescripcion())) {
            throw new ImportValidationException("Elegí la columna de Descripción.", List.of());
        }
        switch (seleccion.getModoImporte()) {
            case COLUMNA_CON_TIPO -> {
                if (esBlank(seleccion.getColumnaMonto()) || esBlank(seleccion.getColumnaTipo())) {
                    throw new ImportValidationException("Elegí la columna de Monto y la columna de Tipo.", List.of());
                }
            }
            case COLUMNA_TIPO_FIJO -> {
                if (esBlank(seleccion.getColumnaMonto()) || seleccion.getTipoFijo() == null) {
                    throw new ImportValidationException("Elegí la columna de Monto y el tipo fijo para todo el archivo.", List.of());
                }
            }
            case DOS_COLUMNAS -> {
                if (esBlank(seleccion.getColumnaMontoIngreso()) || esBlank(seleccion.getColumnaMontoGasto())) {
                    throw new ImportValidationException("Elegí la columna de Monto de Ingresos y la de Monto de Gastos.", List.of());
                }
            }
            case TABLAS_INDEPENDIENTES -> {
                if (esBlank(seleccion.getColumnaDescripcionIngreso()) || esBlank(seleccion.getColumnaMontoIngreso())
                        || esBlank(seleccion.getColumnaDescripcionGasto()) || esBlank(seleccion.getColumnaMontoGasto())) {
                    throw new ImportValidationException("Elegí las columnas de Descripción y Monto para Ingresos y para Gastos.", List.of());
                }
            }
        }
    }

    private boolean esBlank(String val) {
        return val == null || val.isBlank();
    }

    private byte[] leerTodosLosBytes(InputStream in) {
        try {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new ImportValidationException("No se pudo leer el archivo. Probá exportarlo nuevamente.", List.of());
        }
    }

    private ImportacionResponseDTO procesarResultadoImportacion(ImportParseResult resultado, int anio, int mes, Usuario usuario) {
        if (resultado.totalFilasLeidas() == 0) {
            throw new ImportValidationException("El archivo no contiene transacciones para importar.", List.of());
        }
        if (!resultado.errores().isEmpty()) {
            throw new ImportValidationException(
                    "El archivo contiene " + resultado.errores().size() + " fila(s) con errores. Corregilas y volvé a intentar.",
                    resultado.errores());
        }

        PeriodoMensual periodo = obtenerOCrearPeriodo(anio, mes, usuario.getId());

        List<Transaccion> existentes = transaccionRepo.findByPeriodoId(periodo.getId());
        List<TransaccionDTO> nuevas = new ArrayList<>();
        List<ConflictoImportacionDTO> conflictos = new ArrayList<>();
        for (TransaccionDTO entrante : resultado.filasValidas()) {
            Transaccion match = existentes.stream().filter(ex -> esConflicto(entrante, ex)).findFirst().orElse(null);
            if (match == null) {
                nuevas.add(entrante);
            } else {
                conflictos.add(new ConflictoImportacionDTO(match.getId(), toDTO(match), entrante));
            }
        }

        if (!conflictos.isEmpty()) {
            ImportPreviewDTO preview = new ImportPreviewDTO(resultado.totalFilasLeidas(), nuevas, conflictos);
            return new ImportacionResponseDTO(true, null, preview);
        }

        List<Transaccion> entidades = nuevas.stream()
                .map(dto -> construirTransaccion(dto, periodo))
                .collect(Collectors.toList());
        transaccionRepo.saveAll(entidades);

        ImportResultDTO out = new ImportResultDTO();
        out.setImportadas(entidades.size());
        out.setPeriodo(toResumenDTO(periodo));
        return new ImportacionResponseDTO(false, out, null);
    }

    @Override
    public ImportResultDTO confirmarImportacion(int anio, int mes, ImportConfirmacionRequestDTO request, Long usuarioId) {
        PeriodoMensual periodo = obtenerOCrearPeriodo(anio, mes, usuarioId);

        if (periodo.isCerrado()) {
            throw new IllegalStateException("El periodo está cerrado y no acepta nuevas transacciones.");
        }

        List<Transaccion> aInsertar = new ArrayList<>();
        if (request.getNuevas() != null) {
            for (TransaccionDTO dto : request.getNuevas()) {
                aInsertar.add(construirTransaccion(dto, periodo));
            }
        }

        int actualizadas = 0;
        if (request.getResoluciones() != null) {
            for (ResolucionConflictoDTO r : request.getResoluciones()) {
                switch (r.getAccion()) {
                    case MANTENER_EXISTENTE -> {
                        // No-op: se descarta la fila entrante, la transacción existente queda igual.
                    }
                    case USAR_EXCEL -> {
                        Transaccion existente = obtenerTransaccionDelPeriodo(r.getExistenteId(), periodo, usuarioId);
                        existente.setDescripcion(r.getEntrante().getDescripcion());
                        existente.setMonto(r.getEntrante().getMonto());
                        existente.setTipo(r.getEntrante().getTipo());
                        existente.setCategoria(r.getEntrante().getCategoria());
                        existente.setFecha(r.getEntrante().getFecha());
                        transaccionRepo.save(existente);
                        actualizadas++;
                    }
                    case MANTENER_AMBAS -> {
                        obtenerTransaccionDelPeriodo(r.getExistenteId(), periodo, usuarioId);
                        aInsertar.add(construirTransaccion(r.getEntrante(), periodo));
                    }
                }
            }
        }
        transaccionRepo.saveAll(aInsertar);

        ImportResultDTO out = new ImportResultDTO();
        out.setImportadas(aInsertar.size() + actualizadas);
        out.setPeriodo(toResumenDTO(periodo));
        return out;
    }

    private boolean esConflicto(TransaccionDTO entrante, Transaccion existente) {
        return existente.getFecha().equals(entrante.getFecha())
                && existente.getDescripcion().trim().equalsIgnoreCase(entrante.getDescripcion().trim())
                && existente.getMonto().compareTo(entrante.getMonto()) == 0;
    }

    private Transaccion construirTransaccion(TransaccionDTO dto, PeriodoMensual periodo) {
        Transaccion t = new Transaccion();
        t.setDescripcion(dto.getDescripcion());
        t.setMonto(dto.getMonto());
        t.setTipo(dto.getTipo());
        t.setCategoria(dto.getCategoria());
        t.setFecha(dto.getFecha());
        t.setPeriodo(periodo);
        return t;
    }

    private Transaccion obtenerTransaccionDelPeriodo(Long transaccionId, PeriodoMensual periodo, Long usuarioId) {
        if (transaccionId == null) {
            throw new IllegalArgumentException("Falta el id de la transacción existente en un conflicto.");
        }
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada: " + transaccionId));
        if (!t.getPeriodo().getId().equals(periodo.getId()) || !t.getPeriodo().getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado para resolver este conflicto.");
        }
        return t;
    }

    // ── Importación de historial completo: varias hojas, cada una a su propio período ──────

    @Override
    public DeteccionHistoricoDTO detectarHistorico(InputStream excel, String nombreArchivo, Long usuarioId) {
        byte[] contenido = leerTodosLosBytes(excel);
        List<String> nombresHojas = excelService.listarHojas(new ByteArrayInputStream(contenido), nombreArchivo);
        if (nombresHojas.isEmpty()) {
            throw new ImportValidationException("El archivo no contiene ninguna hoja con datos.", List.of());
        }

        // pareceHojaDeTransacciones es un heurístico (busca "fecha"/"monto"/"descripción" etc.
        // en los encabezados) — sirve para tildar por defecto qué hojas incluir y para saltear
        // hojas de resumen/gráficos, pero NUNCA debe rechazar el archivo entero si no reconoce
        // ninguna: un archivo real puede tener columnas que el heurístico no adivina, y en ese
        // caso el asistente de mapeo (igual que en el flujo de un solo período) es quien
        // resuelve, no un error. Por eso se calcula mes/año inferido para TODAS las hojas con
        // encabezados, no solo las que "parecen", y la hoja de referencia para decidir el mapeo
        // se elige aunque ninguna haya pasado el heurístico.
        List<HojaDetectadaDTO> hojas = new ArrayList<>();
        Map<String, List<String>> encabezadosPorHoja = new java.util.LinkedHashMap<>();
        for (String nombreHoja : nombresHojas) {
            List<String> encabezados = excelService.peekEncabezados(new ByteArrayInputStream(contenido), nombreArchivo, nombreHoja);
            encabezadosPorHoja.put(nombreHoja, encabezados);
            boolean parece = !encabezados.isEmpty() && excelService.pareceHojaDeTransacciones(encabezados);

            HojaDetectadaDTO h = new HojaDetectadaDTO();
            h.setNombreHoja(nombreHoja);
            h.setPareceTransacciones(parece);
            h.setIncluir(parece);
            if (!encabezados.isEmpty()) {
                TransaccionExcelService.PeriodoInferido inferido = excelService.inferirPeriodoDeNombreHoja(nombreHoja);
                h.setAnioInferido(inferido.anio());
                h.setMesInferido(inferido.mes());
            }
            hojas.add(h);
        }

        String hojaReferencia = hojas.stream()
                .filter(HojaDetectadaDTO::isPareceTransacciones)
                .map(HojaDetectadaDTO::getNombreHoja)
                .findFirst()
                .orElseGet(() -> hojas.stream()
                        .filter(h -> !encabezadosPorHoja.get(h.getNombreHoja()).isEmpty())
                        .map(HojaDetectadaDTO::getNombreHoja)
                        .findFirst()
                        .orElse(null));
        if (hojaReferencia == null) {
            throw new ImportValidationException("No pudimos leer los encabezados del archivo.", List.of());
        }
        List<String> encabezadosReferencia = encabezadosPorHoja.get(hojaReferencia);

        // Si ninguna hoja pasó el heurístico, no queda ninguna tildada por defecto — se tilda
        // al menos la hoja de referencia para no dejar el archivo entero destildado.
        if (hojas.stream().noneMatch(HojaDetectadaDTO::isIncluir)) {
            hojas.stream().filter(h -> h.getNombreHoja().equals(hojaReferencia)).findFirst().ifPresent(h -> h.setIncluir(true));
        }

        // Año más común entre las hojas que sí lo tienen explícito, para completar las que solo
        // indican el mes (no se filtra por "parece transacciones" — es solo un valor por
        // defecto que el usuario puede corregir en la revisión, no una decisión definitiva).
        Integer anioComun = hojas.stream()
                .map(HojaDetectadaDTO::getAnioInferido)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(a -> a, Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        boolean requiereAnioComun = anioComun == null && hojas.stream()
                .anyMatch(h -> h.getMesInferido() != null && h.getAnioInferido() == null);

        if (anioComun != null) {
            for (HojaDetectadaDTO h : hojas) {
                if (h.getMesInferido() != null && h.getAnioInferido() == null) {
                    h.setAnioInferido(anioComun);
                }
            }
        }

        boolean requiereMapeo = !excelService.headerCoincideTemplate(encabezadosReferencia)
                && mapeoRepo.findByUsuarioIdAndFirmaEncabezados(usuarioId, excelService.firmaEncabezados(encabezadosReferencia)).isEmpty();

        DeteccionHistoricoDTO dto = new DeteccionHistoricoDTO();
        dto.setHojas(hojas);
        dto.setRequiereMapeo(requiereMapeo);
        dto.setEncabezadosReferencia(encabezadosReferencia);
        dto.setRequiereAnioComun(requiereAnioComun);
        return dto;
    }

    @Override
    public ImportacionResponseDTO importarHistorico(List<SeleccionHojaDTO> seleccion, SeleccionMapeoDTO mapeoOpcional,
                                                      InputStream excel, String nombreArchivo, Long usuarioId) {
        byte[] contenido = leerTodosLosBytes(excel);
        List<SeleccionHojaDTO> incluidas = seleccion.stream().filter(SeleccionHojaDTO::isIncluir).collect(Collectors.toList());
        if (incluidas.isEmpty()) {
            throw new ImportValidationException("No seleccionaste ninguna hoja para importar.", List.of());
        }

        List<String> encabezadosReferencia = excelService.peekEncabezados(
                new ByteArrayInputStream(contenido), nombreArchivo, incluidas.get(0).getNombreHoja());

        // El layout de columnas puede variar de una hoja a otra (se van agregando columnas con
        // el tiempo, manteniendo las viejas), así que NO se resuelve un ColumnMapping (posiciones
        // fijas) una sola vez contra la hoja de referencia. Acá solo se decide el MODO y los
        // NOMBRES de columna elegidos (una vez); la posición real de cada nombre se resuelve por
        // hoja, en el bucle de abajo, contra los encabezados propios de esa hoja puntual.
        ModoImporte modo = null;
        MapeoCampos campos = null;
        if (!excelService.headerCoincideTemplate(encabezadosReferencia)) {
            if (mapeoOpcional != null) {
                validarSeleccionMapeo(mapeoOpcional);
                modo = mapeoOpcional.getModoImporte();
                campos = new MapeoCampos(mapeoOpcional.getColumnaFecha(), mapeoOpcional.getColumnaCategoria(), mapeoOpcional.getColumnaDescripcion(),
                        mapeoOpcional.getColumnaMonto(), mapeoOpcional.getColumnaTipo(), mapeoOpcional.getTipoFijo(),
                        mapeoOpcional.getColumnaMontoIngreso(), mapeoOpcional.getColumnaMontoGasto(),
                        mapeoOpcional.getColumnaDescripcionIngreso(), mapeoOpcional.getColumnaDescripcionGasto());
            } else {
                String firma = excelService.firmaEncabezados(encabezadosReferencia);
                MapeoImportacion m = mapeoRepo.findByUsuarioIdAndFirmaEncabezados(usuarioId, firma)
                        .orElseThrow(() -> new ImportValidationException("Hace falta indicar cómo leer las columnas de este archivo.", List.of()));
                modo = modoDe(m);
                campos = new MapeoCampos(m.getColumnaFecha(), m.getColumnaCategoria(), m.getColumnaDescripcion(), m.getColumnaMonto(),
                        m.getColumnaTipo(), m.getTipoFijo(), m.getColumnaMontoIngreso(), m.getColumnaMontoGasto(),
                        m.getColumnaDescripcionIngreso(), m.getColumnaDescripcionGasto());
            }
        }

        // Parsea cada hoja incluida contra SU período confirmado, resolviendo la posición de
        // cada columna contra los encabezados propios de ESA hoja (no los de la hoja de
        // referencia) — así una hoja más vieja, con menos columnas o en otro orden, se lee bien
        // igual. Fecha y Categoría son opcionales: si el nombre elegido no existe en una hoja
        // puntual, esa hoja simplemente no aporta ese dato (no es un error). Todo o nada sigue
        // aplicando sobre el archivo completo.
        List<TransaccionDTO> todasLasValidas = new ArrayList<>();
        List<FilaErrorDTO> todosLosErrores = new ArrayList<>();
        int totalFilasLeidas = 0;
        for (SeleccionHojaDTO hoja : incluidas) {
            List<String> encabezadosHoja = excelService.peekEncabezados(
                    new ByteArrayInputStream(contenido), nombreArchivo, hoja.getNombreHoja());
            try {
                if (excelService.headerCoincideTemplate(encabezadosHoja)) {
                    ImportParseResult resultado = excelService.parsearFilasConMapeo(
                            new ByteArrayInputStream(contenido), nombreArchivo, hoja.getAnio(), hoja.getMes(), ColumnMapping.PLANTILLA, hoja.getNombreHoja());
                    todasLasValidas.addAll(resultado.filasValidas());
                    for (FilaErrorDTO fe : resultado.errores()) {
                        todosLosErrores.add(new FilaErrorDTO(hoja.getNombreHoja(), fe.getFila(), fe.getErrores()));
                    }
                    totalFilasLeidas += resultado.totalFilasLeidas();
                } else if (campos == null) {
                    throw new ImportValidationException(
                            "La hoja \"" + hoja.getNombreHoja() + "\" no tiene el formato esperado y no se indicó un mapeo de columnas.", List.of());
                } else if (modo == ModoImporte.TABLAS_INDEPENDIENTES) {
                    String colFechaHoja = nombreSiExisteEnHoja(encabezadosHoja, campos.colFecha());
                    String colCategoriaHoja = nombreSiExisteEnHoja(encabezadosHoja, campos.colCategoria());
                    ColumnMapping mapeoIngresosHoja = excelService.resolverMapeoPersonalizado(encabezadosHoja,
                            colFechaHoja, campos.colDescripcionIngreso(), colCategoriaHoja,
                            ModoImporte.COLUMNA_TIPO_FIJO, campos.colMontoIngreso(), null, TipoTransaccion.INGRESO, null, null);
                    ColumnMapping mapeoGastosHoja = excelService.resolverMapeoPersonalizado(encabezadosHoja,
                            colFechaHoja, campos.colDescripcionGasto(), colCategoriaHoja,
                            ModoImporte.COLUMNA_TIPO_FIJO, campos.colMontoGasto(), null, TipoTransaccion.GASTO, null, null);
                    ImportParseResult ingresos = excelService.parsearFilasConMapeo(
                            new ByteArrayInputStream(contenido), nombreArchivo, hoja.getAnio(), hoja.getMes(), mapeoIngresosHoja, hoja.getNombreHoja());
                    ImportParseResult gastos = excelService.parsearFilasConMapeo(
                            new ByteArrayInputStream(contenido), nombreArchivo, hoja.getAnio(), hoja.getMes(), mapeoGastosHoja, hoja.getNombreHoja());
                    todasLasValidas.addAll(ingresos.filasValidas());
                    todasLasValidas.addAll(gastos.filasValidas());
                    for (FilaErrorDTO fe : ingresos.errores()) todosLosErrores.add(new FilaErrorDTO(hoja.getNombreHoja() + " - Ingresos", fe.getFila(), fe.getErrores()));
                    for (FilaErrorDTO fe : gastos.errores()) todosLosErrores.add(new FilaErrorDTO(hoja.getNombreHoja() + " - Gastos", fe.getFila(), fe.getErrores()));
                    totalFilasLeidas += ingresos.totalFilasLeidas() + gastos.totalFilasLeidas();
                } else {
                    String colFechaHoja = nombreSiExisteEnHoja(encabezadosHoja, campos.colFecha());
                    String colCategoriaHoja = nombreSiExisteEnHoja(encabezadosHoja, campos.colCategoria());
                    ColumnMapping mapeoHoja = excelService.resolverMapeoPersonalizado(encabezadosHoja,
                            colFechaHoja, campos.colDescripcion(), colCategoriaHoja,
                            modo, campos.colMonto(), campos.colTipo(), campos.tipoFijo(),
                            campos.colMontoIngreso(), campos.colMontoGasto());
                    ImportParseResult resultado = excelService.parsearFilasConMapeo(
                            new ByteArrayInputStream(contenido), nombreArchivo, hoja.getAnio(), hoja.getMes(), mapeoHoja, hoja.getNombreHoja());
                    todasLasValidas.addAll(resultado.filasValidas());
                    for (FilaErrorDTO fe : resultado.errores()) {
                        todosLosErrores.add(new FilaErrorDTO(hoja.getNombreHoja(), fe.getFila(), fe.getErrores()));
                    }
                    totalFilasLeidas += resultado.totalFilasLeidas();
                }
            } catch (ImportValidationException e) {
                todosLosErrores.add(new FilaErrorDTO(hoja.getNombreHoja(), 0, List.of(e.getMessage())));
            }
        }

        if (totalFilasLeidas == 0) {
            throw new ImportValidationException("El archivo no contiene transacciones para importar.", List.of());
        }
        if (!todosLosErrores.isEmpty()) {
            throw new ImportValidationException(
                    "El archivo contiene " + todosLosErrores.size() + " fila(s) con errores. Corregilas y volvé a intentar.",
                    todosLosErrores);
        }

        Set<YearMonth> periodosDistintos = todasLasValidas.stream()
                .map(t -> YearMonth.of(t.getFecha().getYear(), t.getFecha().getMonthValue()))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        for (YearMonth ym : periodosDistintos) {
            Optional<PeriodoMensual> existente = periodoRepo.findByAnioAndMesAndUsuarioId(ym.getYear(), ym.getMonthValue(), usuarioId);
            if (existente.isPresent() && existente.get().isCerrado()) {
                throw new IllegalStateException("El período " + ym.getMonthValue() + "/" + ym.getYear() + " está cerrado y no acepta nuevas transacciones.");
            }
        }

        List<TransaccionDTO> nuevas = new ArrayList<>();
        List<ConflictoImportacionDTO> conflictos = new ArrayList<>();
        for (YearMonth ym : periodosDistintos) {
            PeriodoMensual periodo = obtenerOCrearPeriodo(ym.getYear(), ym.getMonthValue(), usuarioId);
            List<Transaccion> existentes = transaccionRepo.findByPeriodoId(periodo.getId());
            for (TransaccionDTO entrante : todasLasValidas) {
                if (entrante.getFecha().getYear() != ym.getYear() || entrante.getFecha().getMonthValue() != ym.getMonthValue()) continue;
                Transaccion match = existentes.stream().filter(ex -> esConflicto(entrante, ex)).findFirst().orElse(null);
                if (match == null) {
                    nuevas.add(entrante);
                } else {
                    conflictos.add(new ConflictoImportacionDTO(match.getId(), toDTO(match), entrante));
                }
            }
        }

        if (!conflictos.isEmpty()) {
            ImportPreviewDTO preview = new ImportPreviewDTO(totalFilasLeidas, nuevas, conflictos);
            return new ImportacionResponseDTO(true, null, preview);
        }

        int guardadas = 0;
        for (YearMonth ym : periodosDistintos) {
            PeriodoMensual periodo = obtenerOCrearPeriodo(ym.getYear(), ym.getMonthValue(), usuarioId);
            List<Transaccion> entidades = nuevas.stream()
                    .filter(dto -> dto.getFecha().getYear() == ym.getYear() && dto.getFecha().getMonthValue() == ym.getMonthValue())
                    .map(dto -> construirTransaccion(dto, periodo))
                    .collect(Collectors.toList());
            transaccionRepo.saveAll(entidades);
            guardadas += entidades.size();
        }

        ImportResultDTO out = new ImportResultDTO();
        out.setImportadas(guardadas);
        return new ImportacionResponseDTO(false, out, null);
    }

    @Override
    public ImportResultDTO confirmarImportacionHistorico(ImportConfirmacionRequestDTO request, Long usuarioId) {
        int guardadas = 0;
        if (request.getNuevas() != null) {
            for (TransaccionDTO dto : request.getNuevas()) {
                PeriodoMensual periodo = obtenerOCrearPeriodo(dto.getFecha().getYear(), dto.getFecha().getMonthValue(), usuarioId);
                if (periodo.isCerrado()) {
                    throw new IllegalStateException(
                            "El período " + dto.getFecha().getMonthValue() + "/" + dto.getFecha().getYear() + " está cerrado y no acepta nuevas transacciones.");
                }
                transaccionRepo.save(construirTransaccion(dto, periodo));
                guardadas++;
            }
        }
        if (request.getResoluciones() != null) {
            for (ResolucionConflictoDTO r : request.getResoluciones()) {
                switch (r.getAccion()) {
                    case MANTENER_EXISTENTE -> {
                        // No-op: se descarta la fila entrante, la transacción existente queda igual.
                    }
                    case USAR_EXCEL -> {
                        Transaccion existente = obtenerTransaccionPropia(r.getExistenteId(), usuarioId);
                        existente.setDescripcion(r.getEntrante().getDescripcion());
                        existente.setMonto(r.getEntrante().getMonto());
                        existente.setTipo(r.getEntrante().getTipo());
                        existente.setCategoria(r.getEntrante().getCategoria());
                        existente.setFecha(r.getEntrante().getFecha());
                        transaccionRepo.save(existente);
                        guardadas++;
                    }
                    case MANTENER_AMBAS -> {
                        obtenerTransaccionPropia(r.getExistenteId(), usuarioId);
                        PeriodoMensual periodo = obtenerOCrearPeriodo(
                                r.getEntrante().getFecha().getYear(), r.getEntrante().getFecha().getMonthValue(), usuarioId);
                        transaccionRepo.save(construirTransaccion(r.getEntrante(), periodo));
                        guardadas++;
                    }
                }
            }
        }
        ImportResultDTO out = new ImportResultDTO();
        out.setImportadas(guardadas);
        return out;
    }

    private Transaccion obtenerTransaccionPropia(Long transaccionId, Long usuarioId) {
        if (transaccionId == null) {
            throw new IllegalArgumentException("Falta el id de la transacción existente en un conflicto.");
        }
        Transaccion t = transaccionRepo.findById(transaccionId)
                .orElseThrow(() -> new IllegalArgumentException("Transacción no encontrada: " + transaccionId));
        if (!t.getPeriodo().getUsuario().getId().equals(usuarioId)) {
            throw new IllegalStateException("No autorizado para resolver este conflicto.");
        }
        return t;
    }

    @Override
    public BigDecimal obtenerDisponibleMensualPromedio(Long usuarioId) {
        YearMonth actual = YearMonth.now();
        List<PeriodoMensual> completos = periodoRepo.findAllByUsuarioIdOrderByAnioAscMesAsc(usuarioId).stream()
                .filter(p -> YearMonth.of(p.getAnio(), p.getMes()).isBefore(actual))
                .collect(Collectors.toList());
        if (completos.isEmpty()) return null;

        List<PeriodoMensual> ultimos = completos.size() > 6
                ? completos.subList(completos.size() - 6, completos.size())
                : completos;

        BigDecimal total = BigDecimal.ZERO;
        for (PeriodoMensual periodo : ultimos) {
            List<Transaccion> transacciones = transaccionRepo.findByPeriodoId(periodo.getId());
            BigDecimal ingresos = transacciones.stream()
                    .filter(t -> t.getTipo() == TipoTransaccion.INGRESO)
                    .map(Transaccion::getMonto)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal gastos = transacciones.stream()
                    .filter(t -> t.getTipo() == TipoTransaccion.GASTO)
                    .map(Transaccion::getMonto)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            total = total.add(ingresos.subtract(gastos));
        }
        return total.divide(BigDecimal.valueOf(ultimos.size()), 2, RoundingMode.HALF_UP);
    }
}
