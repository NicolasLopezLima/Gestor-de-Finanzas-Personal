package com.finanzas.dto;

import com.finanzas.model.ModoImporte;
import com.finanzas.model.TipoTransaccion;

public class SeleccionMapeoDTO {

    private String columnaFecha;      // opcional

    private String columnaDescripcion;   // requerido salvo TABLAS_INDEPENDIENTES

    private String columnaCategoria;  // opcional

    private ModoImporte modoImporte;

    private String columnaMonto;         // requerido si COLUMNA_CON_TIPO / COLUMNA_TIPO_FIJO
    private String columnaTipo;          // requerido si COLUMNA_CON_TIPO
    private TipoTransaccion tipoFijo;    // requerido si COLUMNA_TIPO_FIJO
    private String columnaMontoIngreso;  // requerido si DOS_COLUMNAS / TABLAS_INDEPENDIENTES
    private String columnaMontoGasto;    // requerido si DOS_COLUMNAS / TABLAS_INDEPENDIENTES
    private String columnaDescripcionIngreso; // requerido si TABLAS_INDEPENDIENTES
    private String columnaDescripcionGasto;   // requerido si TABLAS_INDEPENDIENTES

    private boolean recordarMapeo;

    public String getColumnaFecha() { return columnaFecha; }
    public void setColumnaFecha(String columnaFecha) { this.columnaFecha = columnaFecha; }
    public String getColumnaDescripcion() { return columnaDescripcion; }
    public void setColumnaDescripcion(String columnaDescripcion) { this.columnaDescripcion = columnaDescripcion; }
    public String getColumnaCategoria() { return columnaCategoria; }
    public void setColumnaCategoria(String columnaCategoria) { this.columnaCategoria = columnaCategoria; }
    public ModoImporte getModoImporte() { return modoImporte; }
    public void setModoImporte(ModoImporte modoImporte) { this.modoImporte = modoImporte; }
    public String getColumnaMonto() { return columnaMonto; }
    public void setColumnaMonto(String columnaMonto) { this.columnaMonto = columnaMonto; }
    public String getColumnaTipo() { return columnaTipo; }
    public void setColumnaTipo(String columnaTipo) { this.columnaTipo = columnaTipo; }
    public TipoTransaccion getTipoFijo() { return tipoFijo; }
    public void setTipoFijo(TipoTransaccion tipoFijo) { this.tipoFijo = tipoFijo; }
    public String getColumnaMontoIngreso() { return columnaMontoIngreso; }
    public void setColumnaMontoIngreso(String columnaMontoIngreso) { this.columnaMontoIngreso = columnaMontoIngreso; }
    public String getColumnaMontoGasto() { return columnaMontoGasto; }
    public void setColumnaMontoGasto(String columnaMontoGasto) { this.columnaMontoGasto = columnaMontoGasto; }
    public String getColumnaDescripcionIngreso() { return columnaDescripcionIngreso; }
    public void setColumnaDescripcionIngreso(String columnaDescripcionIngreso) { this.columnaDescripcionIngreso = columnaDescripcionIngreso; }
    public String getColumnaDescripcionGasto() { return columnaDescripcionGasto; }
    public void setColumnaDescripcionGasto(String columnaDescripcionGasto) { this.columnaDescripcionGasto = columnaDescripcionGasto; }
    public boolean isRecordarMapeo() { return recordarMapeo; }
    public void setRecordarMapeo(boolean recordarMapeo) { this.recordarMapeo = recordarMapeo; }
}
