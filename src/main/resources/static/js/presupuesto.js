let presupuestoActual = null;
let metasDisponibles = [];

async function initPresupuesto() {
    fillAnioSelect(document.getElementById('p-anio'));
    fillMesSelect(document.getElementById('p-mes'));

    document.getElementById('btn-cargar-presupuesto').addEventListener('click', cargarPresupuesto);
    document.getElementById('form-presupuesto').addEventListener('submit', guardarPresupuesto);
    document.getElementById('btn-add-asig').addEventListener('click', agregarFilaAsignacion);
    document.getElementById('p-sueldo').addEventListener('input', actualizarRestante);

    metasDisponibles = await api.listarMetas().catch(() => []);
    metasDisponibles = metasDisponibles.filter(m => m.estado === 'ACTIVA');

    await cargarPresupuesto();
}

async function cargarPresupuesto() {
    const anio = +document.getElementById('p-anio').value;
    const mes = +document.getElementById('p-mes').value;
    try {
        presupuestoActual = await api.getPresupuesto(anio, mes);
        renderPresupuesto();
    } catch {
        presupuestoActual = null;
        document.getElementById('asignaciones-list').innerHTML = '';
        document.getElementById('presupuesto-bars').innerHTML = '<p style="color:var(--text-muted);font-size:13px">Sin presupuesto para este periodo.</p>';
    }
}

function renderPresupuesto() {
    if (!presupuestoActual) return;
    document.getElementById('p-sueldo').value = presupuestoActual.sueldo;

    const list = document.getElementById('asignaciones-list');
    list.innerHTML = '';
    (presupuestoActual.asignaciones || []).forEach(a => agregarFilaAsignacion(null, a));
    actualizarRestante();
    renderBars();
}

function agregarFilaAsignacion(e, data) {
    const list = document.getElementById('asignaciones-list');
    const row = document.createElement('div');
    row.className = 'asig-row';

    const metaOptions = metasDisponibles.map(m =>
        `<option value="${m.id}" ${data?.metaId == m.id ? 'selected' : ''}>${m.nombre}</option>`
    ).join('');

    row.innerHTML = `
        <input type="text" placeholder="Categoría" class="asig-cat" value="${data?.categoria || ''}" required>
        <input type="number" placeholder="Monto" class="asig-monto" min="0" step="0.01" value="${data?.monto || ''}" required>
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
    if (!presupuestoActual || !presupuestoActual.asignaciones?.length) {
        bars.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Agrega asignaciones para ver la distribución.</p>';
        return;
    }
    const sueldo = presupuestoActual.sueldo;
    const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
    bars.innerHTML = presupuestoActual.asignaciones.map((a, i) => {
        const pct = sueldo > 0 ? Math.min((a.monto / sueldo) * 100, 100).toFixed(1) : 0;
        const color = colors[i % colors.length];
        return `
        <div class="cartera-tipo-row">
            <div class="cartera-tipo-label">
                <span>${a.categoria}${a.metaNombre ? ` <small style="color:var(--text-muted)">(Meta: ${a.metaNombre})</small>` : ''}</span>
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

    const asignaciones = [...document.querySelectorAll('.asig-row')].map(row => ({
        categoria: row.querySelector('.asig-cat').value,
        monto: +row.querySelector('.asig-monto').value,
        metaId: row.querySelector('.asig-meta').value || null,
    }));

    try {
        presupuestoActual = await api.guardarPresupuesto({ anio, mes, sueldo, asignaciones });
        renderBars();
        showToast('Presupuesto guardado');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
