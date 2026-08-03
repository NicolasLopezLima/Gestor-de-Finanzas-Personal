package com.finanzas.controller;

import com.finanzas.dto.ImportConfirmacionRequestDTO;
import com.finanzas.dto.ImportResultDTO;
import com.finanzas.dto.ImportacionResponseDTO;
import com.finanzas.dto.PeriodoResumenDTO;
import com.finanzas.dto.SeleccionMapeoDTO;
import com.finanzas.dto.TransaccionDTO;
import com.finanzas.exception.ImportValidationException;
import com.finanzas.model.Usuario;
import com.finanzas.service.PeriodoService;
import com.finanzas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@RestController
@RequestMapping("/api/periodos")
public class PeriodoController {

    private static final List<String> EXTENSIONES_VALIDAS = List.of(".xlsx", ".xls", ".ods", ".csv");

    private final PeriodoService periodoService;
    private final UsuarioService usuarioService;

    public PeriodoController(PeriodoService periodoService, UsuarioService usuarioService) {
        this.periodoService = periodoService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/{anio}/{mes}")
    public ResponseEntity<PeriodoResumenDTO> obtener(@PathVariable int anio, @PathVariable int mes) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.obtenerPeriodo(anio, mes, uid));
    }

    @PostMapping("/{anio}/{mes}/transacciones")
    public ResponseEntity<TransaccionDTO> agregarTransaccion(
            @PathVariable int anio,
            @PathVariable int mes,
            @Valid @RequestBody TransaccionDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.agregarTransaccion(anio, mes, dto, uid));
    }

    @PutMapping("/transacciones/{id}")
    public ResponseEntity<TransaccionDTO> editarTransaccion(
            @PathVariable Long id,
            @Valid @RequestBody TransaccionDTO dto) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.editarTransaccion(id, dto, uid));
    }

    @DeleteMapping("/transacciones/{id}")
    public ResponseEntity<Void> eliminarTransaccion(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        periodoService.eliminarTransaccion(id, uid);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/transacciones/{id}/recurrencia")
    public ResponseEntity<Void> cancelarRecurrencia(@PathVariable Long id) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        periodoService.cancelarRecurrencia(id, uid);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{anio}/{mes}/cerrar")
    public ResponseEntity<PeriodoResumenDTO> cerrar(@PathVariable int anio, @PathVariable int mes) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.cerrarPeriodo(anio, mes, uid));
    }

    @PostMapping(value = "/{anio}/{mes}/transacciones/importar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportacionResponseDTO> importarTransacciones(
            @PathVariable int anio,
            @PathVariable int mes,
            @RequestParam("archivo") MultipartFile archivo) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        String nombre = validarArchivo(archivo);
        try (InputStream in = archivo.getInputStream()) {
            return ResponseEntity.ok(periodoService.importarTransacciones(anio, mes, in, nombre, uid));
        } catch (IOException e) {
            throw new ImportValidationException("No se pudo leer el archivo. Probá exportarlo nuevamente desde Excel.", List.of());
        }
    }

    @PostMapping(value = "/{anio}/{mes}/transacciones/importar/mapeo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportacionResponseDTO> importarConMapeo(
            @PathVariable int anio,
            @PathVariable int mes,
            @RequestParam("archivo") MultipartFile archivo,
            @Valid @ModelAttribute SeleccionMapeoDTO seleccion) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        String nombre = validarArchivo(archivo);
        try (InputStream in = archivo.getInputStream()) {
            return ResponseEntity.ok(periodoService.importarTransaccionesConMapeo(anio, mes, in, nombre, seleccion, uid));
        } catch (IOException e) {
            throw new ImportValidationException("No se pudo leer el archivo. Probá exportarlo nuevamente desde Excel.", List.of());
        }
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

    @PostMapping(value = "/{anio}/{mes}/transacciones/importar/confirmar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportResultDTO> confirmarImportacion(
            @PathVariable int anio,
            @PathVariable int mes,
            @Valid @RequestBody ImportConfirmacionRequestDTO request) {
        Long uid = UsuarioHelper.usuarioActual(usuarioService).getId();
        return ResponseEntity.ok(periodoService.confirmarImportacion(anio, mes, request, uid));
    }
}
