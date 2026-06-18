let periodoActual = null;
let filtroActivo = 'todos';

// Categorías predefinidas por tipo
const CATEGORIAS = {
    INGRESO: ['Sueldo', 'Freelance', 'Inversiones', 'Alquiler cobrado', 'Bono', 'Regalo', 'Otros ingresos'],
    GASTO:   ['Alimentación', 'Transporte', 'Vivienda', 'Salud', 'Educación', 'Ropa', 'Entretenimiento',
               'Servicios', 'Restaurantes', 'Tecnología', 'Viajes', 'Deporte', 'Seguros', 'Otros gastos'],
};

async function initTransacciones() {
    fillAnioSelect(document.getElementById('periodo-anio'));
    fillMesSelect(document.getElementById('periodo-mes'));

    document.getElementById('periodo-anio').addEventListener('change', cargarPeriodo);
    document.getElementById('periodo-mes').addEventListener('change', cargarPeriodo);
    document.getElementById('btn-cerrar-periodo').addEventListener('click', cerrarPeriodo);
    document.getElementById('form-transaccion').addEventListener('submit', onAgregarTransaccion);

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

function actualizarMesLabel() {
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    document.getElementById('fecha-mes-label').textContent = `${MESES[mes - 1]} ${anio} —`;
}

async function cargarPeriodo() {
    actualizarMesLabel();
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    try {
        periodoActual = await api.getPeriodo(anio, mes);
    } catch {
        // Periodo aún no existe, lo creará al agregar la primera transacción
        periodoActual = { anio, mes, cerrado: false, totalIngresos: 0, totalGastos: 0, balance: 0, transacciones: [] };
    }
    renderPeriodo();
}

function renderPeriodo() {
    if (!periodoActual) return;
    const cerrado = periodoActual.cerrado;
    document.getElementById('btn-cerrar-periodo').disabled = cerrado;
    document.getElementById('form-transaccion').style.opacity = cerrado ? '.5' : '1';
    document.getElementById('form-transaccion').style.pointerEvents = cerrado ? 'none' : '';

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
            <div class="s-label">Balance</div>
            <div class="s-value" style="color:${periodoActual.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${fmt(periodoActual.balance)}
            </div>
        </div>
        ${cerrado ? '<div class="summary-item"><div class="s-label" style="color:var(--warning)">⚠ Periodo CERRADO</div></div>' : ''}
    `;
    renderTabla();
}

function renderTabla() {
    const tbody = document.querySelector('#tabla-transacciones tbody');
    if (!periodoActual) { tbody.innerHTML = ''; return; }
    let lista = periodoActual.transacciones || [];
    if (filtroActivo !== 'todos') lista = lista.filter(t => t.tipo === filtroActivo);

    tbody.innerHTML = lista.length === 0
        ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sin transacciones</td></tr>'
        : lista.map(t => `
            <tr>
                <td>${fmtDate(t.fecha)}</td>
                <td>${t.descripcion}</td>
                <td>${t.categoria}</td>
                <td><span class="badge badge-${t.tipo.toLowerCase()}">${t.tipo === 'INGRESO' ? '↑ Ingreso' : '↓ Gasto'}</span></td>
                <td style="font-weight:600;color:${t.tipo === 'INGRESO' ? 'var(--success)' : 'var(--danger)'}">${fmt(t.monto)}</td>
                <td>${periodoActual.cerrado ? '' : `<button class="btn-icon" onclick="eliminarTransaccion(${t.id})">🗑</button>`}</td>
            </tr>`).join('');
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
