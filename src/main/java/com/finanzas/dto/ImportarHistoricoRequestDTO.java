package com.finanzas.dto;

import java.util.List;

/** Payload JSON (enviado como campo de texto dentro de un multipart) del paso de confirmación
 *  de la importación de historial completo: qué hojas incluir con qué período, y el mapeo de
 *  columnas elegido si el archivo no sigue la plantilla. */
public class ImportarHistoricoRequestDTO {

    private List<SeleccionHojaDTO> hojas;
    private SeleccionMapeoDTO mapeoOpcional;

    public List<SeleccionHojaDTO> getHojas() { return hojas; }
    public void setHojas(List<SeleccionHojaDTO> hojas) { this.hojas = hojas; }
    public SeleccionMapeoDTO getMapeoOpcional() { return mapeoOpcional; }
    public void setMapeoOpcional(SeleccionMapeoDTO mapeoOpcional) { this.mapeoOpcional = mapeoOpcional; }
}
