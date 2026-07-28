package com.finanzas.excel;

/**
 * Representación cruda y neutral al formato de origen de una fila del archivo importado
 * (.xlsx, .xls, .ods o .csv). Cada extractor de formato produce una lista de estas,
 * incluyendo la fila de encabezado en la posición 0.
 *
 * "vacia" se decide con el criterio nativo de "celda vacía" de cada formato — es la única
 * señal usada para saltear filas, independiente de si fecha/monto son parseables.
 * Los demás campos llegan como texto recortado (trim), listos para que el validador
 * compartido los parsee; null si la celda de origen no tenía valor.
 */
public record FilaCruda(boolean vacia, String fecha, String descripcion, String categoria,
                         String tipo, String monto) {
}
