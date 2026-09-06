let inversiones = [];
let resumenActual = null;
let filtroInvActivo = 'TODOS';
let cotizacionesPorId = {}; // inversionId -> CotizacionDTO, solo para posiciones ACCIONES con ticker
const PERIODOS_EVOLUCION = ['1D', '1M', '1A', 'MAX'];
let evolucionMercado = null;
let evolucionPeriodo = '1D';

async function initInversiones() {
    document.getElementById('btn-nueva-inversion').addEventListener('click', () => abrirModalInv());
    document.getElementById('btn-cancelar-inv').addEventListener('click', cerrarModalInv);
    document.getElementById('form-inversion').addEventListener('submit', guardarInversion);
    document.addEventListener('click', () => document.getElementById('inv-filter-menu').classList.add('hidden'));
    document.getElementById('inv-tipo').addEventListener('change', actualizarVisibilidadCamposAcciones);
    document.getElementById('inv-ticker').addEventListener('input', onBuscarTickerInput);
    document.getElementById('inv-evolucion-mercado').addEventListener('change', () => {
        evolucionMercado = document.getElementById('inv-evolucion-mercado').value;
        cargarEvolucion();
    });
    document.getElementById('btn-graficos-inv').addEventListener('click', toggleGraficosGenerales);
    document.getElementById('btn-cerrar-tv-chart').addEventListener('click', cerrarModalGraficoPosicion);
    document.getElementById('modal-tv-chart').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-tv-chart')) cerrarModalGraficoPosicion();
    });

    // Auto-refresh de cotizaciones cada 60s (mismo TTL que el cache del backend), pero
    // solo mientras esta pantalla está realmente activa — no hay hook de "salida de
    // página" en app.js, así que el propio intervalo se auto-regula chequeando la clase
    // .active en cada tick en vez de sumar infraestructura de lifecycle nueva.
    setInterval(() => {
        if (document.getElementById('page-inversiones').classList.contains('active')) {
            refrescarCotizaciones();
        }
    }, 60000);

    await cargarInversiones();

    const u = await currentUserPromise;
    if (u && !(u.toursVistos || []).includes('INVERSIONES')) {
        const hoy = new Date().toISOString().slice(0, 10);
        let invEjemploId = null;
        try {
            const inv = await api.agregarInversion({ nombre: 'ETF (ejemplo)', tipo: 'ETF', fechaRegistro: hoy, montoInvertido: 500, porcentajeCartera: 100, notas: '', ticker: 'SPY', mercado: 'EXTERIOR', cantidad: 1 });
            invEjemploId = inv.id;
            await cargarInversiones();
        } catch {}

        const limpiar = async () => {
            await Promise.allSettled([
                invEjemploId ? api.eliminarInversion(invEjemploId) : Promise.resolve(),
                window.borrarDatosEjemplo ? window.borrarDatosEjemplo() : Promise.resolve(),
            ]);
            await cargarInversiones();
        };

        iniciarTour('INVERSIONES', [
            {
                selector: '#btn-graficos-inv',
                titulo: 'Gráficos de cotización',
                texto: 'Tocá acá para ver la evolución histórica de cualquier activo. Buscá un símbolo como SPY, AAPL o GGAL, elegí el período y analizá su comportamiento antes de invertir.'
            },
            {
                selector: '#inv-posiciones-list',
                titulo: 'Datos de cada inversión',
                texto: 'Cada tarjeta muestra el activo, cuánto invertiste, el valor actual con cotización en vivo y la ganancia o pérdida en porcentaje. El ejemplo muestra un ETF SPY con $500 invertidos.'
            },
            {
                selector: '.inv-hero',
                titulo: 'Resumen de tu cartera',
                texto: 'Acá ves el total invertido, el valor actual de toda tu cartera y la variación global. Se actualizan automáticamente con las cotizaciones de mercado cada minuto.'
            },
            {
                selector: null,
                titulo: 'Limpiar datos de ejemplo',
                texto: 'Ya conocés la sección. Hacé click en "Limpiar datos" para borrar la inversión de ejemplo y empezar con las tuyas propias.',
                accion: { label: 'Limpiar datos de ejemplo', id: 'tour-btn-limpiar' }
            },
        ], {
            onSaltar: limpiar,
            onTerminar: limpiar,
        });
    }
}

function toggleInvFilterMenu(e) {
    e.stopPropagation();
    document.getElementById('inv-filter-menu').classList.toggle('hidden');
}

// ── Gráficos de TradingView (solo visual — no toca las cotizaciones que ya trae Yahoo Finance) ──

// El ticker se guarda "pelado" (ej. GGAL), igual que lo usa YahooFinanceClient (que le agrega
// ".BA" para Argentina) — acá el equivalente es prefijar la plaza de TradingView (BCBA para
// Argentina). Para EE.UU. el ticker solo (sin NASDAQ:/NYSE:) ya lo resuelve bien TradingView.
function simboloTradingView(inv) {
    return inv.mercado === 'ARGENTINA' ? `BCBA:${inv.ticker}` : inv.ticker;
}

function temaTradingView() {
    return document.body.getAttribute('data-dark-mode') === 'true' ? 'dark' : 'light';
}

// Lee las variables de tema del propio body — ahí (no en :root) es donde
// body[data-dark-mode="true"] las pisa, así el gráfico sigue el modo claro/oscuro actual.
function colorVarInv(nombre, fallback) {
    const v = getComputedStyle(document.body).getPropertyValue(nombre).trim();
    return v || fallback;
}

function crearWidgetTV(containerId, symbol, allowSymbolChange) {
    document.getElementById(containerId).innerHTML = '';
    const fondo = colorVarInv('--np-surface', '#f8f9ff');
    const texto = colorVarInv('--text-muted', '#64748B');
    const borde = colorVarInv('--border', '#E2E8F0');
    const success = colorVarInv('--success', '#10B981');
    const danger = colorVarInv('--danger', '#E11D48');

    new TradingView.widget({
        autosize: true,
        symbol: symbol || 'NASDAQ:AAPL',
        interval: 'D',
        timezone: 'America/Argentina/Buenos_Aires',
        theme: temaTradingView(),
        style: '1',
        locale: 'es',
        enable_publishing: false,
        allow_symbol_change: allowSymbolChange,
        hide_side_toolbar: true,
        container_id: containerId,
        toolbar_bg: fondo,
        // Mismos colores de suba/baja y grilla que ya usa el resto de la app (--success/--danger),
        // en vez de los verdes/rojos default de TradingView.
        overrides: {
            'paneProperties.background': fondo,
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': borde,
            'paneProperties.horzGridProperties.color': borde,
            'scalesProperties.textColor': texto,
            'mainSeriesProperties.candleStyle.upColor': success,
            'mainSeriesProperties.candleStyle.downColor': danger,
            'mainSeriesProperties.candleStyle.borderUpColor': success,
            'mainSeriesProperties.candleStyle.borderDownColor': danger,
            'mainSeriesProperties.candleStyle.wickUpColor': success,
            'mainSeriesProperties.candleStyle.wickDownColor': danger,
        },
    });
}

function toggleGraficosGenerales() {
    const seccion = document.getElementById('inv-graficos-section');
    const abriendo = seccion.classList.contains('hidden');
    seccion.classList.toggle('hidden', !abriendo);
    document.getElementById('inv-cartera-contenido').classList.toggle('hidden', abriendo);
    document.getElementById('btn-nueva-inversion').classList.toggle('hidden', abriendo);
    if (abriendo) crearWidgetTV('tv-search-container', 'NASDAQ:AAPL', true);
}

function abrirGraficoPosicion(id) {
    const inv = inversiones.find(x => x.id === id);
    if (!inv || !inv.ticker) return;
    document.getElementById('modal-tv-chart-title').textContent = `${inv.nombre} · ${inv.ticker}`;
    document.getElementById('modal-tv-chart').classList.remove('hidden');
    crearWidgetTV('tv-position-container', simboloTradingView(inv), false);
}

function cerrarModalGraficoPosicion() {
    document.getElementById('modal-tv-chart').classList.add('hidden');
    document.getElementById('tv-position-container').innerHTML = '';
}

const TIPO_LABELS = { ACCIONES: 'Acciones', FONDO: 'Fondo', BONOS: 'Bonos', ORO: 'Oro', OTRO: 'Otro' };
const MERCADO_LABELS = { EEUU: 'EE.UU. (NYSE/NASDAQ)', ARGENTINA: 'Argentina (BYMA)', EUROPA: 'Europa (Xetra)' };

function seleccionarFiltroInv(tipo) {
    filtroInvActivo = tipo;
    document.getElementById('inv-filter-menu').classList.add('hidden');
    const label = tipo === 'TODOS' ? 'Filtrar' : `Filtrar: ${TIPO_LABELS[tipo]}`;
    document.getElementById('inv-filter-btn').innerHTML = `
        <span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px">filter_list</span>
        ${label}`;
    renderPosiciones();
}

async function cargarInversiones() {
    try {
        inversiones = await api.listarInversiones();
        resumenActual = await api.resumenCartera();
        await cargarCotizaciones();
        renderCartera();
        renderPosiciones();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cargarCotizaciones() {
    try {
        const lista = await api.obtenerCotizaciones();
        cotizacionesPorId = Object.fromEntries(lista.map(c => [c.inversionId, c]));
    } catch (err) {
        // Si falla (sin conexión, API caída), la cartera sigue funcionando sin precios en vivo.
        cotizacionesPorId = {};
    }
}

async function refrescarCotizaciones() {
    await cargarCotizaciones();
    renderPosiciones();
    renderResumenCotizaciones();
    renderRankingCotizaciones();
    renderTabsEvolucion();
    cargarEvolucion();
}

function renderCartera() {
    document.getElementById('inv-total-value').textContent = fmt(resumenActual.totalInvertido);
    renderResumenCotizaciones();
    renderRankingCotizaciones();
    renderTabsEvolucion();
    cargarEvolucion();

    const montos = resumenActual.montosPorTipo || {};
    const porcs = resumenActual.porcentajesReales || {};
    const segments = Object.keys(montos)
        .filter(tipo => montos[tipo] > 0)
        .map(tipo => ({ label: tipo, value: montos[tipo], color: TIPO_COLORS[tipo] || '#64748B' }));

    const bento = document.getElementById('inv-bento');
    if (!segments.length) {
        bento.style.display = 'none';
        return;
    }
    bento.style.display = '';

    const wrapper = document.getElementById('inv-donut-wrapper');
    wrapper.innerHTML = `
        ${buildDonut(segments, { size: 160, stroke: 20 })}
        <div class="dash-donut-center">
            <div class="dash-donut-center-label">Diversificación</div>
            <div class="dash-donut-center-value">${segments.length} categoría${segments.length === 1 ? '' : 's'}</div>
        </div>
    `;

    document.getElementById('inv-legend-grid').innerHTML = segments.map(s => `
        <div class="inv-legend-item">
            <span class="inv-legend-dot" style="background:${s.color}"></span>
            <div>
                <div class="inv-legend-label">${s.label}</div>
                <div class="inv-legend-pct">${porcs[s.label] ?? 0}%</div>
            </div>
        </div>`).join('');

    renderRebalanceCard();
}

function calcularDesviacion(inv, total) {
    const actual = total > 0 ? (Number(inv.montoInvertido) / total) * 100 : 0;
    const objetivo = Number(inv.porcentajeCartera);
    return { actual, objetivo, desv: actual - objetivo };
}

function renderRebalanceCard() {
    const cont = document.getElementById('inv-rebalance-card');
    const total = Number(resumenActual.totalInvertido) || 0;
    if (!inversiones.length || total <= 0) {
        cont.innerHTML = '';
        return;
    }

    let peor = null;
    agruparInversiones(inversiones).forEach(g => {
        const d = calcularDesviacion(g, total);
        if (!peor || Math.abs(d.desv) > Math.abs(peor.desv)) peor = { g, ...d };
    });

    if (!peor || Math.abs(peor.desv) < 3) {
        cont.innerHTML = `
            <div class="inv-rebalance-head">
                <span class="material-symbols-outlined" style="color:var(--success)">verified</span>
                <h3>Cartera Balanceada</h3>
            </div>
            <p>Tus posiciones están dentro del margen de tolerancia respecto a tus objetivos de asignación. No hay acciones sugeridas por ahora.</p>`;
        return;
    }

    const signo = peor.desv > 0 ? '+' : '';
    const accion = peor.desv > 0 ? 'liquidar el excedente de' : 'reforzar';
    cont.innerHTML = `
        <div class="inv-rebalance-head">
            <span class="material-symbols-outlined">auto_fix_high</span>
            <h3>Rebalanceo Sugerido</h3>
            <span class="inv-rebalance-tag">${signo}${peor.desv.toFixed(1)}%</span>
        </div>
        <p>
            <strong>${peor.g.nombre}</strong> (${peor.g.tipo}) representa el ${peor.actual.toFixed(1)}% de tu cartera,
            contra un objetivo del ${peor.objetivo.toFixed(1)}%. Considerá ${accion} esta posición para volver a tu meta de asignación.
        </p>`;
}

function renderPosiciones() {
    const cont = document.getElementById('inv-posiciones-list');
    const total = Number(resumenActual?.totalInvertido) || 0;
    let lista = inversiones;
    if (filtroInvActivo !== 'TODOS') lista = lista.filter(i => i.tipo === filtroInvActivo);

    if (!inversiones.length) {
        cont.innerHTML = emptyState({
            icon: '<span class="material-symbols-outlined">pie_chart</span>',
            title: 'Todavía no cargaste inversiones',
            text: 'Registrá tu primera posición para hacer seguimiento de tu cartera.',
            actionLabel: '+ Nueva inversión',
            actionOnClick: 'abrirModalInv()',
        });
        return;
    }
    if (!lista.length) {
        cont.innerHTML = emptyState({
            icon: '<span class="material-symbols-outlined">pie_chart</span>',
            title: 'Nada para mostrar con este filtro',
            text: 'Probá con otro tipo de activo.',
        });
        return;
    }

    const grupos = agruparInversiones(lista);
    gruposPosicionesActuales = Object.fromEntries(grupos.map(g => [g.key, g]));

    cont.innerHTML = grupos.map(g => {
        const { actual, objetivo, desv } = calcularDesviacion(g, total);
        const enObjetivo = Math.abs(desv) < 0.5;
        const desvLabel = enObjetivo ? 'En objetivo' : `${desv > 0 ? '+' : ''}${desv.toFixed(1)}% (${desv > 0 ? 'Excedido' : 'Por debajo'})`;
        const color = TIPO_COLORS[g.tipo] || '#64748B';
        const cotizacionHtml = renderCotizacionBlock(agruparCotizacion(g.lotes));
        const multiplesAportes = g.lotes.length > 1;
        const subtitulo = multiplesAportes
            ? `${g.lotes.length} aportes${g.precioPromedio != null ? ` · precio prom. ${fmtMoneda(g.precioPromedio, g.mercado)}` : ''}`
            : (g.lotes[0].notas || TIPO_LABELS[g.tipo]);
        return `
        <div class="np-flat inv-pos-card">
            <div class="inv-pos-top">
                <div class="inv-pos-left">
                    <span class="inv-pos-icon" style="background:${color}22;color:${color}">
                        <span class="material-symbols-outlined">${TIPO_ICONS[g.tipo] || 'category'}</span>
                    </span>
                    <div>
                        <h4>${g.nombre}</h4>
                        <p>${subtitulo}</p>
                    </div>
                </div>
                <div class="inv-pos-right">
                    <div class="inv-pos-monto">${fmt(g.montoInvertido)}</div>
                    <div class="inv-pos-actions">
                        ${g.ticker ? `<button class="btn-icon inv-icon-btn" title="Ver gráfico" onclick="abrirGraficoPosicion(${g.lotes[0].id})">
                            <span class="material-symbols-outlined">show_chart</span>
                        </button>` : ''}
                        <button class="btn-icon inv-icon-btn" title="Agregar aporte" onclick="abrirModalInvNuevoAporte('${g.key}')">
                            <span class="material-symbols-outlined">add</span>
                        </button>
                        ${multiplesAportes ? `<button class="btn-icon inv-icon-btn" title="Ver aportes" onclick="toggleLotesInv('${g.key}')">
                            <span class="material-symbols-outlined">expand_more</span>
                        </button>` : `<button class="btn-icon inv-icon-btn" title="Editar" onclick="abrirModalInv(${g.lotes[0].id})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn-icon inv-icon-btn" title="Eliminar" onclick="eliminarInversion(${g.lotes[0].id})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>`}
                    </div>
                </div>
            </div>
            <div class="inv-pos-bar-row">
                <span>Desviación Objetivo</span>
                <span class="${enObjetivo ? '' : 'inv-desv-off'}">${desvLabel}</span>
            </div>
            <div class="inv-pos-bar-track">
                <div class="inv-pos-bar-fill" style="width:${Math.min(actual, 100)}%;background:${color}"></div>
            </div>
            <div class="inv-pos-bar-labels">
                <span>META: ${objetivo.toFixed(1)}%</span>
                <span>ACTUAL: ${actual.toFixed(1)}%</span>
            </div>
            ${cotizacionHtml}
            ${multiplesAportes ? `<div class="inv-pos-lotes hidden" id="lotes-${g.key}">
                ${g.lotes.map(l => `
                <div class="inv-lote-row">
                    <span class="inv-lote-fecha">${fmtDate(l.fechaRegistro)}</span>
                    <span class="inv-lote-cantidad">${l.cantidad != null ? Number(l.cantidad).toFixed(4) : '—'}</span>
                    <span class="inv-lote-monto">${fmt(l.montoInvertido)}</span>
                    <button class="btn-icon inv-icon-btn" title="Editar" onclick="abrirModalInv(${l.id})"><span class="material-symbols-outlined" style="font-size:16px">edit</span></button>
                    <button class="btn-icon inv-icon-btn" title="Eliminar" onclick="eliminarInversion(${l.id})"><span class="material-symbols-outlined" style="font-size:16px">delete</span></button>
                </div>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
}

// Agrupa lotes (una fila = un aporte en una fecha) del mismo activo — "mismo activo" es
// nombre+tipo, no ticker, porque el ticker es opcional (Bonos/Oro/Otro no siempre lo tienen).
// El % objetivo se suma (cada lote ya trae su porción del objetivo total del activo, repartida
// al cargarlos) y el precio promedio es el costo ponderado: monto total / cantidad total.
function agruparInversiones(lista) {
    const grupos = new Map();
    lista.forEach(inv => {
        const key = `${inv.nombre}|${inv.tipo}`;
        if (!grupos.has(key)) {
            grupos.set(key, {
                key, nombre: inv.nombre, tipo: inv.tipo, ticker: inv.ticker, mercado: inv.mercado,
                montoInvertido: 0, cantidad: 0, tieneCantidad: true, porcentajeCartera: 0, lotes: [],
            });
        }
        const g = grupos.get(key);
        g.montoInvertido += Number(inv.montoInvertido);
        g.porcentajeCartera += Number(inv.porcentajeCartera);
        if (inv.cantidad != null) g.cantidad += Number(inv.cantidad); else g.tieneCantidad = false;
        g.lotes.push(inv);
    });
    const out = [...grupos.values()];
    out.forEach(g => {
        g.lotes.sort((a, b) => (a.fechaRegistro || '').localeCompare(b.fechaRegistro || ''));
        g.precioPromedio = (g.tieneCantidad && g.cantidad > 0) ? g.montoInvertido / g.cantidad : null;
    });
    out.sort((a, b) => b.montoInvertido - a.montoInvertido);
    return out;
}

// Suma valorMercado/gananciaPerdida de los lotes de un mismo activo — precioActual/variación
// son iguales en todos los lotes (mismo ticker), así que se toman del primero disponible.
function agruparCotizacion(lotes) {
    const cots = lotes.map(l => cotizacionesPorId[l.id]).filter(Boolean);
    if (!cots.length) return null;
    const disponible = cots.find(c => c.disponible);
    if (!disponible) return cots[0];

    const conValor = cots.filter(c => c.valorMercado != null);
    let valorMercado = null, gananciaPerdida = null, gananciaPerdidaPct = null;
    if (conValor.length) {
        valorMercado = conValor.reduce((s, c) => s + Number(c.valorMercado), 0);
        gananciaPerdida = conValor.reduce((s, c) => s + Number(c.gananciaPerdida), 0);
        const montoBase = valorMercado - gananciaPerdida;
        if (montoBase > 0) gananciaPerdidaPct = (gananciaPerdida * 100) / montoBase;
    }
    return {
        disponible: true,
        ticker: disponible.ticker,
        mercado: disponible.mercado,
        precioActual: disponible.precioActual,
        variacionDiariaPct: disponible.variacionDiariaPct,
        historico: disponible.historico,
        valorMercado, gananciaPerdida, gananciaPerdidaPct,
    };
}

let gruposPosicionesActuales = {};

function toggleLotesInv(key) {
    document.getElementById(`lotes-${key}`).classList.toggle('hidden');
}

function abrirModalInvNuevoAporte(key) {
    const g = gruposPosicionesActuales[key];
    if (!g) return;
    abrirModalInv();
    document.getElementById('modal-inv-title').textContent = `Nuevo aporte · ${g.nombre}`;
    document.getElementById('inv-nombre').value = g.nombre;
    document.getElementById('inv-tipo').value = g.tipo;
    document.getElementById('inv-ticker').value = g.ticker || '';
    if (g.mercado) document.getElementById('inv-mercado').value = g.mercado;
    actualizarVisibilidadCamposAcciones();
}

function actualizarVisibilidadCamposAcciones() {
    const tipo = document.getElementById('inv-tipo').value;
    document.getElementById('inv-acciones-fields').classList.toggle('hidden', tipo !== 'ACCIONES' && tipo !== 'FONDO');
}

// Autocompletado de tickers: reutiliza el panel/posicionamiento genérico de los
// custom-select (abrirCustomSelectPanel/cerrarCustomSelects, en utils.js) en vez de
// construir un dropdown nuevo — no dependen de crearCustomSelect, cualquier panel/campo sirve.
let tickerBusquedaTimer = null;

function onBuscarTickerInput(e) {
    clearTimeout(tickerBusquedaTimer);
    const texto = e.target.value.trim();
    if (texto.length < 2) {
        cerrarCustomSelects();
        return;
    }
    tickerBusquedaTimer = setTimeout(async () => {
        let sugerencias = [];
        try {
            sugerencias = await api.buscarTickers(texto);
        } catch (err) {
            sugerencias = [];
        }
        renderSugerenciasTicker(sugerencias);
    }, 300);
}

function renderSugerenciasTicker(sugerencias) {
    const panel = document.getElementById('inv-ticker-panel');
    if (!sugerencias.length) {
        cerrarCustomSelects();
        return;
    }
    panel.innerHTML = sugerencias.map(s => `
        <div class="custom-select-option" data-ticker="${s.ticker}" data-mercado="${s.mercado}">
            <strong>${s.ticker}</strong>
            <span class="inv-ticker-sugerencia-meta">${s.nombre} · ${MERCADO_LABELS[s.mercado] || s.mercado}</span>
        </div>`).join('');
    panel.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.getElementById('inv-ticker').value = opt.dataset.ticker;
            document.getElementById('inv-mercado').value = opt.dataset.mercado;
            cerrarCustomSelects();
        });
    });
    abrirCustomSelectPanel(panel, document.getElementById('inv-ticker'));
}

// Las cotizaciones de EE.UU. vienen en USD y las de Argentina en ARS — fmt() del resto
// de la app siempre muestra ARS, así que acá usamos un formateador propio para no
// etiquetar un precio en dólares como si fueran pesos.
function fmtMoneda(n, mercado) {
    const currency = mercado === 'EEUU' ? 'USD' : 'ARS';
    const locale = mercado === 'EEUU' ? 'en-US' : 'es-AR';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n ?? 0);
}

function renderCotizacionBlock(cot) {
    if (!cot) return '';
    if (!cot.disponible) {
        return `<div class="inv-pos-cotizacion inv-pos-cotizacion-na">${cot.mensaje || 'Cotización no disponible'}</div>`;
    }
    const variacion = Number(cot.variacionDiariaPct);
    const variacionClase = variacion >= 0 ? 'text-success' : 'text-danger';
    const variacionSigno = variacion >= 0 ? '+' : '';
    let html = `<div class="inv-pos-cotizacion">
        ${cot.historico && cot.historico.length >= 2 ? buildSparkline(cot.historico.map(Number)) : ''}
        <span>${cot.ticker}: ${fmtMoneda(cot.precioActual, cot.mercado)}</span>
        ${cot.variacionDiariaPct != null ? `<span class="${variacionClase}">${variacionSigno}${variacion.toFixed(2)}% hoy</span>` : ''}`;
    if (cot.valorMercado != null) {
        const gp = Number(cot.gananciaPerdida);
        const gpClase = gp >= 0 ? 'text-success' : 'text-danger';
        const gpSigno = gp >= 0 ? '+' : '';
        html += `
        <span>Valor de mercado: ${fmtMoneda(cot.valorMercado, cot.mercado)}</span>
        <span class="${gpClase}">${gpSigno}${fmtMoneda(gp, cot.mercado)}${cot.gananciaPerdidaPct != null ? ` (${gpSigno}${Number(cot.gananciaPerdidaPct).toFixed(1)}%)` : ''}</span>`;
    }
    html += `</div>`;
    return html;
}

// Suma valorMercado/gananciaPerdida por mercado (nunca entre mercados distintos — mezclar
// USD y ARS sin tipo de cambio real sería un dato inventado) y pinta una card por cada
// mercado en el que el usuario tenga al menos una posición con cantidad cargada.
function renderResumenCotizaciones() {
    const cont = document.getElementById('inv-cotiz-mercados');
    if (!cont) return;
    const porMercado = {};
    Object.values(cotizacionesPorId).forEach(cot => {
        if (!cot.disponible || cot.valorMercado == null) return;
        if (!porMercado[cot.mercado]) porMercado[cot.mercado] = { valorMercado: 0, gananciaPerdida: 0 };
        porMercado[cot.mercado].valorMercado += Number(cot.valorMercado);
        porMercado[cot.mercado].gananciaPerdida += Number(cot.gananciaPerdida);
    });
    const mercados = Object.keys(porMercado);
    if (!mercados.length) { cont.innerHTML = ''; return; }

    cont.innerHTML = `<div class="inv-cotiz-resumen-grid">${mercados.map(m => {
        const d = porMercado[m];
        const montoBase = d.valorMercado - d.gananciaPerdida;
        const pct = montoBase > 0 ? (d.gananciaPerdida * 100 / montoBase) : 0;
        const gpClase = d.gananciaPerdida >= 0 ? 'text-success' : 'text-danger';
        const gpSigno = d.gananciaPerdida >= 0 ? '+' : '';
        return `
        <div class="np-flat inv-cotiz-card">
            <div class="np-label-sm">${MERCADO_LABELS[m] || m}</div>
            <div class="inv-cotiz-card-valor">${fmtMoneda(d.valorMercado, m)}</div>
            <div class="${gpClase}">${gpSigno}${fmtMoneda(d.gananciaPerdida, m)} (${gpSigno}${pct.toFixed(1)}%) hoy</div>
        </div>`;
    }).join('')}</div>`;
}

// Ranking de mejores/peores del día por variación %. Acá sí se puede comparar entre
// mercados distintos porque es un porcentaje, no una suma de montos en moneda.
// Una entrada por activo (no por aporte) — todos los lotes de un mismo activo comparten ticker
// y variación diaria, así que sin agrupar el mismo ticker aparecía repetido una vez por cada
// aporte cargado.
function renderRankingCotizaciones() {
    const cont = document.getElementById('inv-cotiz-ranking');
    if (!cont) return;
    const disponibles = agruparInversiones(inversiones)
        .map(g => ({ nombre: g.nombre, cot: agruparCotizacion(g.lotes) }))
        .filter(x => x.cot && x.cot.disponible && x.cot.variacionDiariaPct != null)
        .sort((a, b) => Number(b.cot.variacionDiariaPct) - Number(a.cot.variacionDiariaPct));

    if (disponibles.length < 2) { cont.innerHTML = ''; return; }

    const mejores = disponibles.slice(0, 3);
    const peores = disponibles.slice(-3).reverse();

    const item = x => {
        const v = Number(x.cot.variacionDiariaPct);
        const clase = v >= 0 ? 'text-success' : 'text-danger';
        const signo = v >= 0 ? '+' : '';
        return `<div class="inv-ranking-item"><span>${x.nombre}</span><span class="${clase}">${signo}${v.toFixed(2)}%</span></div>`;
    };

    cont.innerHTML = `
        <div class="np-flat inv-cotiz-card">
            <div class="np-label-sm">Movimientos del día</div>
            <div class="inv-ranking-grid">
                <div>
                    <div class="inv-ranking-col-label">Mejores</div>
                    ${mejores.map(item).join('')}
                </div>
                <div>
                    <div class="inv-ranking-col-label">Peores</div>
                    ${peores.map(item).join('')}
                </div>
            </div>
        </div>`;
}

// Gráfico de evolución de la cartera (estilo Trade Republic): un índice ponderado por costo,
// un mercado a la vez (nunca se mezcla USD/ARS). El selector de mercado es un desplegable
// (crearCustomSelect, mismo componente que el resto de la app) en vez de tabs, para que
// escale bien cuando se agreguen más mercados — agregar uno nuevo el día de mañana solo
// implica sumarlo a MERCADO_LABELS, sin tocar el layout.
function renderTabsEvolucion() {
    const mercados = Object.keys(MERCADO_LABELS);
    if (!evolucionMercado || !mercados.includes(evolucionMercado)) {
        evolucionMercado = mercados[0];
    }

    crearCustomSelect('inv-evolucion-mercado',
        mercados.map(m => ({ valor: m, texto: MERCADO_LABELS[m] })), null);
    document.getElementById('inv-evolucion-mercado').value = evolucionMercado;

    const periodosCont = document.getElementById('inv-evolucion-periodos');
    periodosCont.innerHTML = PERIODOS_EVOLUCION.map(p => `
        <button type="button" class="tab np-tab ${p === evolucionPeriodo ? 'active' : ''}" data-periodo="${p}">${p === 'MAX' ? 'Máx.' : p}</button>
    `).join('');
    periodosCont.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            evolucionPeriodo = btn.dataset.periodo;
            periodosCont.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            cargarEvolucion();
        });
    });
}

async function cargarEvolucion() {
    if (!evolucionMercado) return;
    try {
        const evo = await api.obtenerEvolucion(evolucionMercado, evolucionPeriodo);
        renderEvolucion(evo);
    } catch (err) {
        renderEvolucion({ disponible: false, mensaje: err.message });
    }
}

function renderEvolucion(evo) {
    const variacionCont = document.getElementById('inv-evolucion-variacion');
    const chartCont = document.getElementById('inv-evolucion-chart');
    if (!evo.disponible) {
        variacionCont.innerHTML = '';
        chartCont.innerHTML = `<p class="inv-pos-cotizacion-na">${evo.mensaje || 'Sin datos disponibles'}</p>`;
        return;
    }
    const pct = Number(evo.variacionTotalPct);
    const clase = pct >= 0 ? 'text-success' : 'text-danger';
    const signo = pct >= 0 ? '+' : '';
    variacionCont.innerHTML = `<span class="${clase}">${signo}${pct.toFixed(2)}%</span>`;
    chartCont.innerHTML = buildSparkline(evo.valoresPct.map(Number), { width: 260, height: 64 });
}

function abrirModalInv(id) {
    const modal = document.getElementById('modal-inversion');
    document.getElementById('form-inversion').reset();
    document.getElementById('inv-id').value = '';
    document.getElementById('modal-inv-title').textContent = 'Nueva Inversión';
    crearCustomSelect('inv-tipo',
        Object.entries(TIPO_LABELS).map(([valor, texto]) => ({ valor, texto })), null);
    crearCustomSelect('inv-mercado',
        Object.entries(MERCADO_LABELS).map(([valor, texto]) => ({ valor, texto })), 'Seleccionar mercado');
    document.getElementById('inv-ticker-panel').classList.add('hidden');
    crearDatePicker('inv-fecha', 'Elegí una fecha', null, document.getElementById('inv-fecha').closest('.tx-field'));
    document.getElementById('inv-fecha').value = new Date().toISOString().slice(0, 10);

    if (id) {
        const inv = inversiones.find(x => x.id === id);
        if (inv) {
            document.getElementById('modal-inv-title').textContent = 'Editar Inversión';
            document.getElementById('inv-id').value = inv.id;
            document.getElementById('inv-nombre').value = inv.nombre;
            document.getElementById('inv-tipo').value = inv.tipo;
            document.getElementById('inv-fecha').value = inv.fechaRegistro || document.getElementById('inv-fecha').value;
            document.getElementById('inv-monto').value = inv.montoInvertido;
            document.getElementById('inv-porcentaje').value = inv.porcentajeCartera;
            document.getElementById('inv-notas').value = inv.notas || '';
            document.getElementById('inv-ticker').value = inv.ticker || '';
            if (inv.mercado) document.getElementById('inv-mercado').value = inv.mercado;
            document.getElementById('inv-cantidad').value = inv.cantidad || '';
        }
    }
    actualizarVisibilidadCamposAcciones();
    modal.classList.remove('hidden');
}

function cerrarModalInv() {
    document.getElementById('modal-inversion').classList.add('hidden');
}

async function guardarInversion(e) {
    e.preventDefault();
    const id = document.getElementById('inv-id').value;
    const ticker = document.getElementById('inv-ticker').value.trim();
    const cantidad = document.getElementById('inv-cantidad').value;
    const dto = {
        nombre: document.getElementById('inv-nombre').value,
        tipo: document.getElementById('inv-tipo').value,
        fechaRegistro: document.getElementById('inv-fecha').value,
        montoInvertido: +document.getElementById('inv-monto').value,
        porcentajeCartera: +document.getElementById('inv-porcentaje').value,
        notas: document.getElementById('inv-notas').value,
        ticker: ticker || null,
        mercado: document.getElementById('inv-mercado').value || null,
        cantidad: cantidad ? +cantidad : null,
    };
    try {
        if (id) {
            await api.actualizarInversion(+id, dto);
        } else {
            await api.agregarInversion(dto);
        }
        cerrarModalInv();
        await cargarInversiones();
        showToast('Inversión guardada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function eliminarInversion(id) {
    if (!(await confirmDialog({ title: '¿Eliminar esta inversión?' }))) return;
    try {
        await api.eliminarInversion(id);
        await cargarInversiones();
        showToast('Inversión eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
