package com.finanzas.excel;

import com.finanzas.dto.FilaErrorDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.exception.ImportValidationException;
import com.finanzas.model.ModoImporte;
import com.finanzas.model.TipoTransaccion;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.odftoolkit.odfdom.doc.OdfSpreadsheetDocument;
import org.odftoolkit.odfdom.doc.table.OdfTable;
import org.odftoolkit.odfdom.doc.table.OdfTableCell;
import org.odftoolkit.odfdom.doc.table.OdfTableRow;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Toda la mecánica de lectura/escritura de archivos de hoja de cálculo (generación de la
 * plantilla .xlsx, e importación desde .xlsx/.xls/.ods/.csv, con o sin mapeo de columnas
 * personalizado) aislada en esta clase para no filtrar las librerías subyacentes (Apache
 * POI, ODF Toolkit, Commons CSV) al resto de la capa de servicio.
 */
@Component
public class TransaccionExcelService {

    private static final String HOJA_TRANSACCIONES = "Transacciones";
    private static final String[] HEADERS = {"Fecha", "Descripción", "Categoría", "Tipo", "Monto"};
    private static final int FILAS_PLANTILLA = 500;
    private static final String CATEGORIA_DEFECTO = "Sin categoría";

    /**
     * LibreOffice/OpenOffice rellenan un .ods con una fila final "repetida" que declara vacío
     * hasta el tamaño máximo de hoja (más de un millón de filas). odfdom-java expande esa
     * repetición al acceder por índice, así que sin este corte, recorrer ese rango completo
     * puede tardar horas o directamente no terminar nunca. Frenamos apenas detectamos varias
     * filas vacías seguidas, asumiendo que a partir de ahí ya no hay más datos reales.
     */
    private static final int MAX_FILAS_VACIAS_SEGUIDAS_ODS = 50;

    private static final String[] CATEGORIAS_INGRESO = {
        "Sueldo", "Freelance", "Inversiones", "Alquiler cobrado", "Bono", "Regalo", "Otros ingresos"
    };
    private static final String[] CATEGORIAS_GASTO = {
        "Alimentación", "Transporte", "Vivienda", "Salud", "Educación", "Ropa", "Entretenimiento",
        "Servicios", "Restaurantes", "Tecnología", "Viajes", "Deporte", "Seguros", "Otros gastos"
    };

    // ── Generación de la exportación histórica (.xlsx, una hoja por mes con datos) ──────────

    /** Datos de un mes a exportar: cada uno se vuelca en su propia hoja, nombrada "Mes AAAA". */
    public record PeriodoParaExportar(int anio, int mes, List<TransaccionDTO> transacciones) {}

    private record EstilosExportacion(CellStyle header, CellStyle fecha, CellStyle monto) {}

    public byte[] generarExportacionHistorica(List<PeriodoParaExportar> periodos) {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            EstilosExportacion estilos = crearEstilosExportacion(wb);
            for (PeriodoParaExportar p : periodos) {
                escribirHojaTransacciones(wb, nombreHojaPeriodo(p.anio(), p.mes()), p.transacciones(), estilos);
            }
            crearHojaInstrucciones(wb);
            wb.setActiveSheet(0);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("No se pudo generar la exportación de Excel.", e);
        }
    }

    private String nombreHojaPeriodo(int anio, int mes) {
        String mesTexto = MESES_COMPLETOS[mes - 1];
        return Character.toUpperCase(mesTexto.charAt(0)) + mesTexto.substring(1) + " " + anio;
    }

    private EstilosExportacion crearEstilosExportacion(XSSFWorkbook wb) {
        CellStyle headerStyle = wb.createCellStyle();
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CreationHelper createHelper = wb.getCreationHelper();
        CellStyle dateStyle = wb.createCellStyle();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("yyyy-mm-dd"));
        CellStyle montoStyle = wb.createCellStyle();
        montoStyle.setDataFormat(createHelper.createDataFormat().getFormat("#,##0.00"));
        return new EstilosExportacion(headerStyle, dateStyle, montoStyle);
    }

    private void escribirHojaTransacciones(XSSFWorkbook wb, String nombreHoja, List<TransaccionDTO> existentes, EstilosExportacion estilos) {
        Sheet sheet = wb.createSheet(nombreHoja);

        Row header = sheet.createRow(0);
        for (int i = 0; i < HEADERS.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(HEADERS[i]);
            cell.setCellStyle(estilos.header());
        }

        int filaActual = 1;

        // Pre-completa las filas con las transacciones que el usuario ya cargó en este mes
        for (TransaccionDTO t : existentes) {
            Row row = sheet.createRow(filaActual);
            Cell fechaCell = row.createCell(0);
            fechaCell.setCellValue(t.getFecha());
            fechaCell.setCellStyle(estilos.fecha());
            row.createCell(1).setCellValue(t.getDescripcion());
            row.createCell(2).setCellValue(t.getCategoria());
            row.createCell(3).setCellValue(t.getTipo().name());
            Cell montoCell = row.createCell(4);
            montoCell.setCellValue(t.getMonto().doubleValue());
            montoCell.setCellStyle(estilos.monto());
            filaActual++;
        }

        int primeraFilaVacia = filaActual;
        int ultimaFila = primeraFilaVacia + FILAS_PLANTILLA - 1;
        for (int i = primeraFilaVacia; i <= ultimaFila; i++) {
            Row row = sheet.createRow(i);
            row.createCell(0).setCellStyle(estilos.fecha());
            row.createCell(1);
            row.createCell(2);
            row.createCell(3);
            row.createCell(4).setCellStyle(estilos.monto());
        }

        DataValidationHelper dvHelper = sheet.getDataValidationHelper();
        DataValidationConstraint dvConstraint = dvHelper.createExplicitListConstraint(new String[]{"INGRESO", "GASTO"});
        CellRangeAddressList addressList = new CellRangeAddressList(1, ultimaFila, 3, 3);
        DataValidation validation = dvHelper.createValidation(dvConstraint, addressList);
        validation.setShowErrorBox(true);
        validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
        validation.createErrorBox("Valor inválido", "Seleccioná INGRESO o GASTO.");
        sheet.addValidationData(validation);

        sheet.setColumnWidth(0, 14 * 256);
        sheet.setColumnWidth(1, 32 * 256);
        sheet.setColumnWidth(2, 22 * 256);
        sheet.setColumnWidth(3, 12 * 256);
        sheet.setColumnWidth(4, 14 * 256);
    }

    private void crearHojaInstrucciones(XSSFWorkbook wb) {
        Sheet sheet = wb.createSheet("Instrucciones");
        int r = 0;
        r = escribirLinea(sheet, r, "Cómo completar este archivo");
        r++;
        r = escribirLinea(sheet, r, "- Cada hoja corresponde a un mes (el nombre de la hoja ya indica cuál).");
        r = escribirLinea(sheet, r, "- Fecha: formato AAAA-MM-DD, debe corresponder al mes de esa hoja.");
        r = escribirLinea(sheet, r, "- Descripción: texto libre, no puede estar vacío.");
        r = escribirLinea(sheet, r, "- Categoría: texto libre (ver sugerencias más abajo), no puede estar vacío.");
        r = escribirLinea(sheet, r, "- Tipo: INGRESO o GASTO (desplegable disponible en la columna).");
        r = escribirLinea(sheet, r, "- Monto: número mayor a 0.");
        r++;
        r = escribirLinea(sheet, r, "IMPORTANTE: las primeras filas de cada hoja ya son tus movimientos actuales de");
        r = escribirLinea(sheet, r, "ese mes (a modo de referencia/edición). Si volvés a importar este archivo sin");
        r = escribirLinea(sheet, r, "borrarlas, se van a crear como transacciones NUEVAS — el importador te va a avisar");
        r = escribirLinea(sheet, r, "de los posibles duplicados antes de confirmar, para que elijas qué hacer con cada uno.");
        r++;
        r = escribirLinea(sheet, r, "Categorías sugeridas para INGRESO:");
        for (String cat : CATEGORIAS_INGRESO) r = escribirLinea(sheet, r, "  • " + cat);
        r++;
        r = escribirLinea(sheet, r, "Categorías sugeridas para GASTO:");
        for (String cat : CATEGORIAS_GASTO) r = escribirLinea(sheet, r, "  • " + cat);

        sheet.setColumnWidth(0, 50 * 256);
    }

    private int escribirLinea(Sheet sheet, int rowIndex, String texto) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(texto);
        return rowIndex + 1;
    }

    // ── Importación: despacho por formato + validación compartida ──────────────

    public ImportParseResult parsearFilas(InputStream in, String nombreArchivo, int anioEsperado, int mesEsperado) {
        return parsearFilas(in, nombreArchivo, anioEsperado, mesEsperado, null);
    }

    /** Igual que {@link #parsearFilas(InputStream, String, int, int)}, pero de una hoja puntual (null = comportamiento actual). */
    public ImportParseResult parsearFilas(InputStream in, String nombreArchivo, int anioEsperado, int mesEsperado, String nombreHoja) {
        String fechaDefecto = LocalDate.of(anioEsperado, mesEsperado, 1).toString();
        List<FilaCruda> filas = extraerFilasCrudas(in, nombreArchivo, ColumnMapping.PLANTILLA, fechaDefecto, nombreHoja);
        return validarFilas(filas, anioEsperado, mesEsperado);
    }

    /**
     * Igual que {@link #parsearFilas}, pero con un mapeo de columnas personalizado (el
     * archivo no sigue el orden/nombres de nuestra plantilla). Reescribe la fila de
     * encabezado con los literales canónicos antes de validar, para que el resto del
     * pipeline (headerValido + validarFilas) corra exactamente igual sin cambios.
     */
    public ImportParseResult parsearFilasConMapeo(InputStream in, String nombreArchivo, int anioEsperado, int mesEsperado, ColumnMapping mapeo) {
        return parsearFilasConMapeo(in, nombreArchivo, anioEsperado, mesEsperado, mapeo, null);
    }

    /** Igual que {@link #parsearFilasConMapeo(InputStream, String, int, int, ColumnMapping)}, pero de una hoja puntual. */
    public ImportParseResult parsearFilasConMapeo(InputStream in, String nombreArchivo, int anioEsperado, int mesEsperado, ColumnMapping mapeo, String nombreHoja) {
        String fechaDefecto = LocalDate.of(anioEsperado, mesEsperado, 1).toString();
        List<FilaCruda> filas = extraerFilasCrudas(in, nombreArchivo, mapeo, fechaDefecto, nombreHoja);
        if (!filas.isEmpty()) {
            filas.set(0, new FilaCruda(false, HEADERS[0], HEADERS[1], HEADERS[2], HEADERS[3], HEADERS[4]));
        }
        return validarFilas(filas, anioEsperado, mesEsperado);
    }

    public List<String> peekEncabezados(InputStream in, String nombreArchivo) {
        return peekEncabezados(in, nombreArchivo, null);
    }

    /** Igual que {@link #peekEncabezados(InputStream, String)}, pero de una hoja puntual. */
    public List<String> peekEncabezados(InputStream in, String nombreArchivo, String nombreHoja) {
        return switch (extensionDe(nombreArchivo)) {
            case "xlsx", "xls" -> peekEncabezadosPoi(in, nombreHoja);
            case "ods" -> peekEncabezadosOds(in, nombreHoja);
            case "csv" -> peekEncabezadosCsv(in);
            default -> throw new ImportValidationException("Formato de archivo no soportado.", List.of());
        };
    }

    // ── Importación multi-hoja: listar hojas + inferir a qué período corresponde cada una ──

    private static final String HOJA_INSTRUCCIONES = "Instrucciones";

    /**
     * Nombres de las hojas/tablas "de datos" del archivo (excluye la hoja "Instrucciones" que
     * generamos nosotros mismos en la plantilla). Para CSV, que no tiene concepto de hojas
     * múltiples, devuelve un único elemento — así el resto del flujo ("si hay más de una hoja,
     * activar la revisión multi-período") nunca se dispara para CSV sin necesitar un caso
     * especial en el resto del código.
     */
    public List<String> listarHojas(InputStream in, String nombreArchivo) {
        return switch (extensionDe(nombreArchivo)) {
            case "xlsx", "xls" -> listarHojasPoi(in);
            case "ods" -> listarHojasOds(in);
            case "csv" -> List.of(nombreArchivo);
            default -> throw new ImportValidationException("Formato de archivo no soportado.", List.of());
        };
    }

    private List<String> listarHojasPoi(InputStream in) {
        Workbook wb;
        try {
            wb = WorkbookFactory.create(in);
        } catch (Exception e) {
            throw new ImportValidationException("El archivo no es un Excel válido (.xlsx/.xls) o está dañado.", List.of());
        }
        try {
            List<String> nombres = new ArrayList<>();
            for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                String nombre = wb.getSheetName(i);
                if (!HOJA_INSTRUCCIONES.equalsIgnoreCase(nombre)) nombres.add(nombre);
            }
            return nombres;
        } finally {
            try {
                wb.close();
            } catch (IOException ignored) {
                // no-op
            }
        }
    }

    private List<String> listarHojasOds(InputStream in) {
        OdfSpreadsheetDocument doc;
        try {
            doc = OdfSpreadsheetDocument.loadDocument(in);
        } catch (Exception e) {
            throw new ImportValidationException("El archivo no es un ODS válido (.ods) o está dañado.", List.of());
        }
        try {
            return doc.getTableList().stream()
                    .map(OdfTable::getTableName)
                    .filter(nombre -> !HOJA_INSTRUCCIONES.equalsIgnoreCase(nombre))
                    .collect(Collectors.toList());
        } finally {
            try {
                doc.close();
            } catch (Exception ignored) {
                // no-op
            }
        }
    }

    /** true si los encabezados matchean la plantilla, o si tienen al menos pinta de columnas de transacción. */
    public boolean pareceHojaDeTransacciones(List<String> encabezados) {
        if (headerCoincideTemplate(encabezados)) return true;
        boolean tieneFechaOMonto = false, tieneDescripcion = false;
        for (String h : encabezados) {
            if (h == null) continue;
            String t = h.trim().toLowerCase();
            if (t.contains("fecha") || t.contains("monto") || t.contains("importe")) tieneFechaOMonto = true;
            if (t.contains("descrip") || t.contains("concepto") || t.contains("detalle")) tieneDescripcion = true;
        }
        return tieneFechaOMonto && tieneDescripcion;
    }

    private static final String[] MESES_COMPLETOS = {
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    };
    private static final String[] MESES_ABREVIADOS = {
        "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"
    };

    /** Resultado de inferir un período a partir del nombre de una hoja: mes/año nulos si no matcheó nada. */
    public record PeriodoInferido(Integer anio, Integer mes) {
        public static final PeriodoInferido VACIO = new PeriodoInferido(null, null);
    }

    /**
     * Intenta, en orden: "mes + año" (nombre completo o abreviado, con espacio/guion/barra),
     * "MM-AAAA"/"AAAA-MM" numérico, y por último "mes solo" (sin año, que el llamador
     * completa con el año más común del resto del archivo, o le pregunta al usuario).
     */
    public PeriodoInferido inferirPeriodoDeNombreHoja(String nombreHoja) {
        if (nombreHoja == null) return PeriodoInferido.VACIO;
        String texto = nombreHoja.trim().toLowerCase();

        Integer mes = indiceDeMes(texto, MESES_COMPLETOS);
        if (mes == null) mes = indiceDeMes(texto, MESES_ABREVIADOS);

        java.util.regex.Matcher mAnio = java.util.regex.Pattern.compile("(19|20)\\d{2}").matcher(texto);
        Integer anio = mAnio.find() ? Integer.parseInt(mAnio.group()) : null;

        if (mes != null) return new PeriodoInferido(anio, mes);

        java.util.regex.Matcher mNumerico = java.util.regex.Pattern.compile("(\\d{4})[-/](\\d{1,2})|(\\d{1,2})[-/](\\d{4})").matcher(texto);
        if (mNumerico.find()) {
            if (mNumerico.group(1) != null) {
                int a = Integer.parseInt(mNumerico.group(1)), m = Integer.parseInt(mNumerico.group(2));
                if (m >= 1 && m <= 12) return new PeriodoInferido(a, m);
            } else {
                int m = Integer.parseInt(mNumerico.group(3)), a = Integer.parseInt(mNumerico.group(4));
                if (m >= 1 && m <= 12) return new PeriodoInferido(a, m);
            }
        }
        return PeriodoInferido.VACIO;
    }

    private Integer indiceDeMes(String texto, String[] nombresMeses) {
        for (int i = 0; i < nombresMeses.length; i++) {
            if (texto.contains(nombresMeses[i])) return i + 1;
        }
        return null;
    }

    public boolean headerCoincideTemplate(List<String> encabezados) {
        if (encabezados.size() != HEADERS.length) return false;
        for (int i = 0; i < HEADERS.length; i++) {
            String val = encabezados.get(i);
            if (val == null || !val.trim().equalsIgnoreCase(HEADERS[i])) return false;
        }
        return true;
    }

    /** Firma order-independiente de un conjunto de encabezados, para buscar/guardar mapeos por usuario. */
    public String firmaEncabezados(List<String> encabezados) {
        return encabezados.stream()
                .map(h -> h == null ? "" : h.trim().toLowerCase())
                .sorted()
                .collect(Collectors.joining(""));
    }

    /** Resuelve nombres de columna (elegidos en el asistente, o guardados) a posiciones dentro de ESTE archivo. */
    public ColumnMapping resolverMapeoPersonalizado(List<String> encabezados, String colFecha, String colDescripcion,
                                                     String colCategoria, ModoImporte modoImporte, String colMonto,
                                                     String colTipo, TipoTransaccion tipoFijo,
                                                     String colMontoIngreso, String colMontoGasto) {
        Integer idxFecha = (colFecha == null || colFecha.isBlank()) ? null : indiceDeEncabezado(encabezados, colFecha, "Fecha");
        int idxDescripcion = indiceDeEncabezado(encabezados, colDescripcion, "Descripción");
        Integer idxCategoria = (colCategoria == null || colCategoria.isBlank()) ? null : indiceDeEncabezado(encabezados, colCategoria, "Categoría");

        Integer idxMonto = null, idxTipo = null, idxMontoIngreso = null, idxMontoGasto = null;
        switch (modoImporte) {
            case COLUMNA_CON_TIPO -> {
                idxMonto = indiceDeEncabezado(encabezados, colMonto, "Monto");
                idxTipo = indiceDeEncabezado(encabezados, colTipo, "Tipo");
            }
            case COLUMNA_TIPO_FIJO -> idxMonto = indiceDeEncabezado(encabezados, colMonto, "Monto");
            case DOS_COLUMNAS -> {
                idxMontoIngreso = indiceDeEncabezado(encabezados, colMontoIngreso, "Monto de Ingresos");
                idxMontoGasto = indiceDeEncabezado(encabezados, colMontoGasto, "Monto de Gastos");
            }
        }
        return new ColumnMapping(idxFecha, idxDescripcion, idxCategoria, modoImporte, idxMonto, idxTipo, tipoFijo, idxMontoIngreso, idxMontoGasto);
    }

    private int indiceDeEncabezado(List<String> encabezados, String nombreBuscado, String etiquetaRol) {
        if (nombreBuscado == null || nombreBuscado.isBlank()) {
            throw new ImportValidationException("Falta indicar la columna para " + etiquetaRol + ".", List.of());
        }
        for (int i = 0; i < encabezados.size(); i++) {
            String actual = encabezados.get(i) == null ? "" : encabezados.get(i).trim();
            if (nombreBuscado.trim().equalsIgnoreCase(actual)) return i;
        }
        throw new ImportValidationException(
                "La columna \"" + nombreBuscado + "\" indicada ya no está presente en el archivo (" + etiquetaRol + ").", List.of());
    }

    private List<FilaCruda> extraerFilasCrudas(InputStream in, String nombreArchivo, ColumnMapping mapeo, String fechaDefecto, String nombreHoja) {
        return switch (extensionDe(nombreArchivo)) {
            case "xlsx", "xls" -> extraerFilasPoi(in, mapeo, fechaDefecto, nombreHoja);
            case "ods" -> extraerFilasOds(in, mapeo, fechaDefecto, nombreHoja);
            case "csv" -> extraerFilasCsv(in, mapeo, fechaDefecto);
            default -> throw new ImportValidationException("Formato de archivo no soportado.", List.of());
        };
    }

    private String extensionDe(String nombreArchivo) {
        if (nombreArchivo == null) return "";
        int idx = nombreArchivo.lastIndexOf('.');
        return idx < 0 ? "" : nombreArchivo.substring(idx + 1).toLowerCase();
    }

    private ImportParseResult validarFilas(List<FilaCruda> filas, int anioEsperado, int mesEsperado) {
        if (filas.isEmpty() || !headerValido(filas.get(0))) {
            throw new ImportValidationException(
                    "La plantilla no tiene el formato esperado. Descargá la plantilla nuevamente.", List.of());
        }

        List<TransaccionDTO> validas = new ArrayList<>();
        List<FilaErrorDTO> errores = new ArrayList<>();
        int totalFilasLeidas = 0;

        for (int i = 1; i < filas.size(); i++) {
            FilaCruda fila = filas.get(i);
            if (fila.vacia()) continue;
            totalFilasLeidas++;

            List<String> erroresFila = new ArrayList<>();
            LocalDate fecha = null;
            BigDecimal monto = null;
            String descripcion = fila.descripcion();
            String categoria = fila.categoria();
            String tipoStr = fila.tipo();

            try {
                fecha = parsearFechaTexto(fila.fecha());
                if (fecha == null) {
                    erroresFila.add("Fecha vacía o con formato inválido (usar AAAA-MM-DD).");
                } else if (fecha.getYear() != anioEsperado || fecha.getMonthValue() != mesEsperado) {
                    erroresFila.add(String.format("La fecha debe corresponder a %02d/%d.", mesEsperado, anioEsperado));
                }
            } catch (Exception e) {
                erroresFila.add("Fecha con formato inválido (usar AAAA-MM-DD).");
            }

            if (descripcion == null || descripcion.isBlank()) {
                erroresFila.add("Descripción vacía.");
            }
            if (categoria == null || categoria.isBlank()) {
                erroresFila.add("Categoría vacía.");
            }

            TipoTransaccion tipo = null;
            if (tipoStr == null || tipoStr.isBlank()) {
                erroresFila.add("Tipo vacío (debe ser INGRESO o GASTO).");
            } else {
                String tipoNormalizado = tipoStr.trim().toUpperCase();
                if (tipoNormalizado.equals("INGRESO")) {
                    tipo = TipoTransaccion.INGRESO;
                } else if (tipoNormalizado.equals("GASTO")) {
                    tipo = TipoTransaccion.GASTO;
                } else {
                    erroresFila.add("Tipo inválido: debe ser INGRESO o GASTO.");
                }
            }

            try {
                monto = parsearMontoTexto(fila.monto());
                if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
                    erroresFila.add("Monto debe ser un número mayor a 0.");
                }
            } catch (Exception e) {
                erroresFila.add("Monto con formato inválido.");
            }

            if (!erroresFila.isEmpty()) {
                errores.add(new FilaErrorDTO(i + 1, erroresFila));
            } else {
                TransaccionDTO dto = new TransaccionDTO();
                dto.setDescripcion(descripcion);
                dto.setMonto(monto);
                dto.setTipo(tipo);
                dto.setCategoria(categoria);
                dto.setFecha(fecha);
                validas.add(dto);
            }
        }

        return new ImportParseResult(validas, errores, totalFilasLeidas);
    }

    private boolean headerValido(FilaCruda header) {
        String[] valores = {header.fecha(), header.descripcion(), header.categoria(), header.tipo(), header.monto()};
        for (int i = 0; i < HEADERS.length; i++) {
            if (valores[i] == null || !valores[i].trim().equalsIgnoreCase(HEADERS[i])) return false;
        }
        return true;
    }

    private LocalDate parsearFechaTexto(String val) {
        if (val == null) return null;
        String t = val.trim();
        return t.isEmpty() ? null : LocalDate.parse(t);
    }

    private BigDecimal parsearMontoTexto(String val) {
        if (val == null) return null;
        String t = val.trim();
        return t.isEmpty() ? null : new BigDecimal(normalizarNumero(t));
    }

    /**
     * Los archivos de texto plano (CSV) no tienen un tipo numérico nativo, así que un monto
     * como "1.234,56" (formato AR/ES: punto de miles, coma decimal) llega tal cual como texto.
     * Si el texto tiene '.' y ',': el separador que aparece MÁS A LA DERECHA es el decimal;
     * el otro se trata como separador de miles y se elimina. Si solo tiene ',': se trata como
     * decimal. Si solo tiene '.' o ninguno: se deja igual.
     */
    private String normalizarNumero(String texto) {
        boolean tienePunto = texto.indexOf('.') >= 0;
        boolean tieneComa = texto.indexOf(',') >= 0;
        if (tienePunto && tieneComa) {
            char decimal = texto.lastIndexOf('.') > texto.lastIndexOf(',') ? '.' : ',';
            char miles = decimal == '.' ? ',' : '.';
            String sinMiles = texto.replace(String.valueOf(miles), "");
            return decimal == ',' ? sinMiles.replace(',', '.') : sinMiles;
        }
        if (tieneComa) return texto.replace(',', '.');
        return texto;
    }

    // ── Extractor .xlsx / .xls (Apache POI) ─────────────────────────────────────

    private List<FilaCruda> extraerFilasPoi(InputStream in, ColumnMapping mapeo, String fechaDefecto, String nombreHoja) {
        Workbook wb;
        try {
            wb = WorkbookFactory.create(in);
        } catch (Exception e) {
            throw new ImportValidationException("El archivo no es un Excel válido (.xlsx/.xls) o está dañado.", List.of());
        }
        try {
            Sheet sheet = resolverHojaPoi(wb, nombreHoja);
            List<FilaCruda> filas = new ArrayList<>();
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                filas.add(filaCrudaDePoi(sheet.getRow(i), mapeo, fechaDefecto));
            }
            return filas;
        } finally {
            try {
                wb.close();
            } catch (IOException ignored) {
                // no-op
            }
        }
    }

    /** {@code nombreHoja} null = comportamiento de siempre (hoja "Transacciones" o la primera). */
    private Sheet resolverHojaPoi(Workbook wb, String nombreHoja) {
        Sheet sheet = null;
        if (nombreHoja != null) {
            for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                if (wb.getSheetName(i).equalsIgnoreCase(nombreHoja)) { sheet = wb.getSheetAt(i); break; }
            }
        } else {
            sheet = wb.getSheet(HOJA_TRANSACCIONES);
            if (sheet == null) sheet = wb.getSheetAt(0);
        }
        if (sheet == null) {
            throw new ImportValidationException("El archivo no contiene ninguna hoja.", List.of());
        }
        return sheet;
    }

    private List<String> peekEncabezadosPoi(InputStream in, String nombreHoja) {
        Workbook wb;
        try {
            wb = WorkbookFactory.create(in);
        } catch (Exception e) {
            throw new ImportValidationException("El archivo no es un Excel válido (.xlsx/.xls) o está dañado.", List.of());
        }
        try {
            Sheet sheet = resolverHojaPoi(wb, nombreHoja);
            Row header = sheet.getRow(0);
            if (header == null) return List.of();
            List<String> encabezados = new ArrayList<>();
            int ultimaCol = header.getLastCellNum();
            for (int i = 0; i < ultimaCol; i++) {
                String val = getCellString(header.getCell(i));
                encabezados.add(val == null ? "" : val);
            }
            return encabezados;
        } finally {
            try {
                wb.close();
            } catch (IOException ignored) {
                // no-op
            }
        }
    }

    private FilaCruda filaCrudaDePoi(Row row, ColumnMapping mapeo, String fechaDefecto) {
        if (row == null) return new FilaCruda(true, null, null, null, null, null);
        boolean vacia = filaVacia(row, mapeo);
        String fecha = mapeo.idxFecha() != null ? getCellFechaTexto(row.getCell(mapeo.idxFecha())) : fechaDefecto;
        String categoria = mapeo.idxCategoria() != null ? getCellString(row.getCell(mapeo.idxCategoria())) : CATEGORIA_DEFECTO;
        String descripcion = getCellString(row.getCell(mapeo.idxDescripcion()));

        String tipo;
        String monto;
        switch (mapeo.modoImporte()) {
            case COLUMNA_TIPO_FIJO -> {
                tipo = mapeo.tipoFijo().name();
                monto = getCellMontoTexto(row.getCell(mapeo.idxMonto()));
            }
            case COLUMNA_CON_TIPO -> {
                tipo = getCellString(row.getCell(mapeo.idxTipo()));
                monto = getCellMontoTexto(row.getCell(mapeo.idxMonto()));
            }
            default -> { // DOS_COLUMNAS
                boolean tieneIngreso = !celdaVacia(row.getCell(mapeo.idxMontoIngreso()));
                boolean tieneGasto = !celdaVacia(row.getCell(mapeo.idxMontoGasto()));
                if (tieneIngreso && tieneGasto) {
                    tipo = null; monto = null; // ambiguo: validarFilas lo rechaza naturalmente
                } else if (tieneIngreso) {
                    tipo = TipoTransaccion.INGRESO.name();
                    monto = getCellMontoTexto(row.getCell(mapeo.idxMontoIngreso()));
                } else if (tieneGasto) {
                    tipo = TipoTransaccion.GASTO.name();
                    monto = getCellMontoTexto(row.getCell(mapeo.idxMontoGasto()));
                } else {
                    tipo = null; monto = null;
                }
            }
        }
        return new FilaCruda(vacia, fecha, descripcion, categoria, tipo, monto);
    }

    private boolean celdaVacia(Cell cell) {
        if (cell == null) return true;
        return switch (cell.getCellType()) {
            case BLANK -> true;
            case STRING -> esVacio(cell.getStringCellValue());
            default -> false;
        };
    }

    private boolean filaVacia(Row row, ColumnMapping mapeo) {
        if (row == null) return true;
        if (mapeo.idxFecha() != null && !celdaVacia(row.getCell(mapeo.idxFecha()))) return false;
        if (!celdaVacia(row.getCell(mapeo.idxDescripcion()))) return false;
        if (mapeo.idxCategoria() != null && !celdaVacia(row.getCell(mapeo.idxCategoria()))) return false;
        switch (mapeo.modoImporte()) {
            case DOS_COLUMNAS -> {
                if (!celdaVacia(row.getCell(mapeo.idxMontoIngreso()))) return false;
                if (!celdaVacia(row.getCell(mapeo.idxMontoGasto()))) return false;
            }
            case COLUMNA_CON_TIPO -> {
                if (!celdaVacia(row.getCell(mapeo.idxMonto()))) return false;
                if (!celdaVacia(row.getCell(mapeo.idxTipo()))) return false;
            }
            default -> { // COLUMNA_TIPO_FIJO
                if (!celdaVacia(row.getCell(mapeo.idxMonto()))) return false;
            }
        }
        return true;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> {
                String val = cell.getStringCellValue().trim();
                yield esVacio(val) ? null : val;
            }
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private String getCellFechaTexto(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate().toString();
        }
        if (cell.getCellType() == CellType.STRING) {
            String val = cell.getStringCellValue().trim();
            return esVacio(val) ? null : val;
        }
        return null;
    }

    private String getCellMontoTexto(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue()).toPlainString();
        }
        if (cell.getCellType() == CellType.STRING) {
            String val = cell.getStringCellValue().trim();
            return esVacio(val) ? null : val;
        }
        return null;
    }

    // ── Extractor .ods (ODF Toolkit / odfdom-java) ──────────────────────────────

    private List<FilaCruda> extraerFilasOds(InputStream in, ColumnMapping mapeo, String fechaDefecto, String nombreHoja) {
        OdfSpreadsheetDocument doc;
        try {
            doc = OdfSpreadsheetDocument.loadDocument(in);
        } catch (Exception e) {
            throw new ImportValidationException("El archivo no es un ODS válido (.ods) o está dañado.", List.of());
        }
        try {
            OdfTable tabla = resolverTablaOds(doc, nombreHoja);
            List<FilaCruda> filas = new ArrayList<>();
            int filasVaciasSeguidas = 0;
            for (int i = 0; i < tabla.getRowCount() && filasVaciasSeguidas <= MAX_FILAS_VACIAS_SEGUIDAS_ODS; i++) {
                FilaCruda fila = filaCrudaDeOds(tabla.getRowByIndex(i), mapeo, fechaDefecto);
                filas.add(fila);
                filasVaciasSeguidas = fila.vacia() ? filasVaciasSeguidas + 1 : 0;
            }
            return filas;
        } finally {
            try {
                doc.close();
            } catch (Exception ignored) {
                // no-op
            }
        }
    }

    /** {@code nombreHoja} null = comportamiento de siempre (tabla "Transacciones" o la primera). */
    private OdfTable resolverTablaOds(OdfSpreadsheetDocument doc, String nombreHoja) {
        List<OdfTable> tablas = doc.getTableList();
        String buscada = nombreHoja != null ? nombreHoja : HOJA_TRANSACCIONES;
        OdfTable tabla = tablas.stream()
                .filter(t -> buscada.equalsIgnoreCase(t.getTableName()))
                .findFirst()
                .orElse(nombreHoja != null || tablas.isEmpty() ? null : tablas.get(0));
        if (tabla == null) {
            throw new ImportValidationException("El archivo no contiene ninguna hoja.", List.of());
        }
        return tabla;
    }

    private List<String> peekEncabezadosOds(InputStream in, String nombreHoja) {
        OdfSpreadsheetDocument doc;
        try {
            doc = OdfSpreadsheetDocument.loadDocument(in);
        } catch (Exception e) {
            throw new ImportValidationException("El archivo no es un ODS válido (.ods) o está dañado.", List.of());
        }
        try {
            OdfTable tabla = resolverTablaOds(doc, nombreHoja);
            if (tabla.getRowCount() == 0) return List.of();
            OdfTableRow header = tabla.getRowByIndex(0);
            List<String> encabezados = new ArrayList<>();
            int columnas = tabla.getColumnCount();
            int columnasVaciasSeguidas = 0;
            for (int i = 0; i < columnas && columnasVaciasSeguidas <= MAX_FILAS_VACIAS_SEGUIDAS_ODS; i++) {
                String val = getOdfCellTexto(header.getCellByIndex(i));
                columnasVaciasSeguidas = (val == null || val.isBlank()) ? columnasVaciasSeguidas + 1 : 0;
                encabezados.add(val == null ? "" : val);
            }
            return encabezados;
        } finally {
            try {
                doc.close();
            } catch (Exception ignored) {
                // no-op
            }
        }
    }

    private FilaCruda filaCrudaDeOds(OdfTableRow row, ColumnMapping mapeo, String fechaDefecto) {
        if (row == null) return new FilaCruda(true, null, null, null, null, null);
        String fechaCruda = mapeo.idxFecha() != null ? getOdfCellFechaTexto(row.getCellByIndex(mapeo.idxFecha())) : null;
        String categoriaCruda = mapeo.idxCategoria() != null ? getOdfCellTexto(row.getCellByIndex(mapeo.idxCategoria())) : null;
        String descripcion = getOdfCellTexto(row.getCellByIndex(mapeo.idxDescripcion()));

        String tipo;
        String monto;
        boolean montoTipoVacio;
        switch (mapeo.modoImporte()) {
            case COLUMNA_TIPO_FIJO -> {
                monto = getOdfCellMontoTexto(row.getCellByIndex(mapeo.idxMonto()));
                tipo = mapeo.tipoFijo().name();
                montoTipoVacio = esVacio(monto);
            }
            case COLUMNA_CON_TIPO -> {
                monto = getOdfCellMontoTexto(row.getCellByIndex(mapeo.idxMonto()));
                tipo = getOdfCellTexto(row.getCellByIndex(mapeo.idxTipo()));
                montoTipoVacio = esVacio(monto) && esVacio(tipo);
            }
            default -> { // DOS_COLUMNAS
                String montoIngreso = getOdfCellMontoTexto(row.getCellByIndex(mapeo.idxMontoIngreso()));
                String montoGasto = getOdfCellMontoTexto(row.getCellByIndex(mapeo.idxMontoGasto()));
                boolean tieneIngreso = !esVacio(montoIngreso);
                boolean tieneGasto = !esVacio(montoGasto);
                montoTipoVacio = !tieneIngreso && !tieneGasto;
                if (tieneIngreso && tieneGasto) {
                    tipo = null; monto = null;
                } else if (tieneIngreso) {
                    tipo = TipoTransaccion.INGRESO.name(); monto = montoIngreso;
                } else if (tieneGasto) {
                    tipo = TipoTransaccion.GASTO.name(); monto = montoGasto;
                } else {
                    tipo = null; monto = null;
                }
            }
        }
        String fecha = mapeo.idxFecha() != null ? fechaCruda : fechaDefecto;
        String categoria = mapeo.idxCategoria() != null ? categoriaCruda : CATEGORIA_DEFECTO;
        boolean vacia = esVacio(fechaCruda) && esVacio(descripcion) && esVacio(categoriaCruda) && montoTipoVacio;
        return new FilaCruda(vacia, fecha, descripcion, categoria, tipo, monto);
    }

    /**
     * Muchas planillas financieras usan un guion (u otro placeholder corto) en vez de dejar la
     * celda realmente en blanco para indicar "sin valor" — sin esto, una fila de relleno más
     * allá de los datos reales (común al final de una lista, o en columnas con formato
     * aplicado a muchas más filas de las que tienen datos) no se detecta como vacía y termina
     * fallando al intentar parsear el placeholder como número.
     */
    private boolean esVacio(String val) {
        if (val == null) return true;
        String t = val.trim();
        return t.isEmpty() || t.equals("-") || t.equals("--") || t.equals("—") || t.equals("–") || t.equalsIgnoreCase("n/a");
    }

    private String getOdfCellTexto(OdfTableCell cell) {
        if (cell == null) return null;
        try {
            String val = cell.getStringValue();
            return val == null ? null : val.trim();
        } catch (Exception e) {
            return null;
        }
    }

    private String getOdfCellFechaTexto(OdfTableCell cell) {
        if (cell == null) return null;
        try {
            Calendar fecha = cell.getDateValue();
            if (fecha != null) {
                return fecha.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
            }
        } catch (Exception ignored) {
            // no era una celda de tipo fecha; probamos como texto abajo
        }
        return getOdfCellTexto(cell);
    }

    private String getOdfCellMontoTexto(OdfTableCell cell) {
        if (cell == null) return null;
        try {
            Double valor = cell.getDoubleValue();
            if (valor != null) return BigDecimal.valueOf(valor).toPlainString();
        } catch (Exception ignored) {
            // no era un valor de tipo float; probamos moneda
        }
        try {
            Double valor = cell.getCurrencyValue();
            if (valor != null) return BigDecimal.valueOf(valor).toPlainString();
        } catch (Exception ignored) {
            // no era un valor de tipo currency; probamos como texto
        }
        return getOdfCellTexto(cell);
    }

    // ── Extractor .csv (Apache Commons CSV) ─────────────────────────────────────

    private List<FilaCruda> extraerFilasCsv(InputStream in, ColumnMapping mapeo, String fechaDefecto) {
        List<CSVRecord> registros = leerRegistrosCsv(in);
        List<FilaCruda> filas = new ArrayList<>();
        for (CSVRecord r : registros) {
            filas.add(filaCrudaDeCsv(r, mapeo, fechaDefecto));
        }
        return filas;
    }

    private List<String> peekEncabezadosCsv(InputStream in) {
        List<CSVRecord> registros = leerRegistrosCsv(in);
        if (registros.isEmpty()) return List.of();
        CSVRecord header = registros.get(0);
        List<String> encabezados = new ArrayList<>();
        for (int i = 0; i < header.size(); i++) {
            String val = header.get(i);
            encabezados.add(val == null ? "" : val.trim());
        }
        return encabezados;
    }

    private List<CSVRecord> leerRegistrosCsv(InputStream in) {
        String contenido;
        try {
            contenido = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ImportValidationException("No se pudo leer el archivo CSV.", List.of());
        }
        if (!contenido.isEmpty() && contenido.charAt(0) == '﻿') {
            contenido = contenido.substring(1);
        }
        char delimitador = detectarDelimitadorCsv(contenido.lines().findFirst().orElse(""));
        CSVFormat formato = CSVFormat.DEFAULT.builder().setDelimiter(delimitador).setIgnoreEmptyLines(false).build();
        try (CSVParser parser = CSVParser.parse(contenido, formato)) {
            List<CSVRecord> registros = new ArrayList<>();
            Iterator<CSVRecord> it = parser.iterator();
            while (it.hasNext()) registros.add(it.next());
            return registros;
        } catch (Exception e) {
            throw new ImportValidationException("El archivo CSV no es válido o está dañado.", List.of());
        }
    }

    private char detectarDelimitadorCsv(String primeraLinea) {
        long comas = primeraLinea.chars().filter(c -> c == ',').count();
        long puntoYComa = primeraLinea.chars().filter(c -> c == ';').count();
        return puntoYComa > comas ? ';' : ',';
    }

    private FilaCruda filaCrudaDeCsv(CSVRecord r, ColumnMapping mapeo, String fechaDefecto) {
        String fechaCruda = campoCsv(r, mapeo.idxFecha());
        String categoriaCruda = campoCsv(r, mapeo.idxCategoria());
        String descripcion = campoCsv(r, mapeo.idxDescripcion());

        String tipo;
        String monto;
        boolean montoTipoVacio;
        switch (mapeo.modoImporte()) {
            case COLUMNA_TIPO_FIJO -> {
                monto = campoCsv(r, mapeo.idxMonto());
                tipo = mapeo.tipoFijo().name();
                montoTipoVacio = esVacio(monto);
            }
            case COLUMNA_CON_TIPO -> {
                monto = campoCsv(r, mapeo.idxMonto());
                tipo = campoCsv(r, mapeo.idxTipo());
                montoTipoVacio = esVacio(monto) && esVacio(tipo);
            }
            default -> { // DOS_COLUMNAS
                String montoIngreso = campoCsv(r, mapeo.idxMontoIngreso());
                String montoGasto = campoCsv(r, mapeo.idxMontoGasto());
                boolean tieneIngreso = !esVacio(montoIngreso);
                boolean tieneGasto = !esVacio(montoGasto);
                montoTipoVacio = !tieneIngreso && !tieneGasto;
                if (tieneIngreso && tieneGasto) {
                    tipo = null; monto = null;
                } else if (tieneIngreso) {
                    tipo = TipoTransaccion.INGRESO.name(); monto = montoIngreso;
                } else if (tieneGasto) {
                    tipo = TipoTransaccion.GASTO.name(); monto = montoGasto;
                } else {
                    tipo = null; monto = null;
                }
            }
        }
        String fecha = mapeo.idxFecha() != null ? fechaCruda : fechaDefecto;
        String categoria = mapeo.idxCategoria() != null ? categoriaCruda : CATEGORIA_DEFECTO;
        boolean vacia = esVacio(fechaCruda) && esVacio(descripcion) && esVacio(categoriaCruda) && montoTipoVacio;
        return new FilaCruda(vacia, fecha, descripcion, categoria, tipo, monto);
    }

    private String campoCsv(CSVRecord r, Integer index) {
        if (index == null || index >= r.size()) return null;
        String val = r.get(index);
        if (val == null) return null;
        String trimmed = val.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
