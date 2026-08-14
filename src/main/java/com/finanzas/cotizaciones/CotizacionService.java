package com.finanzas.cotizaciones;

import com.finanzas.cotizaciones.YahooFinanceClient.PuntoHistorico;
import com.finanzas.cotizaciones.YahooFinanceClient.YahooQuote;
import com.finanzas.dto.CotizacionDTO;
import com.finanzas.dto.EvolucionDTO;
import com.finanzas.dto.TickerSugeridoDTO;
import com.finanzas.model.Inversion;
import com.finanzas.model.MercadoInversion;
import com.finanzas.model.TipoInversion;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class CotizacionService {

    private final YahooFinanceClient yahooFinanceClient;
    private final CotizacionCache cache;

    public CotizacionService(YahooFinanceClient yahooFinanceClient, CotizacionCache cache) {
        this.yahooFinanceClient = yahooFinanceClient;
        this.cache = cache;
    }

    public List<TickerSugeridoDTO> buscarTickers(String query) {
        if (query == null || query.trim().length() < 2) return List.of();
        return yahooFinanceClient.buscarTickers(query.trim());
    }

    // Bonos/Oro/Otro no traen ticker cotizable en la práctica (los que sí tienen uno propio,
    // como un ETF de oro físico, entran como FONDO); Acciones y Fondo son los únicos tipos
    // pensados para tener un ticker de verdad detrás.
    private boolean tieneCotizacionEnVivo(TipoInversion tipo) {
        return tipo == TipoInversion.ACCIONES || tipo == TipoInversion.FONDO;
    }

    public List<CotizacionDTO> obtenerCotizaciones(List<Inversion> inversiones) {
        List<CotizacionDTO> resultado = new ArrayList<>();
        for (Inversion inv : inversiones) {
            if (!tieneCotizacionEnVivo(inv.getTipo())) continue;
            if (inv.getTicker() == null || inv.getTicker().isBlank() || inv.getMercado() == null) continue;
            resultado.add(construirCotizacion(inv));
        }
        return resultado;
    }

    // Único lugar que traduce "mercado lógico" -> "cómo lo pide Yahoo". Agregar un mercado
    // nuevo en el futuro solo toca esta función; el resto (ponderación, endpoints, selector de
    // mercados en el frontend) ya generaliza sin cambios.
    //
    // Europa no tiene un sufijo único: un mismo ETF UCITS puede cotizar en Xetra, Stuttgart,
    // Milán, Londres, etc., cada una con su propio sufijo en Yahoo, y no hay forma de saber de
    // antemano cuál de ellas tiene datos limpios para un ticker dado (se comprobó a mano: un ETF
    // de oro físico que en Xetra no devuelve nada resultó tener precio correcto en Stuttgart).
    // Por eso para Europa se prueban varios candidatos en orden y se usa el primero que responda.
    private static final List<String> SUFIJOS_EUROPA = List.of(".DE", ".SG", ".MI", ".L", ".AS", ".PA");

    private List<String> candidatosYahoo(MercadoInversion mercado, String ticker) {
        String t = ticker.toUpperCase();
        return switch (mercado) {
            case ARGENTINA -> List.of(t + ".BA");
            case EUROPA -> SUFIJOS_EUROPA.stream().map(suf -> t + suf).toList();
            default -> List.of(t);
        };
    }

    private CotizacionDTO construirCotizacion(Inversion inv) {
        CotizacionDTO dto = new CotizacionDTO();
        dto.setInversionId(inv.getId());
        dto.setTicker(inv.getTicker());
        dto.setMercado(inv.getMercado().name());

        Optional<YahooQuote> quote = Optional.empty();
        for (String candidato : candidatosYahoo(inv.getMercado(), inv.getTicker())) {
            quote = cache.getOrFetch(candidato, () -> yahooFinanceClient.obtenerCotizacion(candidato));
            if (quote.isPresent() && quote.get().precio != null) break;
        }
        if (quote.isEmpty() || quote.get().precio == null) {
            dto.setDisponible(false);
            dto.setMensaje("Cotización no disponible");
            return dto;
        }

        BigDecimal precio = quote.get().precio;
        BigDecimal previousClose = quote.get().previousClose;

        dto.setDisponible(true);
        dto.setPrecioActual(precio);
        dto.setHistorico(quote.get().historico);
        if (previousClose != null && previousClose.compareTo(BigDecimal.ZERO) > 0) {
            dto.setVariacionDiariaPct(precio.subtract(previousClose).multiply(BigDecimal.valueOf(100))
                    .divide(previousClose, 2, RoundingMode.HALF_UP));
        }

        if (inv.getCantidad() != null) {
            BigDecimal valorMercado = inv.getCantidad().multiply(precio).setScale(2, RoundingMode.HALF_UP);
            BigDecimal gananciaPerdida = valorMercado.subtract(inv.getMontoInvertido());
            dto.setValorMercado(valorMercado);
            dto.setGananciaPerdida(gananciaPerdida);
            if (inv.getMontoInvertido().compareTo(BigDecimal.ZERO) > 0) {
                dto.setGananciaPerdidaPct(gananciaPerdida.multiply(BigDecimal.valueOf(100))
                        .divide(inv.getMontoInvertido(), 2, RoundingMode.HALF_UP));
            }
        }

        return dto;
    }

    // Duración nominal de cada período. MAX no tiene entrada acá: se interpreta como "sin
    // límite nominal", así que termina recortado 100% por la fecha de inversión más antigua.
    private static final Map<String, Long> DURACION_NOMINAL_DIAS = Map.of("1D", 1L, "1M", 30L, "1A", 365L);

    // Índice ponderado por costo (como un índice bursátil): cada posición aporta su retorno
    // relativo precio(t)/precio(0), ponderado por su peso en el costo total DEL MISMO mercado
    // (misma moneda, nunca se mezcla EE.UU./Argentina). No requiere `cantidad` — el % de
    // rendimiento no depende de cuántas unidades tiene, solo de cuánto pesa en el costo total.
    public EvolucionDTO obtenerEvolucion(List<Inversion> inversiones, MercadoInversion mercado, String periodo) {
        EvolucionDTO dto = new EvolucionDTO();
        dto.setMercado(mercado.name());
        dto.setPeriodo(periodo);

        List<Inversion> posiciones = new ArrayList<>();
        for (Inversion inv : inversiones) {
            if (!tieneCotizacionEnVivo(inv.getTipo())) continue;
            if (inv.getMercado() != mercado) continue;
            if (inv.getTicker() == null || inv.getTicker().isBlank()) continue;
            posiciones.add(inv);
        }
        if (posiciones.isEmpty()) {
            dto.setDisponible(false);
            dto.setMensaje("No hay posiciones en este mercado");
            return dto;
        }

        // La ventana real nunca empieza antes de la posición más antigua de este mercado —
        // no tiene sentido mostrar la vida de la empresa si recién invertiste la semana pasada.
        // Si el período nominal (ej. 1A) es más corto que la antigüedad de la inversión, se usa
        // el nominal tal cual (comportamiento sin cambios para inversiones ya establecidas).
        LocalDate hoy = LocalDate.now();
        LocalDate fechaMasAntigua = posiciones.stream()
                .map(Inversion::getFechaRegistro)
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(hoy);
        LocalDate inicioNominal = DURACION_NOMINAL_DIAS.containsKey(periodo)
                ? hoy.minusDays(DURACION_NOMINAL_DIAS.get(periodo))
                : LocalDate.of(1970, 1, 1); // MAX
        LocalDate inicioReal = inicioNominal.isAfter(fechaMasAntigua) ? inicioNominal : fechaMasAntigua;

        long period1 = inicioReal.atStartOfDay(ZoneOffset.UTC).toEpochSecond();
        long period2 = Instant.now().getEpochSecond();
        long diasSpan = ChronoUnit.DAYS.between(inicioReal, hoy);
        // Yahoo limita la granularidad fina a ventanas cortas — se elige el interval más fino
        // que la ventana real permite, en vez de uno fijo por período nominal.
        String interval = diasSpan <= 5 ? "15m" : diasSpan <= 60 ? "1d" : diasSpan <= 730 ? "1wk" : "1mo";

        // Trae series (con cache) y descarta las que fallan o son demasiado cortas.
        List<Inversion> conDatos = new ArrayList<>();
        List<List<PuntoHistorico>> series = new ArrayList<>();
        for (Inversion inv : posiciones) {
            Optional<List<PuntoHistorico>> serie = Optional.empty();
            for (String candidato : candidatosYahoo(inv.getMercado(), inv.getTicker())) {
                serie = cache.getOrFetchSerie(candidato, periodo,
                        () -> yahooFinanceClient.obtenerSerie(candidato, period1, period2, interval));
                if (serie.isPresent() && serie.get().size() >= 2) break;
            }
            if (serie.isPresent() && serie.get().size() >= 2) {
                conDatos.add(inv);
                series.add(serie.get());
            }
        }

        BigDecimal totalCosto = conDatos.stream().map(Inversion::getMontoInvertido).reduce(BigDecimal.ZERO, BigDecimal::add);
        int minLen = series.stream().mapToInt(List::size).min().orElse(0);
        if (conDatos.isEmpty() || totalCosto.compareTo(BigDecimal.ZERO) <= 0 || minLen < 2) {
            dto.setDisponible(false);
            dto.setMensaje("Cotización no disponible");
            return dto;
        }

        // Series alineadas por índice (mismo interval/range para todas, mismo mercado ->
        // calendarios casi idénticos), truncadas a la longitud mínima común. Aproximación
        // documentada: no hay merge exacto por fecha calendario.
        List<BigDecimal> pesos = new ArrayList<>();
        for (Inversion inv : conDatos) {
            pesos.add(inv.getMontoInvertido().divide(totalCosto, 10, RoundingMode.HALF_UP));
        }

        List<BigDecimal> valoresPct = new ArrayList<>();
        for (int j = 0; j < minLen; j++) {
            BigDecimal valor = BigDecimal.ZERO;
            for (int i = 0; i < series.size(); i++) {
                BigDecimal precioInicial = series.get(i).get(0).precio();
                if (precioInicial.compareTo(BigDecimal.ZERO) == 0) continue;
                BigDecimal precioActual = series.get(i).get(j).precio();
                BigDecimal retorno = precioActual.divide(precioInicial, 10, RoundingMode.HALF_UP);
                valor = valor.add(pesos.get(i).multiply(retorno));
            }
            valoresPct.add(valor.subtract(BigDecimal.ONE).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP));
        }

        List<Long> timestamps = new ArrayList<>();
        List<PuntoHistorico> primeraSerie = series.get(0);
        for (int j = 0; j < minLen; j++) timestamps.add(primeraSerie.get(j).timestamp());

        dto.setDisponible(true);
        dto.setTimestamps(timestamps);
        dto.setValoresPct(valoresPct);
        dto.setVariacionTotalPct(valoresPct.get(valoresPct.size() - 1));
        return dto;
    }
}
