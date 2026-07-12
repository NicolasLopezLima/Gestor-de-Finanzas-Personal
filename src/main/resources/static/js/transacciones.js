let periodoActual = null;
let presupuestoMes = null;
let filtroActivo = 'todos';

// Categorías predefinidas por tipo
const CATEGORIAS = {
    INGRESO: ['Sueldo', 'Freelance', 'Inversiones', 'Alquiler cobrado', 'Bono', 'Regalo', 'Otros ingresos'],
    GASTO:   ['Alimentación', 'Transporte', 'Vivienda', 'Salud', 'Educación', 'Ropa', 'Entretenimiento',
               'Servicios', 'Restaurantes', 'Tecnología', 'Viajes', 'Deporte', 'Seguros', 'Otros gastos'],
};

const CATEGORIA_ICONS = {
    'Sueldo': '💰', 'Freelance': '💻', 'Inversiones': '📈', 'Alquiler cobrado': '🏠',
    'Bono': '🎁', 'Regalo': '🎁', 'Otros ingresos': '➕',
    'Alimentación': '🛒', 'Transporte': '🚗', 'Vivienda': '🏠', 'Salud': '🩺',
    'Educación': '🎓', 'Ropa': '👕', 'Entretenimiento': '🎬', 'Servicios': '💡',
    'Restaurantes': '🍽', 'Tecnología': '🖥', 'Viajes': '✈️', 'Deporte': '⚽',
    'Seguros': '🛡', 'Otros gastos': '➖',
};

async function initTransacciones() {
    fillAnioSelect(document.getElementById('periodo-anio'));
    fillMesSelect(document.getElementById('periodo-mes'));

    document.getElementById('periodo-anio').addEventListener('change', cargarPeriodo);
    document.getElementById('periodo-mes').addEventListener('change', cargarPeriodo);
    document.getElementById('btn-cerrar-periodo').addEventListener('click', cerrarPeriodo);
    document.getElementById('form-transaccion').addEventListener('submit', onAgregarTransaccion);

    document.getElementById('btn-nueva-transaccion').addEventListener('click', abrirModalTransaccion);
    document.getElementById('btn-cerrar-transaccion').addEventListener('click', cerrarModalTransaccion);
    document.getElementById('modal-transaccion').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-transaccion')) cerrarModalTransaccion();
    });

    // Toggle tipo
    document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('t-tipo').value = btn.dataset.value;
            actualizarCategorias(btn.dataset.value);
        });
    });

    // Día actual por defecto
    document.getElementById('t-dia').value = new Date().getDate();

    // Tabs filtro
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtroActivo = tab.dataset.filter;
            renderTabla();
        });
    });

    actualizarCategorias('INGRESO');
    actualizarMesLabel();
    await cargarPeriodo();
}

function actualizarCategorias(tipo) {
    const sel = document.getElementById('t-categoria');
    const prev = sel.value;
    sel.innerHTML = '<option value="">— Seleccionar —</option>';
    (CATEGORIAS[tipo] || []).forEach(cat => {
        const o = document.createElement('option');
        o.value = cat;
        o.textContent = cat;
        if (cat === prev) o.selected = true;
        sel.appendChild(o);
    });
}

function abrirModalTransaccion() {
    if (periodoActual?.cerrado) return;
    document.getElementById('modal-transaccion').classList.remove('hidden');
    document.getElementById('t-descripcion').focus();
}

function cerrarModalTransaccion() {
    document.getElementById('modal-transaccion').classList.add('hidden');
}

function actualizarMesLabel() {
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    document.getElementById('fecha-mes-label').textContent = `${MESES[mes - 1]} ${anio} —`;
}

async function cargarPeriodo() {
    actualizarMesLabel();
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;

    const [periodoRes, presupuestoRes] = await Promise.allSettled([
        api.getPeriodo(anio, mes),
        api.getPresupuesto(anio, mes),
    ]);

    periodoActual = periodoRes.status === 'fulfilled'
        ? periodoRes.value
        : { anio, mes, cerrado: false, totalIngresos: 0, totalGastos: 0, balance: 0, transacciones: [] };

    presupuestoMes = presupuestoRes.status === 'fulfilled' ? presupuestoRes.value : null;

    renderPeriodo();
}

function renderPeriodo() {
    if (!periodoActual) return;
    const cerrado = periodoActual.cerrado;
    document.getElementById('btn-cerrar-periodo').disabled = cerrado;
    document.getElementById('form-transaccion').style.opacity = cerrado ? '.5' : '1';
    document.getElementById('form-transaccion').style.pointerEvents = cerrado ? 'none' : '';
    const fab = document.getElementById('btn-nueva-transaccion');
    fab.classList.toggle('fab-disabled', cerrado);
    fab.title = cerrado ? 'Período cerrado' : 'Agregar transacción';

    // La asignación de tipo GASTO es siempre la base del disponible
    const gastoPresupuestado = presupuestoMes?.asignaciones
        ?.filter(a => a.tipo === 'GASTO')
        .reduce((sum, a) => sum + Number(a.monto), 0) ?? 0;

    // Disponible = gasto presupuestado + ingresos extra registrados - gastos reales
    const disponible = gastoPresupuestado
        + Number(periodoActual.totalIngresos)
        - Number(periodoActual.totalGastos);

    const tienePresupuesto = presupuestoMes !== null;

    const bar = document.getElementById('summary-bar');
    bar.innerHTML = `
        <div class="summary-item">
            <div class="s-label">Ingresos</div>
            <div class="s-value text-success">${fmt(periodoActual.totalIngresos)}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Gastos</div>
            <div class="s-value text-danger">${fmt(periodoActual.totalGastos)}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Disponible${tienePresupuesto ? ` <small style="color:var(--text-muted);font-weight:400">base ${fmt(gastoPresupuestado)}</small>` : ''}</div>
            <div class="s-value" style="color:${disponible >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${fmt(disponible)}
            </div>
        </div>
        ${cerrado ? '<div class="summary-item"><div class="s-label" style="color:var(--warning)">⚠ Periodo CERRADO</div></div>' : ''}
    `;
    renderTabla();
}

function agruparPorFecha(lista) {
    const grupos = new Map();
    lista.forEach(t => {
        if (!grupos.has(t.fecha)) grupos.set(t.fecha, []);
        grupos.get(t.fecha).push(t);
    });
    return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function labelFecha(fechaStr) {
    const hoyStr = new Date().toISOString().slice(0, 10);
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().slice(0, 10);
    if (fechaStr === hoyStr) return 'Hoy';
    if (fechaStr === ayerStr) return 'Ayer';
    return fmtDate(fechaStr);
}

function renderTabla() {
    const cont = document.getElementById('tabla-transacciones');
    if (!periodoActual) { cont.innerHTML = ''; return; }
    let lista = periodoActual.transacciones || [];
    if (filtroActivo !== 'todos') lista = lista.filter(t => t.tipo === filtroActivo);

    if (lista.length === 0) {
        cont.innerHTML = emptyState({
            icon: '🧾',
            title: filtroActivo === 'todos' ? 'Todavía no hay movimientos' : 'Nada para mostrar con este filtro',
            text: filtroActivo === 'todos'
                ? 'Cargá tu primer ingreso o gasto con el botón "+".'
                : 'Probá con otro filtro o agregá una transacción nueva.',
        });
        return;
    }

    const grupos = agruparPorFecha(lista);
    cont.innerHTML = grupos.map(([fecha, items]) => `
        <div class="tx-group">
            <div class="tx-group-label">${labelFecha(fecha)}</div>
            ${items.map(t => `
                <div class="tx-row">
                    <span class="tx-icon ${t.tipo === 'INGRESO' ? 'success' : 'danger'}">${CATEGORIA_ICONS[t.categoria] || (t.tipo === 'INGRESO' ? '↑' : '↓')}</span>
                    <div class="tx-row-info">
                        <div class="tx-row-desc">${t.descripcion}</div>
                        <div class="tx-row-cat">${t.categoria}</div>
                    </div>
                    <div class="tx-row-right">
                        <div class="tx-row-monto ${t.tipo === 'INGRESO' ? 'income' : 'expense'}">${t.tipo === 'INGRESO' ? '+' : '-'} ${fmt(t.monto)}</div>
                        ${periodoActual.cerrado ? '' : `<button class="btn-icon" onclick="eliminarTransaccion(${t.id})">🗑</button>`}
                    </div>
                </div>`).join('')}
        </div>`).join('');
}

async function onAgregarTransaccion(e) {
    e.preventDefault();
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    const dia = +document.getElementById('t-dia').value;

    const categoria = document.getElementById('t-categoria').value;
    if (!categoria) { showToast('Seleccioná una categoría', 'error'); return; }

    // Validar día en el mes
    const diasEnMes = new Date(anio, mes, 0).getDate();
    if (dia < 1 || dia > diasEnMes) {
        showToast(`El día debe estar entre 1 y ${diasEnMes}`, 'error');
        return;
    }

    const fecha = `${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;

    const dto = {
        descripcion: document.getElementById('t-descripcion').value,
        monto: +document.getElementById('t-monto').value,
        tipo: document.getElementById('t-tipo').value,
        categoria,
        fecha,
    };
    try {
        await api.agregarTransaccion(anio, mes, dto);
        periodoActual = await api.getPeriodo(anio, mes);
        renderPeriodo();
        // Resetear solo descripción y monto, mantener tipo/categoría/día
        document.getElementById('t-descripcion').value = '';
        document.getElementById('t-monto').value = '';
        cerrarModalTransaccion();
        showToast('Transacción agregada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function eliminarTransaccion(id) {
    if (!confirm('¿Eliminar esta transacción?')) return;
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    try {
        await api.eliminarTransaccion(id);
        periodoActual = await api.getPeriodo(anio, mes);
        renderPeriodo();
        showToast('Transacción eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cerrarPeriodo() {
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    if (!confirm(`¿Cerrar el periodo ${MESES[mes-1]} ${anio}? Esta acción no se puede deshacer.`)) return;
    try {
        periodoActual = await api.cerrarPeriodo(anio, mes);
        renderPeriodo();
        showToast('Periodo cerrado correctamente');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
