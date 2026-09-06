// Vista 3D — bubble chart neumórfico plano (según el artifact publicado), no esferas WebGL.
// Script clásico: comparte scope global con el resto de la app, como todos los demás.

const VISTA3D_MIN_RADIO = 48;
const VISTA3D_MAX_RADIO = 115;

// Paleta cíclica para categorías sin un color propio (Ingreso/Gasto/Inversión) — a diferencia de
// Metas, que sí tiene un color con significado (por estado).
const VISTA3D_PALETA = ['#E11D48', '#8B5CF6', '#D97706', '#0284C7', '#10B981', '#DB2777', '#65A30D', '#0EA5E9'];
const VISTA3D_COLOR_META_ESTADO = { ACTIVA: '#2563eb', COMPLETADA: '#059669', VENCIDA: '#E11D48' };
const VISTA3D_ICONO_INVERSION = { ACCIONES: 'trending_up', BONOS: 'account_balance', ORO: 'workspace_premium', OTRO: 'pie_chart' };

let vista3dTipoActual = null;
let vista3dItems = [];
let vista3dBodies = [];   // { x, y, vx, vy, radio, item }
let vista3dEls = [];      // <div> paralelos a vista3dBodies
let vista3dCampo = { w: 0, h: 0 };
let vista3dAnimId = null;
let vista3dUltimoTs = 0;
let vista3dDragIdx = -1;
let vista3dDragOffX = 0, vista3dDragOffY = 0;
let vista3dPointerDownPos = null;
let vista3dPointerDownTime = 0;
let vista3dUltimoPointer = null; // { x, y, t } — para estimar velocidad de soltada

function vista3dAsegurarPagina(pageId) {
    if (pages[pageId] && !pages[pageId].loaded) {
        pages[pageId].init();
        pages[pageId].loaded = true;
    }
}

// Mezcla un color hex con blanco — se usa para el degradé decorativo de la burbuja más grande.
function vista3dAclarar(hex, factor) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * factor);
    const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * factor);
    const b = Math.round((n & 255) + (255 - (n & 255)) * factor);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

async function vista3dObtenerItems(tipo) {
    if (tipo === 'META') {
        vista3dAsegurarPagina('metas');
        const metas = await api.listarMetas();
        return metas.filter(m => m.montoAcumulado > 0).map(m => ({
            id: m.id, nombre: m.nombre, monto: m.montoAcumulado,
            icono: m.icono || 'track_changes',
            color: VISTA3D_COLOR_META_ESTADO[m.estado] || VISTA3D_COLOR_META_ESTADO.ACTIVA,
        }));
    }
    if (tipo === 'INVERSION') {
        vista3dAsegurarPagina('inversiones');
        const inversiones = await api.listarInversiones();
        return inversiones.filter(inv => inv.montoInvertido > 0).map((inv, i) => ({
            id: inv.id, nombre: inv.nombre, monto: inv.montoInvertido,
            icono: VISTA3D_ICONO_INVERSION[inv.tipo] || 'pie_chart',
            color: VISTA3D_PALETA[i % VISTA3D_PALETA.length],
        }));
    }
    // INGRESO / GASTO: agrupa las transacciones del período actualmente seleccionado por categoría.
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    const periodo = await api.getPeriodo(anio, mes);
    const porCategoria = new Map();
    (periodo.transacciones || [])
        .filter(t => t.tipo === tipo)
        .forEach(t => porCategoria.set(t.categoria, (porCategoria.get(t.categoria) || 0) + Number(t.monto)));
    return [...porCategoria.entries()].map(([categoria, monto], i) => ({
        id: categoria, nombre: categoria, monto,
        icono: iconoDeCategoria(tipo, categoria) || 'category',
        color: VISTA3D_PALETA[i % VISTA3D_PALETA.length],
    }));
}

function vista3dTextoTotal(tipo) {
    switch (tipo) {
        case 'INGRESO': return 'El tamaño de cada burbuja representa cuánto pesa esa categoría sobre tus ingresos del mes.';
        case 'GASTO': return 'El tamaño de cada burbuja representa cuánto pesa esa categoría sobre tu gasto total.';
        case 'META': return 'El tamaño de cada burbuja representa cuánto acumulaste en cada meta.';
        case 'INVERSION': return 'El tamaño de cada burbuja representa cuánto invertiste en cada posición.';
        default: return '';
    }
}

function vista3dEscala(radio) {
    const iconSize = Math.max(22, Math.min(44, radio * 0.42 + 6));
    return {
        iconSize,
        iconRadius: iconSize * 0.29,
        iconFont: iconSize * 0.53,
        nombreSize: Math.max(9, Math.min(15, radio * 0.045 + 8.5)),
    };
}

function vista3dCrearBurbujas(items) {
    const campo = document.getElementById('vista3d-bubble-field');
    campo.innerHTML = '';
    vista3dBodies = [];
    vista3dEls = [];

    document.getElementById('vista3d-empty').classList.toggle('hidden', items.length > 0);
    if (!items.length) return;

    const rect = campo.getBoundingClientRect();
    vista3dCampo = { w: rect.width, h: rect.height };

    const maxMonto = Math.max(...items.map(it => it.monto), 1);
    const totalMonto = items.reduce((s, it) => s + it.monto, 0);
    const idxHero = items.reduce((best, it, i) => (it.monto > items[best].monto ? i : best), 0);

    items.forEach((it, i) => {
        const proporcion = Math.cbrt(it.monto / maxMonto);
        const radio = VISTA3D_MIN_RADIO + (VISTA3D_MAX_RADIO - VISTA3D_MIN_RADIO) * proporcion;
        const d = radio * 2;
        const esHero = i === idxHero && items.length > 1;
        const { iconSize, iconRadius, iconFont, nombreSize } = vista3dEscala(radio);
        const montoSize = esHero ? nombreSize + 2 : nombreSize;
        const pct = ((it.monto / totalMonto) * 100).toFixed(1);

        const el = document.createElement('div');
        el.className = 'vista3d-bubble';
        el.style.width = `${d}px`;
        el.style.height = `${d}px`;
        el.innerHTML = `
            ${esHero ? `<div class="vista3d-bubble-glow" style="width:${d * 0.87}px;height:${d * 0.87}px;background:conic-gradient(${it.color},${vista3dAclarar(it.color, 0.35)})"></div>` : ''}
            <div class="vista3d-bubble-content">
                <div class="vista3d-bubble-icon" style="width:${iconSize}px;height:${iconSize}px;border-radius:${iconRadius}px;background:${it.color}1F;color:${it.color};margin-bottom:${radio * 0.09}px">
                    <span class="material-symbols-outlined" style="font-size:${iconFont}px">${it.icono}</span>
                </div>
                <div class="vista3d-bubble-nombre" style="font-size:${nombreSize}px">${it.nombre.length > 14 ? it.nombre.slice(0, 13) + '…' : it.nombre}</div>
                <div class="vista3d-bubble-monto" style="font-size:${montoSize}px;color:${it.color}">${fmt(it.monto)}</div>
                ${esHero ? `<div class="vista3d-bubble-pct" style="font-size:11px;margin-top:2px">${pct}% del total</div>` : ''}
            </div>`;
        campo.appendChild(el);

        // Arrancan esparcidas en espiral (no todas apiladas en el centro).
        const angulo = i * 2.4;
        const radioSpawn = Math.min(radio + 20 + i * 25, Math.min(vista3dCampo.w, vista3dCampo.h) / 2 - radio);
        const cx = vista3dCampo.w / 2 + Math.cos(angulo) * Math.max(0, radioSpawn);
        const cy = vista3dCampo.h / 2 + Math.sin(angulo) * Math.max(0, radioSpawn);

        vista3dBodies.push({
            x: Math.max(radio, Math.min(vista3dCampo.w - radio, cx)),
            y: Math.max(radio, Math.min(vista3dCampo.h - radio, cy)),
            vx: 0, vy: 0, radio,
            driftTarget: { x: 0, y: 0 }, driftChangeAt: 0,
            item: it,
        });
        vista3dEls.push(el);
    });
}

function vista3dActualizarDrift(b, tSeg) {
    if (tSeg > b.driftChangeAt) {
        const fuerza = 12; // px/s
        b.driftTarget = { x: (Math.random() - 0.5) * fuerza, y: (Math.random() - 0.5) * fuerza };
        b.driftChangeAt = tSeg + 2 + Math.random() * 2;
    }
    b.vx += (b.driftTarget.x - b.vx) * 0.01;
    b.vy += (b.driftTarget.y - b.vy) * 0.01;
}

function vista3dLimites(b) {
    if (b.x - b.radio < 0) { b.x = b.radio; if (b.vx < 0) b.vx *= -0.6; }
    if (b.x + b.radio > vista3dCampo.w) { b.x = vista3dCampo.w - b.radio; if (b.vx > 0) b.vx *= -0.6; }
    if (b.y - b.radio < 0) { b.y = b.radio; if (b.vy < 0) b.vy *= -0.6; }
    if (b.y + b.radio > vista3dCampo.h) { b.y = vista3dCampo.h - b.radio; if (b.vy > 0) b.vy *= -0.6; }
}

// Colisión elástica simplificada entre dos círculos: separa el solapamiento (proporcional al
// radio de cada una) e intercambia la componente de velocidad a lo largo de la normal.
function vista3dResolverColision(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const minDist = a.radio + b.radio;
    if (dist >= minDist) return;
    const nx = dx / dist, ny = dy / dist;
    const overlap = minDist - dist;
    const totalR = a.radio + b.radio;
    a.x -= nx * overlap * (b.radio / totalR);
    a.y -= ny * overlap * (b.radio / totalR);
    b.x += nx * overlap * (a.radio / totalR);
    b.y += ny * overlap * (a.radio / totalR);

    const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relVel > 0) return;
    const restitucion = 0.7;
    const impulso = -(1 + restitucion) * relVel / 2;
    a.vx -= impulso * nx; a.vy -= impulso * ny;
    b.vx += impulso * nx; b.vy += impulso * ny;
}

function vista3dAnimar(ts) {
    vista3dAnimId = requestAnimationFrame(vista3dAnimar);
    const dt = Math.min((ts - vista3dUltimoTs) / 1000, 0.05) || 0.016;
    vista3dUltimoTs = ts;

    vista3dBodies.forEach((b, i) => {
        if (i === vista3dDragIdx) return;
        vista3dActualizarDrift(b, ts / 1000);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        vista3dLimites(b);
    });

    for (let i = 0; i < vista3dBodies.length; i++) {
        for (let j = i + 1; j < vista3dBodies.length; j++) {
            if (i === vista3dDragIdx || j === vista3dDragIdx) continue;
            vista3dResolverColision(vista3dBodies[i], vista3dBodies[j]);
        }
    }

    vista3dBodies.forEach((b, i) => {
        const el = vista3dEls[i];
        el.style.transform = `translate(${b.x - b.radio}px, ${b.y - b.radio}px)`;
    });
}

function vista3dCoordCampo(e) {
    const rect = document.getElementById('vista3d-bubble-field').getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function vista3dOnPointerDown(e, bubbleEl) {
    const idx = vista3dEls.indexOf(bubbleEl);
    if (idx < 0) return;
    e.preventDefault();
    bubbleEl.setPointerCapture(e.pointerId);

    vista3dPointerDownPos = { x: e.clientX, y: e.clientY };
    vista3dPointerDownTime = performance.now();
    vista3dUltimoPointer = { x: e.clientX, y: e.clientY, t: vista3dPointerDownTime };

    const p = vista3dCoordCampo(e);
    const b = vista3dBodies[idx];
    vista3dDragIdx = idx;
    vista3dDragOffX = p.x - b.x;
    vista3dDragOffY = p.y - b.y;
    b.vx = 0; b.vy = 0;
}

function vista3dOnPointerMove(e) {
    if (vista3dDragIdx < 0) return;
    const p = vista3dCoordCampo(e);
    const b = vista3dBodies[vista3dDragIdx];
    const limX = vista3dCampo.w - b.radio, limY = vista3dCampo.h - b.radio;
    b.x = Math.max(b.radio, Math.min(limX, p.x - vista3dDragOffX));
    b.y = Math.max(b.radio, Math.min(limY, p.y - vista3dDragOffY));

    const ahora = performance.now();
    vista3dUltimoPointer = { x: e.clientX, y: e.clientY, t: ahora };
}

function vista3dOnPointerUp(e) {
    if (vista3dDragIdx < 0) return;
    const idx = vista3dDragIdx;
    vista3dDragIdx = -1;
    const b = vista3dBodies[idx];

    const dx = e.clientX - vista3dPointerDownPos.x;
    const dy = e.clientY - vista3dPointerDownPos.y;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    const duracion = performance.now() - vista3dPointerDownTime;
    const fueClick = distancia < 6 && duracion < 350;

    if (!fueClick) {
        // Estima la velocidad de soltada con el último tramo de movimiento, para que la burbuja
        // "mantenga el momento" en vez de quedar seca.
        const dtMs = Math.max(1, e.timeStamp - (vista3dUltimoPointer?.t ?? e.timeStamp - 16));
        const vx = ((e.clientX - (vista3dUltimoPointer?.x ?? e.clientX)) / dtMs) * 1000;
        const vy = ((e.clientY - (vista3dUltimoPointer?.y ?? e.clientY)) / dtMs) * 1000;
        b.vx = Math.max(-600, Math.min(600, vx));
        b.vy = Math.max(-600, Math.min(600, vy));
    }

    if (fueClick) vista3dOnClickBurbuja(b.item);
}

function vista3dOnClickBurbuja(item) {
    switch (vista3dTipoActual) {
        case 'META':
            abrirModalDetalle(item.id);
            break;
        case 'INVERSION':
            abrirModalInv(item.id);
            break;
        case 'INGRESO':
        case 'GASTO':
            // item.id es el nombre de la categoría acá (no hay un "detalle" propio por categoría) —
            // se cierra la vista y se aplica el filtro correspondiente en la tabla de abajo.
            filtrarPorCategoriaYCerrarVista3D(vista3dTipoActual, item.id);
            break;
    }
}

function vista3dActualizarTitulo(tipo) {
    const LABEL = { META: 'Metas', INGRESO: 'Ingresos', GASTO: 'Gastos', INVERSION: 'Inversión' };
    let texto = (LABEL[tipo] || '').toUpperCase();
    if (tipo === 'INGRESO' || tipo === 'GASTO') {
        const anio = document.getElementById('periodo-anio').value;
        const mes = +document.getElementById('periodo-mes').value;
        texto += ` · ${MESES[mes - 1]?.toUpperCase() || ''} ${anio}`;
    }
    document.getElementById('vista3d-titulo').textContent = texto;
}

async function vista3dCargarYRenderizar() {
    vista3dItems = await vista3dObtenerItems(vista3dTipoActual);
    vista3dCrearBurbujas(vista3dItems);
    const total = vista3dItems.reduce((s, it) => s + it.monto, 0);
    document.getElementById('vista3d-total-monto').textContent = fmt(total);
    document.getElementById('vista3d-total-texto').textContent = vista3dTextoTotal(vista3dTipoActual);
}

function vista3dIrALista() {
    switch (vista3dTipoActual) {
        case 'META':
            cerrarVista3D();
            navigateTo('metas');
            break;
        case 'INVERSION':
            cerrarVista3D();
            navigateTo('inversiones');
            break;
        default:
            filtrarPorCategoriaYCerrarVista3D(vista3dTipoActual, '');
    }
}

function vista3dAbrirNuevo() {
    const tipo = vista3dTipoActual; // cerrarVista3D() lo resetea a null, hay que guardarlo antes
    switch (tipo) {
        case 'META':
            abrirModalMeta();
            break;
        case 'INVERSION':
            abrirModalInv();
            break;
        default:
            cerrarVista3D();
            abrirModalTransaccion().then(() => {
                document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(b => b.classList.toggle('active', b.dataset.value === tipo));
                document.getElementById('t-tipo').value = tipo;
                actualizarCamposPorTipo(tipo);
            });
    }
}

async function mostrarVista3D(tipo) {
    vista3dTipoActual = tipo;
    document.getElementById('vista3d-overlay').classList.remove('hidden');
    document.getElementById('vista3d-toggle-burbujas').classList.add('active');
    document.getElementById('vista3d-toggle-lista').classList.remove('active');
    vista3dActualizarTitulo(tipo);
    try {
        await vista3dCargarYRenderizar();
    } catch (err) {
        showToast?.(err.message, 'error');
    }
    if (!vista3dAnimId) {
        vista3dUltimoTs = performance.now();
        vista3dAnimId = requestAnimationFrame(vista3dAnimar);
    }
}

function cerrarVista3D() {
    document.getElementById('vista3d-overlay').classList.add('hidden');
    vista3dTipoActual = null;
    if (vista3dAnimId) {
        cancelAnimationFrame(vista3dAnimId);
        vista3dAnimId = null;
    }
}

function actualizarVista3DActual() {
    if (vista3dTipoActual) vista3dCargarYRenderizar();
}

document.getElementById('btn-volver-dashboard-3d').addEventListener('click', () => {
    cerrarVista3D();
    navigateTo('dashboard');
});
document.getElementById('vista3d-toggle-lista').addEventListener('click', vista3dIrALista);
document.getElementById('btn-nueva-3d').addEventListener('click', vista3dAbrirNuevo);

document.getElementById('vista3d-bubble-field').addEventListener('pointerdown', e => {
    const bubbleEl = e.target.closest('.vista3d-bubble');
    if (bubbleEl) vista3dOnPointerDown(e, bubbleEl);
});
document.addEventListener('pointermove', vista3dOnPointerMove);
document.addEventListener('pointerup', vista3dOnPointerUp);
window.addEventListener('resize', () => {
    if (vista3dTipoActual) {
        const rect = document.getElementById('vista3d-bubble-field').getBoundingClientRect();
        vista3dCampo = { w: rect.width, h: rect.height };
    }
});
