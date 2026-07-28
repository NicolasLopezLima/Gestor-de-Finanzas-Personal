package com.finanzas.excel;

import com.finanzas.model.ModoImporte;
import com.finanzas.model.TipoTransaccion;

/**
 * Qué índice de columna le corresponde a cada uno de nuestros campos. {@code idxFecha} e
 * {@code idxCategoria} nulos significan que el archivo no tiene esa columna — se usa un
 * valor por defecto (día 1 del período / "Sin categoría") calculado en el llamador.
 *
 * {@code modoImporte} determina cómo se resuelven Monto y Tipo:
 * - COLUMNA_CON_TIPO: {@code idxMonto} + {@code idxTipo}, ambos no nulos.
 * - COLUMNA_TIPO_FIJO: {@code idxMonto} no nulo, {@code tipoFijo} no nulo (todas las filas son ese tipo).
 * - DOS_COLUMNAS: {@code idxMontoIngreso} + {@code idxMontoGasto}, el tipo se infiere por
 *   cuál de las dos tiene valor en cada fila.
 */
public record ColumnMapping(Integer idxFecha, int idxDescripcion, Integer idxCategoria,
                             ModoImporte modoImporte, Integer idxMonto, Integer idxTipo,
                             TipoTransaccion tipoFijo, Integer idxMontoIngreso, Integer idxMontoGasto) {

    // HEADERS = {"Fecha"(0), "Descripción"(1), "Categoría"(2), "Tipo"(3), "Monto"(4)}
    public static final ColumnMapping PLANTILLA =
            new ColumnMapping(0, 1, 2, ModoImporte.COLUMNA_CON_TIPO, 4, 3, null, null, null);
}
