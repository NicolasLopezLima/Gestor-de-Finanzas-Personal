const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0);
}

// "Hoy" como YYYY-MM-DD en hora LOCAL, comparable directo contra t.fecha. A propósito no usa
// toISOString() (convierte a UTC primero — entre las 00:00 y las 03:00 en Argentina daría la
// fecha de mañana).
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Suma ingresos/gastos/balance de una lista de transacciones, contando solo las que ya "pasaron"
// (fecha <= hoy) — una transacción con fecha futura (recurrente o cargada a mano) todavía no es
// plata real, aunque ya esté generada/cargada en el período. La usan Dashboard e Ingresos &
// Gastos para que el criterio sea el mismo en toda la app.
function totalesHastaHoy(transacciones) {
    const hoy = todayStr();
    const hastaHoy = (transacciones || []).filter(t => t.fecha <= hoy);
    const ingresos = hastaHoy.filter(t => t.tipo === 'INGRESO').reduce((s, t) => s + Number(t.monto), 0);
    const gastos = hastaHoy.filter(t => t.tipo === 'GASTO').reduce((s, t) => s + Number(t.monto), 0);
    const metas = hastaHoy.filter(t => t.tipo === 'META').reduce((s, t) => s + Number(t.monto), 0);
    const inversion = hastaHoy.filter(t => t.tipo === 'INVERSION').reduce((s, t) => s + Number(t.monto), 0);
    // Un abono a una meta o un aporte a una inversión son plata real que salió del bolsillo, igual
    // que un gasto — se restan del balance, solo que se muestran en su propia tarjeta en vez de
    // mezclados con "Gastos".
    return { ingresos, gastos, metas, inversion, balance: ingresos - gastos - metas - inversion };
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('es-AR');
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Reemplaza al confirm() nativo del navegador: además de no encajar visualmente con el resto
// de la app, un confirm() nativo bloquea el hilo por completo (incluida cualquier automatización
// de UI que dependa de CDP), algo que un modal propio no hace. Se agrega al z-index 300 (por
// encima de .modal, que usa 200) para poder mostrarse arriba de otro modal ya abierto, como al
// borrar una categoría desde adentro del modal de Categorías.
function confirmDialog({ title = '¿Estás seguro?', message = '', confirmText = 'Eliminar', cancelText = 'Cancelar', danger = true } = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal confirm-dialog-overlay';
        overlay.innerHTML = `
            <div class="modal-content confirm-dialog-content">
                <h3 class="confirm-dialog-title">${title}</h3>
                <p class="confirm-dialog-message">${message}</p>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary confirm-dialog-cancel">${cancelText}</button>
                    <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm-dialog-confirm">${confirmText}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const cerrar = (resultado) => {
            overlay.remove();
            document.removeEventListener('keydown', onKeydown);
            resolve(resultado);
        };
        const onKeydown = (e) => {
            if (e.key === 'Escape') cerrar(false);
        };
        overlay.querySelector('.confirm-dialog-cancel').addEventListener('click', () => cerrar(false));
        overlay.querySelector('.confirm-dialog-confirm').addEventListener('click', () => cerrar(true));
        overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
        document.addEventListener('keydown', onKeydown);
        overlay.querySelector('.confirm-dialog-confirm').focus();
    });
}

function progressBar(pct, color) {
    return `
    <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%; background:${color}"></div>
    </div>`;
}

function emptyState({ icon, title, text, actionLabel, actionOnClick }) {
    return `
    <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        ${text ? `<p class="empty-state-text">${text}</p>` : ''}
        ${actionLabel ? `<button type="button" class="btn btn-primary" onclick="${actionOnClick}">${actionLabel}</button>` : ''}
    </div>`;
}

// ── Custom select: reemplaza el <select> nativo (popup no styleable entre
// navegadores) por un disparador + panel propios, en todos los desplegables
// de la app. Expone `.value` sobre el mismo elemento vía Object.defineProperty
// para que el resto del código siga leyendo/escribiendo `.value` sin cambios,
// y dispara un evento `change` real al elegir una opción (no en el set inicial),
// para que `.addEventListener('change', ...)` siga funcionando igual que antes. ──

let customSelectAbierto = null; // { panel, scrollCont, onScroll }

/**
 * @param {string} id
 * @param {Array<string|{valor:string, texto:string}>} opciones
 * @param {string|null} placeholder — si se pasa, agrega una opción en blanco al
 *   principio y el valor inicial queda vacío; si es null/undefined, no hay opción
 *   en blanco y el valor inicial es el de la primera opción real (como un <select>
 *   nativo sin placeholder).
 * @param {{texto:string, icono?:string, onClick:Function}|null} extra — si se pasa,
 *   agrega una opción final visualmente distinta que en vez de setear `.value`
 *   ejecuta `onClick()` (por ejemplo, "+ Agregar categoría"). Sin este parámetro,
 *   el comportamiento es idéntico al de siempre.
 */
function crearCustomSelect(id, opciones, placeholder, extra) {
    const el = document.getElementById(id);
    el.innerHTML = `
        <button type="button" class="custom-select-trigger">
            <span class="custom-select-value"></span>
        </button>
        <div class="custom-select-panel hidden"></div>`;

    const campo = el.closest('.tx-field') || el;
    const valueSpan = el.querySelector('.custom-select-value');
    const panel = el.querySelector('.custom-select-panel');

    const opcionesNormalizadas = opciones.map(o => (typeof o === 'string' ? { valor: o, texto: o } : o));
    const todasLasOpciones = placeholder
        ? [{ valor: '', texto: placeholder }, ...opcionesNormalizadas]
        : opcionesNormalizadas;
    panel.innerHTML = todasLasOpciones.map(o =>
        `<div class="custom-select-option" data-valor="${o.valor}">${o.texto}</div>`).join('') +
        (extra ? `<div class="custom-select-option custom-select-option-extra" data-extra="1">
            <span class="material-symbols-outlined">${extra.icono || 'add_circle'}</span> ${extra.texto}
        </div>` : '');

    let valorActual = '';
    Object.defineProperty(el, 'value', {
        configurable: true,
        get: () => valorActual,
        set: (v) => {
            valorActual = v ?? '';
            const opcion = todasLasOpciones.find(o => o.valor === valorActual);
            valueSpan.textContent = opcion ? opcion.texto : (placeholder || '');
            valueSpan.classList.toggle('custom-select-placeholder', !opcion);
        },
    });
    el.value = placeholder ? '' : (todasLasOpciones[0]?.valor ?? '');

    panel.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.addEventListener('click', e => {
            e.stopPropagation();
            if (opt.dataset.extra) {
                cerrarCustomSelects();
                extra.onClick();
                return;
            }
            el.value = opt.dataset.valor;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            cerrarCustomSelects();
        });
    });

    // Un solo listener en TODO el campo (no solo el botón interno): así el ícono,
    // el chevron y el relleno alrededor también abren el panel. stopPropagation
    // evita que este mismo click siga hasta el listener global de "cerrar todo".
    campo.addEventListener('click', e => {
        e.stopPropagation();
        const yaAbierto = customSelectAbierto?.panel === panel;
        cerrarCustomSelects();
        if (!yaAbierto) abrirCustomSelectPanel(panel, campo);
    });
}

// Solo posiciona y muestra el panel bajo `campo` — sin tocar customSelectAbierto. Separado de
// abrirCustomSelectPanel para que paneles que NO deban cerrarse solos con cualquier click (ej. el
// panel "Filtros", que contiene un custom-select propio — si compartiera el mismo slot global, al
// abrir el desplegable de categoría de adentro se cerraría primero el panel que lo contiene) puedan
// reusar el mismo cálculo de posición con su propio manejo de apertura/cierre.
//
// anchoFijo: true para paneles con ancho propio en CSS (ej. el date-picker, que necesita más
// espacio del que tiene el campito "Desde"/"Hasta" que lo abre) — si no, el ancho inline que se
// pone acá (para que el dropdown iguale al campo) le gana a cualquier `width` de la hoja de
// estilos y lo aplasta.
function posicionarPanelFlotante(panel, campo, anchoFijo) {
    const r = campo.getBoundingClientRect();
    panel.style.left = `${r.left}px`;
    if (!anchoFijo) panel.style.width = `${r.width}px`;
    panel.style.top = `${r.bottom + 6}px`;
    panel.classList.remove('hidden');

    const margen = 8;
    // Si el panel es más ancho que el campo (anchoFijo) y se abre cerca del borde derecho de la
    // ventana, se corre hacia la izquierda para no quedar cortado.
    if (anchoFijo) {
        const anchoPanel = panel.getBoundingClientRect().width;
        const izquierda = Math.min(r.left, window.innerWidth - anchoPanel - margen);
        panel.style.left = `${Math.max(margen, izquierda)}px`;
    }

    // Si abajo no entra (ej. un campo cerca del final de un modal largo, como "Frecuencia" al
    // tildar "Repetir"), se abre hacia arriba en vez de quedar cortado por el borde de la ventana.
    const panelRect = panel.getBoundingClientRect();
    if (panelRect.bottom > window.innerHeight - margen) {
        const arriba = r.top - panelRect.height - 6;
        panel.style.top = `${Math.max(margen, arriba)}px`;
    }
}

function abrirCustomSelectPanel(panel, campo, anchoFijo) {
    posicionarPanelFlotante(panel, campo, anchoFijo);

    const scrollCont = campo.closest('.modal-mapeo-content, .modal-content');
    const onScroll = () => cerrarCustomSelects();
    scrollCont?.addEventListener('scroll', onScroll, { once: true });
    customSelectAbierto = { panel, scrollCont, onScroll };
}

// ── Date picker propio (reemplaza <input type="date">) ──────────────────
// El popup nativo del navegador no sigue el estilo neumórfico de la app (mismo problema que
// tenía el <select> nativo, resuelto arriba con crearCustomSelect) — acá se aplica el mismo
// patrón: un elemento con `.value` como string ISO (YYYY-MM-DD) vía Object.defineProperty y un
// evento `change` real al elegir un día, para que el código que ya lee/escribe `.value` en estos
// campos siga funcionando sin cambios.
//
// `obtenerMesActual` (opcional) distingue 2 modos:
// - CON función: mes fijo, sin flechas de navegación — para filtros acotados a un período ya
//   cargado en pantalla (Ingresos & Gastos), donde elegir un día de otro mes nunca podría
//   matchear ninguna transacción, así que navegar sería una opción muerta.
// - SIN función: fecha libre, con flechas — para campos de fecha reales (ej. "Agregar
//   inversión"), donde hace falta poder ir a cualquier mes, no solo el actual.
// campoClick (opcional): elemento cuyo click entero abre el panel (ej. el .tx-field que envuelve
// el campo con su ícono, para que se sienta clickeable como el resto de los dropdowns del
// mismo estilo). Sin este parámetro, solo el campito en sí abre el panel — necesario cuando ese
// .tx-field es compartido por 2 campos (como "Desde"/"Hasta"), donde subir al ancestro haría que
// clickear cualquiera de los dos intente abrir ambos calendarios a la vez.
function crearDatePicker(id, placeholder, obtenerMesActual, campoClick) {
    const el = document.getElementById(id);
    el.innerHTML = `
        <button type="button" class="custom-select-trigger">
            <span class="custom-select-value"></span>
        </button>
        <div class="custom-select-panel date-picker-panel hidden"></div>`;

    const campo = campoClick || el;
    const valueSpan = el.querySelector('.custom-select-value');
    const panel = el.querySelector('.custom-select-panel');

    const navegable = !obtenerMesActual;
    let valorActual = '';
    let mesVisible = new Date(); // solo se usa en modo navegable

    Object.defineProperty(el, 'value', {
        configurable: true,
        get: () => valorActual,
        set: (v) => {
            valorActual = v || '';
            valueSpan.textContent = valorActual ? fmtDate(valorActual) : (placeholder || '');
            valueSpan.classList.toggle('custom-select-placeholder', !valorActual);
            if (valorActual && navegable) mesVisible = new Date(valorActual + 'T00:00:00');
        },
    });
    el.value = '';

    function renderPanel() {
        let anio, mes;
        if (navegable) {
            anio = mesVisible.getFullYear();
            mes = mesVisible.getMonth() + 1;
        } else {
            ({ anio, mes } = obtenerMesActual());
        }
        const mesIdx = mes - 1; // 0-indexado, para Date
        const primerDiaSemana = new Date(anio, mesIdx, 1).getDay();
        const diasEnMes = new Date(anio, mesIdx + 1, 0).getDate();
        const offset = (primerDiaSemana + 6) % 7; // semana empieza en lunes
        const hoyISO = todayStr();

        let celdas = '';
        for (let i = 0; i < offset; i++) celdas += `<span class="date-picker-day date-picker-day-empty"></span>`;
        for (let d = 1; d <= diasEnMes; d++) {
            const iso = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const clases = ['date-picker-day'];
            if (iso === valorActual) clases.push('active');
            if (iso === hoyISO) clases.push('today');
            celdas += `<span class="${clases.join(' ')}" data-iso="${iso}">${d}</span>`;
        }

        const mesLabel = `<span class="date-picker-mes">${MESES[mesIdx]} ${anio}</span>`;
        panel.innerHTML = `
            ${navegable ? `
            <div class="date-picker-header">
                <button type="button" class="date-picker-nav" data-nav="-1" title="Mes anterior">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
                ${mesLabel}
                <button type="button" class="date-picker-nav" data-nav="1" title="Mes siguiente">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            </div>` : mesLabel}
            <div class="date-picker-weekdays"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
            <div class="date-picker-grid">${celdas}</div>
            ${valorActual ? `<button type="button" class="date-picker-clear">Quitar fecha</button>` : ''}`;

        if (navegable) {
            panel.querySelectorAll('.date-picker-nav').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    mesVisible = new Date(anio, mesIdx + Number(btn.dataset.nav), 1);
                    renderPanel();
                });
            });
        }
        panel.querySelectorAll('.date-picker-day:not(.date-picker-day-empty)').forEach(dayEl => {
            dayEl.addEventListener('click', e => {
                e.stopPropagation();
                el.value = dayEl.dataset.iso;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                cerrarCustomSelects();
            });
        });
        panel.querySelector('.date-picker-clear')?.addEventListener('click', e => {
            e.stopPropagation();
            el.value = '';
            el.dispatchEvent(new Event('change', { bubbles: true }));
            cerrarCustomSelects();
        });
    }

    campo.addEventListener('click', e => {
        e.stopPropagation();
        const yaAbierto = customSelectAbierto?.panel === panel;
        cerrarCustomSelects();
        if (!yaAbierto) {
            renderPanel();
            abrirCustomSelectPanel(panel, campo, true);
        }
    });
}

function cerrarCustomSelects() {
    if (!customSelectAbierto) return;
    customSelectAbierto.panel.classList.add('hidden');
    customSelectAbierto.scrollCont?.removeEventListener('scroll', customSelectAbierto.onScroll);
    customSelectAbierto = null;
}

document.addEventListener('click', () => cerrarCustomSelects());
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarCustomSelects(); });

function fillAnioCustomSelect(id, selected) {
    const now = new Date();
    const anios = [];
    for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) anios.push(String(y));
    crearCustomSelect(id, anios, null);
    document.getElementById(id).value = String(selected ?? now.getFullYear());
}

function fillMesCustomSelect(id, selected) {
    const now = new Date();
    const opciones = MESES.map((m, i) => ({ valor: String(i + 1), texto: m }));
    crearCustomSelect(id, opciones, null);
    document.getElementById(id).value = String(selected ?? now.getMonth() + 1);
}

function buildDonut(segments, { size = 180, stroke = 20 } = {}) {
    const r = (size - stroke) / 2;
    const cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total <= 0) return '';
    let offset = 0;
    const circles = segments.filter(s => s.value > 0).map(seg => {
        const frac = seg.value / total;
        const dash = frac * circumference;
        const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" stroke-linecap="round"/>`;
        offset += dash;
        return circle;
    }).join('');
    return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <g transform="rotate(-90 ${cx} ${cy})">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
            ${circles}
        </g>
    </svg>`;
}

function buildSparkline(precios, { width = 90, height = 28 } = {}) {
    if (!precios || precios.length < 2) return '';
    const min = Math.min(...precios), max = Math.max(...precios);
    const rango = max - min || 1;
    const puntos = precios.map((p, i) =>
        `${(i / (precios.length - 1) * width).toFixed(1)},${(height - (p - min) / rango * height).toFixed(1)}`
    ).join(' ');
    const color = precios[precios.length - 1] >= precios[0] ? 'var(--success)' : 'var(--danger)';
    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
}

const TIPO_COLORS = {
    ACCIONES: '#0F172A',
    FONDO: '#2563EB',
    ORO: '#B45309',
    BONOS: '#0D9488',
    OTRO: '#64748B',
};

const TIPO_ICONS = {
    ACCIONES: 'trending_up',
    FONDO: 'donut_large',
    ORO: 'paid',
    BONOS: 'description',
    OTRO: 'category',
};
