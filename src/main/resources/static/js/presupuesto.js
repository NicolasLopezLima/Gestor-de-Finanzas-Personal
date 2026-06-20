let presupuestoActual = null;
let metasDisponibles = [];

// Categorías fijas predefinidas — siempre presentes, no se pueden eliminar
const TIPOS_FIJOS = [
    { tipo: 'GASTO',    label: 'Gasto',    icon: '🛒', descripcion: 'Gasto diario disponible' },
    { tipo: 'COLCHON',  label: 'Colchón',  icon: '🛡', descripcion: 'Fondo de emergencia' },
    { tipo: 'INVERSION',label: 'Inversión',icon: '📈', descripcion: 'Inversiones' },
];

async function initPresupuesto() {
    fillAnioSelect(document.getElementById('p-anio'));
    fillMesSelect(document.getElementById('p-mes'));

    document.getElementById('btn-cargar-presupuesto').addEventListener('click', cargarPresupuesto);
    document.getElementById('form-presupuesto').addEventListener('submit', guardarPresupuesto);
    document.getElementById('btn-add-asig').addEventListener('click', () => agregarFilaPersonalizada());
    document.getElementById('p-sueldo').addEventListener('input', actualizarRestante);

    metasDisponibles = await api.listarMetas().catch(() => []);
    metasDisponibles = metasDisponibles.filter(m => m.estado === 'ACTIVA');

    renderFilasFijas(null);
    await cargarPresupuesto();
}

async function cargarPresupuesto() {
    const anio = +document.getElementById('p-anio').value;
    const mes = +document.getElementById('p-mes').value;
    try {
        presupuestoActual = await api.getPresupuesto(anio, mes);
        if (presupuestoActual.sueldo) {
            document.getElementById('p-sueldo').value = presupuestoActual.sueldo;
        }
        renderFilasFijas(presupuestoActual.asignaciones);
        renderFilasPersonalizadas(presupuestoActual.asignaciones);
        actualizarRestante();
        renderBars();
    } catch {
        presupuestoActual = null;
        renderFilasFijas(null);
        document.getElementById('asignaciones-custom-list').innerHTML = '';
        document.getElementById('presupuesto-bars').innerHTML =
            '<p style="color:var(--text-muted);font-size:13px">Sin presupuesto para este periodo.</p>';
        actualizarRestante();
    }
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

function renderBars() {
    const bars = document.getElementById('presupuesto-bars');
    if (!presupuestoActual?.asignaciones?.length) {
        bars.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Guardá el presupuesto para ver la distribución.</p>';
        return;
    }
    const sueldo = presupuestoActual.sueldo;
    const colorMap = { GASTO: '#4f46e5', COLCHON: '#10b981', INVERSION: '#f59e0b' };
    const colors = ['#8b5cf6','#06b6d4','#ef4444','#ec4899'];
    let customIdx = 0;

    bars.innerHTML = presupuestoActual.asignaciones.map(a => {
        const pct = sueldo > 0 ? Math.min((a.monto / sueldo) * 100, 100).toFixed(1) : 0;
        const color = colorMap[a.tipo] || colors[customIdx++ % colors.length];
        const metaTag = a.metaNombre ? ` <small style="color:var(--text-muted)">(Meta: ${a.metaNombre})</small>` : '';
        return `
        <div class="cartera-tipo-row">
            <div class="cartera-tipo-label">
                <span>${a.categoria}${metaTag}</span>
                <span style="font-weight:600">${fmt(a.monto)} <small style="color:var(--text-muted)">${pct}%</small></span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
        </div>`;
    }).join('');
}

async function guardarPresupuesto(e) {
    e.preventDefault();
    const anio = +document.getElementById('p-anio').value;
    const mes = +document.getElementById('p-mes').value;
    const sueldo = +document.getElementById('p-sueldo').value;

    // Filas fijas
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

    // Filas personalizadas
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
        renderBars();
        showToast('Presupuesto guardado');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
