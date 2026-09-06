package com.finanzas.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finanzas.dto.DeteccionHistoricoDTO;
import com.finanzas.dto.ImportConfirmacionRequestDTO;
import com.finanzas.dto.ImportResultDTO;
import com.finanzas.dto.ImportacionResponseDTO;
import com.finanzas.dto.ImportarHistoricoRequestDTO;
import com.finanzas.exception.ImportValidationException;
import com.finanzas.service.PeriodoService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * Operaciones de Transacciones que abarcan varios períodos a la vez (no cuelgan de un
 * {anio}/{mes} fijo, por eso viven en un controller propio en vez de {@link PeriodoController}):
 * importación de un archivo con varias hojas (una por mes) y exportación de todo el historial
 * cargado a un único Excel, también una hoja por mes.
 */
@RestController
@RequestMapping("/api/transacciones")
public class ImportacionHistoricaController {

    private static final List<String> EXTENSIONES_VALIDAS = List.of(".xlsx", ".xls", ".ods", ".csv");

    private final PeriodoService periodoService;
    private final UsuarioService usuarioService;
    private final ObjectMapper objectMapper;

    public ImportacionHistoricaController(PeriodoService periodoService, UsuarioService usuarioService, ObjectMapper objectMapper) {
        this.periodoService = periodoService;
        this.usuarioService = usuarioService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/exportar-historico")
    public ResponseEntity<byte[]> exportarHistorico() {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        byte[] archivo = periodoService.generarExportacionHistorica(uid);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"transacciones-historial.xlsx\"")
                .body(archivo);
    }

    @PostMapping(value = "/importar-historico/detectar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DeteccionHistoricoDTO> detectar(@RequestParam("archivo") MultipartFile archivo) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        String nombre = validarArchivo(archivo);
        try (InputStream in = archivo.getInputStream()) {
            return ResponseEntity.ok(periodoService.detectarHistorico(in, nombre, uid));
        } catch (IOException e) {
            throw new ImportValidationException("No se pudo leer el archivo. Probá exportarlo nuevamente desde Excel.", List.of());
        }
    }

    @PostMapping(value = "/importar-historico/confirmar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportacionResponseDTO> confirmar(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam("seleccion") String seleccionJson) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        String nombre = validarArchivo(archivo);
        ImportarHistoricoRequestDTO seleccion;
        try {
            seleccion = objectMapper.readValue(seleccionJson, ImportarHistoricoRequestDTO.class);
        } catch (IOException e) {
            throw new ImportValidationException("La selección de hojas enviada no es válida.", List.of());
        }
        try (InputStream in = archivo.getInputStream()) {
            return ResponseEntity.ok(periodoService.importarHistorico(seleccion.getHojas(), seleccion.getMapeoOpcional(), in, nombre, uid));
        } catch (IOException e) {
            throw new ImportValidationException("No se pudo leer el archivo. Probá exportarlo nuevamente desde Excel.", List.of());
        }
    }

    @PostMapping(value = "/importar-historico/confirmar-conflictos", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportResultDTO> confirmarConflictos(@Valid @RequestBody ImportConfirmacionRequestDTO request) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.confirmarImportacionHistorico(request, uid));
    }

    private String validarArchivo(MultipartFile archivo) {
        if (archivo.isEmpty()) {
            throw new ImportValidationException("El archivo está vacío.", List.of());
        }
        String nombre = archivo.getOriginalFilename();
        if (nombre == null || EXTENSIONES_VALIDAS.stream().noneMatch(ext -> nombre.toLowerCase().endsWith(ext))) {
            throw new ImportValidationException("Solo se aceptan archivos .xlsx, .xls, .ods o .csv", List.of());
        }
        return nombre;
    }
}
