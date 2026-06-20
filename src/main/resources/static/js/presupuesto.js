let presupuestoActual = null;
let metasDisponibles = [];

const TIPOS_FIJOS = [
    { tipo: 'GASTO',     label: 'Gasto',     icon: '🛒', descripcion: 'Gasto diario disponible' },
    { tipo: 'COLCHON',   label: 'Colchón',   icon: '🛡', descripcion: 'Fondo de emergencia' },
    { tipo: 'INVERSION', label: 'Inversión', icon: '📈', descripcion: 'Inversiones' },
];

const PIE_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

async function initPresupuesto() {
    fillAnioSelect(document.getElementById('p-anio'));
    fillMesSelect(document.getElementById('p-mes'));

    document.getElementById('btn-cargar-presupuesto').addEventListener('click', cargarPresupuesto);
    document.getElementById('btn-editar-presupuesto').addEventListener('click', abrirModalPresupuesto);
    document.getElementById('btn-cerrar-presupuesto').addEventListener('click', cerrarModalPresupuesto);
    document.getElementById('form-presupuesto').addEventListener('submit', guardarPresupuesto);
    document.getElementById('btn-add-asig').addEventListener('click', () => agregarFilaPersonalizada());
    document.getElementById('p-sueldo').addEventListener('input', actualizarRestante);

    // Cerrar modal al click fuera
    document.getElementById('modal-presupuesto').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-presupuesto')) cerrarModalPresupuesto();
    });

    metasDisponibles = await api.listarMetas().catch(() => []);
    metasDisponibles = metasDisponibles.filter(m => m.estado === 'ACTIVA');

    await cargarPresupuesto();
}

async function cargarPresupuesto() {
    const anio = +document.getElementById('p-anio').value;
    const mes = +document.getElementById('p-mes').value;
    try {
        presupuestoActual = await api.getPresupuesto(anio, mes);
        document.getElementById('presupuesto-empty').classList.add('hidden');
        document.getElementById('presupuesto-chart-container').style.display = '';
        renderPieChart();
    } catch {
        presupuestoActual = null;
        document.getElementById('presupuesto-empty').classList.remove('hidden');
        document.getElementById('presupuesto-chart-container').style.display = 'none';
    }
}

function abrirModalPresupuesto() {
    renderFilasFijas(presupuestoActual?.asignaciones ?? null);
    renderFilasPersonalizadas(presupuestoActual?.asignaciones ?? null);
    if (presupuestoActual?.sueldo) {
        document.getElementById('p-sueldo').value = presupuestoActual.sueldo;
    }
    actualizarRestante();
    document.getElementById('modal-presupuesto').classList.remove('hidden');
}

function cerrarModalPresupuesto() {
    document.getElementById('modal-presupuesto').classList.add('hidden');
}

function renderFilasFijas(asignaciones) {
    const container = document.getElementById('asignaciones-fijas');
    container.innerHTML = TIPOS_FIJOS.map(tf => {
        const existente = asignaciones?.find(a => a.tipo === tf.tipo);
        const metaOptions = metasDisponibles.map(m =>
            `<option value="${m.id}" ${existente?.metaId == m.id ? 'selected' : ''}>${m.nombre}</option>`
        ).join('');
        return `
        <div class="asig-row asig-fija" data-tipo="${tf.tipo}">
            <div class="asig-fija-label">
                <span class="asig-icon">${tf.icon}</span>
                <span class="asig-nombre">${tf.label}</span>
                <small class="asig-desc">${tf.descripcion}</small>
            </div>
            <input type="number" placeholder="Monto" class="asig-monto" min="0" step="0.01"
                   value="${existente?.monto || ''}">
            <select class="asig-meta">
                <option value="">Sin meta</option>
                ${metaOptions}
            </select>
        </div>`;
    }).join('');

    container.querySelectorAll('.asig-monto').forEach(el =>
        el.addEventListener('input', actualizarRestante)
    );
}

function renderFilasPersonalizadas(asignaciones) {
    const list = document.getElementById('asignaciones-custom-list');
    list.innerHTML = '';
    const personalizadas = asignaciones?.filter(a => a.tipo === 'PERSONALIZADO') || [];
    personalizadas.forEach(a => agregarFilaPersonalizada(a));
}

function agregarFilaPersonalizada(data) {
    const list = document.getElementById('asignaciones-custom-list');
    const row = document.createElement('div');
    row.className = 'asig-row';
    row.dataset.tipo = 'PERSONALIZADO';

    const metaOptions = metasDisponibles.map(m =>
        `<option value="${m.id}" ${data?.metaId == m.id ? 'selected' : ''}>${m.nombre}</option>`
    ).join('');

    row.innerHTML = `
        <input type="text" placeholder="Nombre" class="asig-cat" value="${data?.categoria || ''}" required>
        <input type="number" placeholder="Monto" class="asig-monto" min="0" step="0.01" value="${data?.monto || ''}">
        <select class="asig-meta">
            <option value="">Sin meta</option>
            ${metaOptions}
        </select>
        <button type="button" class="btn-icon" onclick="this.parentElement.remove(); actualizarRestante()">✕</button>
    `;
    row.querySelector('.asig-monto').addEventListener('input', actualizarRestante);
    list.appendChild(row);
    actualizarRestante();
}

function actualizarRestante() {
    const sueldo = +document.getElementById('p-sueldo').value || 0;
    const totalAsig = [...document.querySelectorAll('.asig-monto')]
        .reduce((sum, el) => sum + (+el.value || 0), 0);
    const restante = sueldo - totalAsig;
    const el = document.getElementById('sueldo-restante');
    el.textContent = fmt(restante);
    el.style.color = restante < 0 ? 'var(--danger)' : 'var(--success)';
}

// ── Pie chart ────────────────────────────────────────────────────────────────

function renderPieChart() {
    if (!presupuestoActual?.asignaciones?.length) return;

    const asigs = presupuestoActual.asignaciones.filter(a => Number(a.monto) > 0);
    const sueldo = Number(presupuestoActual.sueldo);
    const total = asigs.reduce((s, a) => s + Number(a.monto), 0);

    document.getElementById('pie-sueldo-value').textContent = fmt(sueldo);

    // SVG pie
    const svg = document.getElementById('pie-chart');
    svg.innerHTML = '';
    const cx = 100, cy = 100, r = 90, ri = 52; // donut

    let startAngle = 0;
    asigs.forEach((a, i) => {
        const slice = (Number(a.monto) / total) * 2 * Math.PI;
        const endAngle = startAngle + slice;
        const color = PIE_COLORS[i % PIE_COLORS.length];

        const path = slicePath(cx, cy, r, ri, startAngle, endAngle);
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('d', path);
        el.setAttribute('fill', color);
        el.setAttribute('stroke', '#fff');
        el.setAttribute('stroke-width', '2');
        el.style.cursor = 'pointer';
        el.style.transition = 'opacity .2s';
        el.addEventListener('mouseenter', () => el.setAttribute('opacity', '0.82'));
        el.addEventListener('mouseleave', () => el.setAttribute('opacity', '1'));
        svg.appendChild(el);

        startAngle = endAngle;
    });

    // Leyenda
    const leyenda = document.getElementById('pie-leyenda');
    leyenda.innerHTML = asigs.map((a, i) => {
        const color = PIE_COLORS[i % PIE_COLORS.length];
        const pct = total > 0 ? ((Number(a.monto) / total) * 100).toFixed(1) : 0;
        const metaTag = a.metaNombre
            ? `<div class="leyenda-meta">Meta: ${a.metaNombre}</div>` : '';
        return `
        <div class="leyenda-item">
            <div class="leyenda-dot" style="background:${color}"></div>
            <div class="leyenda-info">
                <div class="leyenda-nombre">${a.categoria}</div>
                ${metaTag}
            </div>
            <div class="leyenda-monto">
                <div class="l-valor">${fmt(a.monto)}</div>
                <div class="l-pct">${pct}%</div>
            </div>
        </div>`;
    }).join('');
}

function slicePath(cx, cy, r, ri, startAngle, endAngle) {
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + ri * Math.cos(endAngle);
    const iy1 = cy + ri * Math.sin(endAngle);
    const ix2 = cx + ri * Math.cos(startAngle);
    const iy2 = cy + ri * Math.sin(startAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${large} 0 ${ix2} ${iy2} Z`;
}

// ── Guardar ──────────────────────────────────────────────────────────────────

async function guardarPresupuesto(e) {
    e.preventDefault();
    const anio = +document.getElementById('p-anio').value;
    const mes = +document.getElementById('p-mes').value;
    const sueldo = +document.getElementById('p-sueldo').value;

    const asignaciones = [];

    document.querySelectorAll('.asig-fija').forEach(row => {
        const monto = +row.querySelector('.asig-monto').value || 0;
        const tipo = row.dataset.tipo;
        const tf = TIPOS_FIJOS.find(t => t.tipo === tipo);
        asignaciones.push({
            categoria: tf.label,
            tipo,
            monto,
            metaId: row.querySelector('.asig-meta').value || null,
        });
    });

    document.querySelectorAll('#asignaciones-custom-list .asig-row').forEach(row => {
        asignaciones.push({
            categoria: row.querySelector('.asig-cat').value,
            tipo: 'PERSONALIZADO',
            monto: +row.querySelector('.asig-monto').value || 0,
            metaId: row.querySelector('.asig-meta').value || null,
        });
    });

    try {
        presupuestoActual = await api.guardarPresupuesto({ anio, mes, sueldo, asignaciones });
        cerrarModalPresupuesto();
        document.getElementById('presupuesto-empty').classList.add('hidden');
        document.getElementById('presupuesto-chart-container').style.display = '';
        renderPieChart();
        showToast('Presupuesto guardado');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
