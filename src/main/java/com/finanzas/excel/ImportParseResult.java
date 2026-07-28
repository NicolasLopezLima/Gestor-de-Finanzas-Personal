package com.finanzas.excel;

import com.finanzas.dto.FilaErrorDTO;
import com.finanzas.dto.TransaccionDTO;

import java.util.List;

public record ImportParseResult(List<TransaccionDTO> filasValidas, List<FilaErrorDTO> errores, int totalFilasLeidas) {
}
