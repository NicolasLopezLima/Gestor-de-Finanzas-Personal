package com.finanzas.cotizaciones;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.finanzas.dto.TickerSugeridoDTO;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Cliente no oficial de Yahoo Finance (endpoint v8/finance/chart — el mismo que usa
 * finance.yahoo.com internamente). Cubre acciones de EE.UU. con el ticker tal cual
 * (ej. AAPL) y acciones argentinas de BYMA agregando el sufijo ".BA" (ej. GGAL.BA),
 * en un único cliente para ambos mercados. Sin API key.
 *
 * Es un endpoint no oficial y sin SLA: Yahoo puede cambiarlo o bloquearlo sin aviso.
 * Cualquier error (red, formato inesperado, ticker inexistente) se degrada a
 * Optional.empty() en vez de propagar la excepción.
 */
@Component
public class YahooFinanceClient {

    // Códigos de bolsa de EE.UU. observados en las respuestas de búsqueda (NASDAQ/NYSE y sus
    // variantes). Cualquier otro no reconocido (Toronto, Londres, etc.) se descarta: mostrar un
    // ticker que después no se puede cotizar es peor que no mostrarlo.
    private static final Set<String> BOLSAS_EEUU = Set.of("NMS", "NYQ", "NGM", "NCM", "ASE", "PCX", "BTS");
    // Xetra/Frankfurt — donde cotizan la mayoría de los ETFs UCITS que se operan desde brokers
    // como Trade Republic.
    private static final Set<String> BOLSAS_EUROPA = Set.of("GER", "FRA");

    private final RestClient restClient = RestClient.create();

    public List<TickerSugeridoDTO> buscarTickers(String query) {
        try {
            YahooSearchResponse response = restClient.get()
                    .uri("https://query1.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0", query)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .retrieve()
                    .body(YahooSearchResponse.class);
            if (response == null || response.quotes == null) return List.of();

            List<TickerSugeridoDTO> resultado = new ArrayList<>();
            for (YahooSearchQuote q : response.quotes) {
                // ETF además de EQUITY — si no, los fondos (ej. los UCITS de Europa) nunca
                // aparecerían en las sugerencias de búsqueda.
                if (q.symbol == null || !("EQUITY".equals(q.quoteType) || "ETF".equals(q.quoteType))) continue;

                TickerSugeridoDTO dto = new TickerSugeridoDTO();
                if (q.symbol.endsWith(".BA")) {
                    // Se guarda sin el sufijo: CotizacionService ya lo agrega solo al cotizar.
                    dto.setTicker(q.symbol.substring(0, q.symbol.length() - 3));
                    dto.setMercado("ARGENTINA");
                } else if (q.symbol.endsWith(".DE")) {
                    dto.setTicker(q.symbol.substring(0, q.symbol.length() - 3));
                    dto.setMercado("EUROPA");
                } else if (BOLSAS_EEUU.contains(q.exchange)) {
                    dto.setTicker(q.symbol);
                    dto.setMercado("EEUU");
                } else if (BOLSAS_EUROPA.contains(q.exchange)) {
                    dto.setTicker(q.symbol);
                    dto.setMercado("EUROPA");
                } else {
                    continue;
                }
                dto.setNombre(q.longname != null ? q.longname : (q.shortname != null ? q.shortname : dto.getTicker()));
                resultado.add(dto);
            }
            return resultado;
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    public Optional<YahooQuote> obtenerCotizacion(String yahooTicker) {
        try {
            YahooChartResponse response = restClient.get()
                    .uri("https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=15m&range=1d", yahooTicker)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .retrieve()
                    .body(YahooChartResponse.class);

            if (response == null || response.chart == null || response.chart.error != null) return Optional.empty();
            List<YahooChartResult> results = response.chart.result;
            if (results == null || results.isEmpty()) return Optional.empty();

            YahooChartResult result = results.get(0);
            YahooMeta meta = result.meta;
            if (meta == null || meta.regularMarketPrice == null) return Optional.empty();

            YahooQuote quote = new YahooQuote();
            quote.precio = meta.regularMarketPrice;
            quote.previousClose = meta.previousClose != null ? meta.previousClose : meta.chartPreviousClose;
            quote.historico = extraerHistorico(result);
            return Optional.of(quote);
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private List<BigDecimal> extraerHistorico(YahooChartResult result) {
        if (result.indicators == null || result.indicators.quote == null || result.indicators.quote.isEmpty()) {
            return List.of();
        }
        List<BigDecimal> close = result.indicators.quote.get(0).close;
        if (close == null) return List.of();
        return close.stream().filter(java.util.Objects::nonNull).toList();
    }

    // Serie entre dos fechas puntuales (period1/period2, epoch seconds) con el interval que
    // corresponda al largo de esa ventana — quien decide la ventana real (recortada a la fecha
    // de inversión) y el interval es CotizacionService, este cliente solo sabe pedirle a Yahoo
    // un rango de fechas concreto.
    public Optional<List<PuntoHistorico>> obtenerSerie(String yahooTicker, long period1, long period2, String interval) {
        try {
            YahooChartResponse response = restClient.get()
                    .uri("https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&period1={p1}&period2={p2}",
                            yahooTicker, interval, period1, period2)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .retrieve()
                    .body(YahooChartResponse.class);

            if (response == null || response.chart == null || response.chart.error != null) return Optional.empty();
            List<YahooChartResult> results = response.chart.result;
            if (results == null || results.isEmpty()) return Optional.empty();

            YahooChartResult result = results.get(0);
            if (result.timestamp == null || result.indicators == null
                    || result.indicators.quote == null || result.indicators.quote.isEmpty()) {
                return Optional.empty();
            }
            List<BigDecimal> closes = result.indicators.quote.get(0).close;
            if (closes == null) return Optional.empty();

            List<PuntoHistorico> puntos = new ArrayList<>();
            int n = Math.min(result.timestamp.size(), closes.size());
            for (int i = 0; i < n; i++) {
                BigDecimal precio = closes.get(i);
                Long ts = result.timestamp.get(i);
                if (precio != null && ts != null) puntos.add(new PuntoHistorico(ts, precio));
            }
            return puntos.isEmpty() ? Optional.empty() : Optional.of(puntos);
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    public record PuntoHistorico(long timestamp, BigDecimal precio) {}

    public static class YahooQuote {
        public BigDecimal precio;
        public BigDecimal previousClose;
        public List<BigDecimal> historico = List.of();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooChartResponse {
        public YahooChart chart;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooChart {
        public List<YahooChartResult> result;
        public Object error;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooChartResult {
        public YahooMeta meta;
        public YahooIndicators indicators;
        public List<Long> timestamp;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooMeta {
        public BigDecimal regularMarketPrice;
        public BigDecimal previousClose;
        public BigDecimal chartPreviousClose;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooIndicators {
        public List<YahooQuoteData> quote;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooQuoteData {
        public List<BigDecimal> close;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooSearchResponse {
        public List<YahooSearchQuote> quotes;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class YahooSearchQuote {
        public String symbol;
        public String shortname;
        public String longname;
        public String exchange;
        public String quoteType;
    }
}
