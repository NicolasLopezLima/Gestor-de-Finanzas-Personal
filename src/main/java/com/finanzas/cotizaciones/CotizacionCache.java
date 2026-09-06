package com.finanzas.cotizaciones;

import com.finanzas.cotizaciones.YahooFinanceClient.PuntoHistorico;
import com.finanzas.cotizaciones.YahooFinanceClient.YahooQuote;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Cache TTL simple en memoria, para no repetir llamadas al mismo ticker en cada
 * refresh de la cartera (Yahoo es un endpoint no oficial, sin límite documentado,
 * pero igual conviene no abusar).
 */
@Component
public class CotizacionCache {

    private static final long TTL_MS = 60_000;

    private final ConcurrentHashMap<String, CacheEntry<Optional<YahooQuote>>> cache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry<Optional<List<PuntoHistorico>>>> serieCache = new ConcurrentHashMap<>();

    public Optional<YahooQuote> getOrFetch(String yahooTicker, Supplier<Optional<YahooQuote>> fetcher) {
        String key = yahooTicker.toUpperCase();
        CacheEntry<Optional<YahooQuote>> entry = cache.get(key);
        if (entry != null && !entry.vencida()) return entry.value;
        Optional<YahooQuote> valor = fetcher.get();
        cache.put(key, new CacheEntry<>(valor));
        return valor;
    }

    public Optional<List<PuntoHistorico>> getOrFetchSerie(String yahooTicker, String periodo, Supplier<Optional<List<PuntoHistorico>>> fetcher) {
        String key = yahooTicker.toUpperCase() + "|" + periodo;
        CacheEntry<Optional<List<PuntoHistorico>>> entry = serieCache.get(key);
        if (entry != null && !entry.vencida()) return entry.value;
        Optional<List<PuntoHistorico>> valor = fetcher.get();
        serieCache.put(key, new CacheEntry<>(valor));
        return valor;
    }

    private static class CacheEntry<T> {
        final T value;
        final long timestampMs;

        CacheEntry(T value) {
            this.value = value;
            this.timestampMs = System.currentTimeMillis();
        }

        boolean vencida() {
            return System.currentTimeMillis() - timestampMs > TTL_MS;
        }
    }
}
