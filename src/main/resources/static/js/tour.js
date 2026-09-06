// ── Tour guiado de onboarding (una vez por sección, por usuario) ──────────
// Señala elementos reales de la UI con un spotlight + tooltip, en vez de un carrusel de
// pantallas. El "ya lo vi" se persiste server-side (Usuario.toursVistos, vía /api/auth/me y
// POST /api/auth/tours-vistos/{seccion}) — no localStorage — así no se resetea si el usuario
// entra desde otro dispositivo con la misma cuenta de Google.
//
// Reusa el mismo patrón de posicionamiento que ya usan los dropdowns de la app
// (posicionarPanelFlotante, en utils.js) en vez de escribir cálculo de posición de cero.

let tourActivo = null; // { seccion, pasos, indice, onReposicionar }

// Devuelve el primer elemento existente Y visible entre los candidatos — soporta un selector
// único o una lista (ej. el nav de Dashboard, que es sidebar en desktop / bottom-nav en mobile).
function resolverSelectorTour(selector) {
    if (selector === null || selector === undefined) return null;
    const candidatos = Array.isArray(selector) ? selector : [selector];
    for (const sel of candidatos) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
    }
    return null;
}

// pasos: [{ selector: '#id' | ['#a', '#b'] | null, titulo, texto }]
// selector null = paso de cierre, tooltip centrado sin spotlight.
// opts.onSaltar: callback cuando el usuario clickea "Saltar"
// opts.onTerminar: callback cuando el usuario completa el tour con "Siguiente"
async function iniciarTour(seccion, pasos, opts = {}) {
    return; // TODO: tour en desarrollo, desactivado temporalmente
    const u = await currentUserPromise;
    if (!u || (u.toursVistos || []).includes(seccion) || tourActivo) return;

    const pasosVisibles = pasos.filter(p => p.selector === null || resolverSelectorTour(p.selector));
    if (!pasosVisibles.length) {
        api.marcarTourVisto(seccion).catch(() => {});
        return;
    }

    montarTourDOM();
    tourActivo = { seccion, pasos: pasosVisibles, indice: 0, onSaltar: opts.onSaltar, onTerminar: opts.onTerminar };
    renderPasoTour();
}

function montarTourDOM() {
    const backdrop = document.createElement('div');
    backdrop.id = 'tour-backdrop';
    backdrop.addEventListener('click', saltarTour);
    document.body.appendChild(backdrop);

    const spotlight = document.createElement('div');
    spotlight.id = 'tour-spotlight';
    document.body.appendChild(spotlight);

    const tooltip = document.createElement('div');
    tooltip.id = 'tour-tooltip';
    tooltip.className = 'tour-tooltip';
    document.body.appendChild(tooltip);
}

function desmontarTourDOM() {
    document.getElementById('tour-backdrop')?.remove();
    document.getElementById('tour-spotlight')?.remove();
    document.getElementById('tour-tooltip')?.remove();
    if (tourActivo?.onReposicionar) {
        window.removeEventListener('resize', tourActivo.onReposicionar);
        window.removeEventListener('scroll', tourActivo.onReposicionar, true);
    }
}

function renderPasoTour() {
    const { pasos, indice } = tourActivo;
    const paso = pasos[indice];
    const target = resolverSelectorTour(paso.selector);
    const spotlight = document.getElementById('tour-spotlight');
    const tooltip = document.getElementById('tour-tooltip');

    if (target) {
        spotlight.classList.remove('hidden');
        const r = target.getBoundingClientRect();
        const pad = 8;
        spotlight.style.left = `${r.left - pad}px`;
        spotlight.style.top = `${r.top - pad}px`;
        spotlight.style.width = `${r.width + pad * 2}px`;
        spotlight.style.height = `${r.height + pad * 2}px`;
    } else {
        spotlight.classList.add('hidden');
    }

    const esUltimo = indice === pasos.length - 1;
    const accionHtml = (esUltimo && paso.accion)
        ? `<button type="button" class="np-button np-button-dark np-pill np-pill-sm" data-tour="accion">${paso.accion.label}</button>`
        : `<button type="button" class="np-button np-button-dark np-pill np-pill-sm" data-tour="siguiente">${esUltimo ? 'Entendido' : 'Siguiente'}</button>`;
    tooltip.innerHTML = `
        <div class="tour-step-counter">${indice + 1}/${pasos.length}</div>
        <h3 class="tour-tooltip-titulo">${paso.titulo}</h3>
        <p class="tour-tooltip-texto">${paso.texto}</p>
        <div class="tour-tooltip-actions">
            ${indice > 0 ? '<button type="button" class="np-button np-pill np-pill-sm" data-tour="anterior">Anterior</button>' : '<span></span>'}
            <div class="tour-tooltip-actions-right">
                ${!esUltimo ? '<button type="button" class="tour-tooltip-saltar" data-tour="saltar">Saltar</button>' : ''}
                ${accionHtml}
            </div>
        </div>`;
    tooltip.querySelector('[data-tour="anterior"]')?.addEventListener('click', () => avanzarTour(-1));
    tooltip.querySelector('[data-tour="siguiente"]')?.addEventListener('click', () => avanzarTour(1));
    tooltip.querySelector('[data-tour="saltar"]')?.addEventListener('click', saltarTour);
    tooltip.querySelector('[data-tour="accion"]')?.addEventListener('click', terminarTour);

    if (target) {
        posicionarPanelFlotante(tooltip, target, true);
    } else {
        tooltip.classList.remove('hidden');
        tooltip.style.left = `${(window.innerWidth - tooltip.offsetWidth) / 2}px`;
        tooltip.style.top = `${(window.innerHeight - tooltip.offsetHeight) / 2}px`;
    }

    if (!tourActivo.onReposicionar) {
        tourActivo.onReposicionar = () => renderPasoTour();
        window.addEventListener('resize', tourActivo.onReposicionar);
        window.addEventListener('scroll', tourActivo.onReposicionar, true);
    }
}

function avanzarTour(delta) {
    const siguiente = tourActivo.indice + delta;
    if (siguiente >= tourActivo.pasos.length) { terminarTour(); return; }
    if (siguiente < 0) return;
    tourActivo.indice = siguiente;
    renderPasoTour();
}

function saltarTour() {
    if (!tourActivo) return;
    const { seccion, onSaltar } = tourActivo;
    desmontarTourDOM();
    tourActivo = null;
    api.marcarTourVisto(seccion).catch(() => {});
    if (onSaltar) onSaltar();
}

function terminarTour() {
    if (!tourActivo) return;
    const { seccion, onTerminar } = tourActivo;
    desmontarTourDOM();
    tourActivo = null;
    api.marcarTourVisto(seccion).catch(() => {});
    if (onTerminar) onTerminar();
}
