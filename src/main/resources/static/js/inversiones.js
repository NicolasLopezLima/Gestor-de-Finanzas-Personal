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
}

function toggleInvFilterMenu(e) {
    e.stopPropagation();
    document.getElementById('inv-filter-menu').classList.toggle('hidden');
}

const TIPO_LABELS = { ACCIONES: 'Acciones', BONOS: 'Bonos', ORO: 'Oro', OTRO: 'Otro' };
const MERCADO_LABELS = { EEUU: 'EE.UU. (NYSE/NASDAQ)', ARGENTINA: 'Argentina (BYMA)' };

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
    inversiones.forEach(inv => {
        const d = calcularDesviacion(inv, total);
        if (!peor || Math.abs(d.desv) > Math.abs(peor.desv)) peor = { inv, ...d };
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
            <strong>${peor.inv.nombre}</strong> (${peor.inv.tipo}) representa el ${peor.actual.toFixed(1)}% de tu cartera,
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
            icon: '📊',
            title: 'Todavía no cargaste inversiones',
            text: 'Registrá tu primera posición para hacer seguimiento de tu cartera.',
            actionLabel: '+ Nueva inversión',
            actionOnClick: 'abrirModalInv()',
        });
        return;
    }
    if (!lista.length) {
        cont.innerHTML = emptyState({
            icon: '📊',
            title: 'Nada para mostrar con este filtro',
            text: 'Probá con otro tipo de activo.',
        });
        return;
    }

    cont.innerHTML = lista.map(inv => {
        const { actual, objetivo, desv } = calcularDesviacion(inv, total);
        const enObjetivo = Math.abs(desv) < 0.5;
        const desvLabel = enObjetivo ? 'En objetivo' : `${desv > 0 ? '+' : ''}${desv.toFixed(1)}% (${desv > 0 ? 'Excedido' : 'Por debajo'})`;
        const color = TIPO_COLORS[inv.tipo] || '#64748B';
        const cotizacionHtml = renderCotizacionBlock(cotizacionesPorId[inv.id]);
        return `
        <div class="np-flat inv-pos-card">
            <div class="inv-pos-top">
                <div class="inv-pos-left">
                    <span class="inv-pos-icon" style="background:${color}22;color:${color}">
                        <span class="material-symbols-outlined">${TIPO_ICONS[inv.tipo] || 'category'}</span>
                    </span>
                    <div>
                        <h4>${inv.nombre}</h4>
                        <p>${inv.notas ? inv.notas : inv.tipo}</p>
                    </div>
                </div>
                <div class="inv-pos-right">
                    <div class="inv-pos-monto">${fmt(inv.montoInvertido)}</div>
                    <div class="inv-pos-actions">
                        <button class="btn-icon inv-icon-btn" title="Editar" onclick="abrirModalInv(${inv.id})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn-icon inv-icon-btn" title="Eliminar" onclick="eliminarInversion(${inv.id})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
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
        </div>`;
    }).join('');
}

function actualizarVisibilidadCamposAcciones() {
    const tipo = document.getElementById('inv-tipo').value;
    document.getElementById('inv-acciones-fields').classList.toggle('hidden', tipo !== 'ACCIONES');
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
function renderRankingCotizaciones() {
    const cont = document.getElementById('inv-cotiz-ranking');
    if (!cont) return;
    const disponibles = Object.values(cotizacionesPorId)
        .filter(c => c.disponible && c.variacionDiariaPct != null)
        .sort((a, b) => Number(b.variacionDiariaPct) - Number(a.variacionDiariaPct));

    if (disponibles.length < 2) { cont.innerHTML = ''; return; }

    const mejores = disponibles.slice(0, 3);
    const peores = disponibles.slice(-3).reverse();

    const item = c => {
        const v = Number(c.variacionDiariaPct);
        const clase = v >= 0 ? 'text-success' : 'text-danger';
        const signo = v >= 0 ? '+' : '';
        return `<div class="inv-ranking-item"><span>${c.ticker}</span><span class="${clase}">${signo}${v.toFixed(2)}%</span></div>`;
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
    if (!confirm('¿Eliminar esta inversión?')) return;
    try {
        await api.eliminarInversion(id);
        await cargarInversiones();
        showToast('Inversión eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
