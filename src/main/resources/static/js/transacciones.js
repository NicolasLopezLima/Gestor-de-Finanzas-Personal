let periodoActual = null;
let presupuestoMes = null;
let filtroActivo = 'todos';
let importPreview = null;              // { anio, mes, nuevas, conflictos }
let resolucionesConflicto = new Map(); // indice del conflicto -> 'MANTENER_EXISTENTE' | 'USAR_EXCEL' | 'MANTENER_AMBAS'
let archivoPendienteImportacion = null; // File seleccionado, por si hace falta reenviarlo con un mapeo
let mapeoContexto = null;               // { anio, mes }

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

    document.getElementById('btn-descargar-plantilla').addEventListener('click', descargarPlantilla);
    document.getElementById('btn-importar-excel').addEventListener('click', () => document.getElementById('input-importar-excel').click());
    document.getElementById('input-importar-excel').addEventListener('change', onImportarExcel);
    document.getElementById('btn-cerrar-import-errores').addEventListener('click', () => document.getElementById('modal-import-errores').classList.add('hidden'));

    document.getElementById('btn-cerrar-conflictos-import').addEventListener('click', cerrarModalConflictos);
    document.getElementById('btn-confirmar-import').addEventListener('click', onConfirmarImportacion);
    document.getElementById('modal-conflictos-import').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-conflictos-import')) cerrarModalConflictos();
    });

    document.getElementById('btn-cerrar-mapeo-import').addEventListener('click', cerrarModalMapeo);
    document.getElementById('modal-mapeo-import').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-mapeo-import')) cerrarModalMapeo();
    });
    document.getElementById('form-mapeo-import').addEventListener('submit', onSubmitMapeoWizard);

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

    const btnImportar = document.getElementById('btn-importar-excel');
    btnImportar.disabled = cerrado;
    btnImportar.title = cerrado ? 'Período cerrado' : 'Importar transacciones desde Excel';

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

function descargarPlantilla() {
    const anio = document.getElementById('periodo-anio').value;
    const mes = document.getElementById('periodo-mes').value;
    window.location.href = `/api/periodos/${anio}/${mes}/transacciones/plantilla`;
}

async function onImportarExcel(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (periodoActual?.cerrado) {
        showToast('El período está cerrado y no acepta nuevas transacciones.', 'error');
        return;
    }
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    archivoPendienteImportacion = file;
    const formData = new FormData();
    formData.append('archivo', file);
    try {
        const resultado = await api.importarTransacciones(anio, mes, formData);
        manejarResultadoImportacion(anio, mes, resultado);
    } catch (err) {
        archivoPendienteImportacion = null;
        if (err.filasConError && err.filasConError.length > 0) {
            mostrarErroresImportacion(err.message, err.filasConError);
        } else {
            showToast(err.message, 'error');
        }
    }
}

function manejarResultadoImportacion(anio, mes, resultado) {
    if (resultado.requiereMapeo) {
        abrirModalMapeo(anio, mes, resultado.encabezadosDetectados);
    } else if (resultado.requiereResolucion) {
        archivoPendienteImportacion = null;
        abrirModalConflictos(anio, mes, resultado.preview);
    } else {
        archivoPendienteImportacion = null;
        periodoActual = resultado.resultado.periodo;
        renderPeriodo();
        showToast(`Se importaron ${resultado.resultado.importadas} transacciones`);
    }
}

function mostrarErroresImportacion(mensaje, filas) {
    document.getElementById('import-error-summary').textContent = mensaje;
    document.getElementById('import-error-list').innerHTML = filas.map(f => `
        <div class="tx-import-error-row"><strong>${f.tabla ? f.tabla + ' - ' : ''}Fila ${f.fila}:</strong> ${f.errores.join(', ')}</div>`).join('');
    document.getElementById('modal-import-errores').classList.remove('hidden');
}

// ── Resolución de conflictos de importación (estilo merge de git) ──────────

function abrirModalConflictos(anio, mes, preview) {
    importPreview = { anio, mes, nuevas: preview.nuevas, conflictos: preview.conflictos };
    resolucionesConflicto = new Map();
    renderConflictos();
    document.getElementById('modal-conflictos-import').classList.remove('hidden');
}

function cerrarModalConflictos() {
    document.getElementById('modal-conflictos-import').classList.add('hidden');
    importPreview = null;
    resolucionesConflicto = new Map();
}

function renderFilaConflicto(t) {
    return `
        <div class="conflict-field"><span>Fecha</span><strong>${fmtDate(t.fecha)}</strong></div>
        <div class="conflict-field"><span>Descripción</span><strong>${t.descripcion}</strong></div>
        <div class="conflict-field"><span>Categoría</span><strong>${t.categoria}</strong></div>
        <div class="conflict-field"><span>Tipo</span><strong>${t.tipo}</strong></div>
        <div class="conflict-field"><span>Monto</span><strong>${fmt(t.monto)}</strong></div>`;
}

function renderConflictos() {
    const cont = document.getElementById('conflictos-list');
    cont.innerHTML = importPreview.conflictos.map((c, i) => {
        const accion = resolucionesConflicto.get(i);
        return `
        <div class="conflict-card">
            <div class="conflict-card-header">
                <span class="conflict-badge">Conflicto ${i + 1} de ${importPreview.conflictos.length}</span>
                <span class="conflict-key">${fmtDate(c.existente.fecha)} · ${c.existente.descripcion} · ${fmt(c.existente.monto)}</span>
            </div>
            <div class="conflict-diff">
                <div class="conflict-side conflict-side-existing ${accion === 'MANTENER_EXISTENTE' ? 'is-selected' : ''}">
                    <div class="conflict-marker">&lt;&lt;&lt;&lt;&lt;&lt;&lt; Existente</div>
                    ${renderFilaConflicto(c.existente)}
                </div>
                <div class="conflict-side conflict-side-incoming ${accion === 'USAR_EXCEL' ? 'is-selected' : ''}">
                    <div class="conflict-marker">&gt;&gt;&gt;&gt;&gt;&gt;&gt; Excel</div>
                    ${renderFilaConflicto(c.entrante)}
                </div>
            </div>
            <div class="conflict-actions">
                <button type="button" class="np-button np-pill np-pill-sm conflict-btn ${accion === 'MANTENER_EXISTENTE' ? 'active' : ''}" data-accion="MANTENER_EXISTENTE" data-index="${i}">Mantener existente</button>
                <button type="button" class="np-button np-pill np-pill-sm conflict-btn ${accion === 'USAR_EXCEL' ? 'active' : ''}" data-accion="USAR_EXCEL" data-index="${i}">Usar versión Excel</button>
                <button type="button" class="np-button np-pill np-pill-sm conflict-btn ${accion === 'MANTENER_AMBAS' ? 'active' : ''}" data-accion="MANTENER_AMBAS" data-index="${i}">Mantener ambas</button>
            </div>
        </div>`;
    }).join('');

    cont.querySelectorAll('.conflict-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            resolucionesConflicto.set(+btn.dataset.index, btn.dataset.accion);
            renderConflictos();
        });
    });
    renderPreviewConflictos();
    actualizarEstadoConfirmar();
}

function actualizarEstadoConfirmar() {
    const total = importPreview.conflictos.length;
    const resueltos = resolucionesConflicto.size;
    document.getElementById('conflictos-progreso').textContent = `${resueltos} / ${total} conflictos resueltos`;
    document.getElementById('btn-confirmar-import').disabled = resueltos < total;
}

function renderPreviewConflictos() {
    let resultado = (periodoActual.transacciones || []).map(t => {
        const idx = importPreview.conflictos.findIndex(c => c.existenteId === t.id);
        if (idx === -1) return t;
        return resolucionesConflicto.get(idx) === 'USAR_EXCEL'
            ? { ...importPreview.conflictos[idx].entrante, id: t.id }
            : t; // MANTENER_EXISTENTE o sin resolver todavía: se muestra el existente
    });
    importPreview.conflictos.forEach((c, i) => {
        if (resolucionesConflicto.get(i) === 'MANTENER_AMBAS') resultado.push(c.entrante);
    });
    resultado = resultado.concat(importPreview.nuevas);

    const grupos = agruparPorFecha(resultado);
    document.getElementById('conflictos-preview-list').innerHTML = grupos.map(([fecha, items]) => `
        <div class="tx-group">
            <div class="tx-group-label">${labelFecha(fecha)}</div>
            ${items.map(t => `
                <div class="tx-row">
                    <span class="tx-icon ${t.tipo === 'INGRESO' ? 'success' : 'danger'}">${CATEGORIA_ICONS[t.categoria] || (t.tipo === 'INGRESO' ? '↑' : '↓')}</span>
                    <div class="tx-row-info"><div class="tx-row-desc">${t.descripcion}</div><div class="tx-row-cat">${t.categoria}</div></div>
                    <div class="tx-row-monto ${t.tipo === 'INGRESO' ? 'income' : 'expense'}">${t.tipo === 'INGRESO' ? '+' : '-'} ${fmt(t.monto)}</div>
                </div>`).join('')}
        </div>`).join('');
}

async function onConfirmarImportacion() {
    if (!importPreview) return;
    const resoluciones = importPreview.conflictos.map((c, i) => ({
        existenteId: c.existenteId,
        entrante: c.entrante,
        accion: resolucionesConflicto.get(i),
    }));
    try {
        const resultado = await api.confirmarImportacion(importPreview.anio, importPreview.mes, {
            nuevas: importPreview.nuevas,
            resoluciones,
        });
        periodoActual = resultado.periodo;
        renderPeriodo();
        cerrarModalConflictos();
        showToast(`Se importaron ${resultado.importadas} transacciones`);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ── Asistente de mapeo de columnas (archivos que no siguen la plantilla) ────

function abrirModalMapeo(anio, mes, encabezados) {
    mapeoContexto = { anio, mes };
    const opcionesObligatorias = '<option value="">— Seleccionar —</option>' +
        encabezados.map(h => `<option value="${h}">${h}</option>`).join('');
    const opcionesOpcionales = '<option value="">— No tengo esta columna —</option>' +
        encabezados.map(h => `<option value="${h}">${h}</option>`).join('');

    document.getElementById('mapeo-fecha').innerHTML = opcionesOpcionales;
    document.getElementById('mapeo-categoria').innerHTML = opcionesOpcionales;
    ['mapeo-desc-ingreso', 'mapeo-monto-ingreso-tabla', 'mapeo-desc-gasto', 'mapeo-monto-gasto-tabla'].forEach(id => {
        document.getElementById(id).innerHTML = opcionesObligatorias;
    });

    document.getElementById('mapeo-recordar').checked = false;
    document.getElementById('modal-mapeo-import').classList.remove('hidden');
}

function cerrarModalMapeo() {
    document.getElementById('modal-mapeo-import').classList.add('hidden');
    mapeoContexto = null;
    archivoPendienteImportacion = null;
}

async function onSubmitMapeoWizard(e) {
    e.preventDefault();
    if (!archivoPendienteImportacion || !mapeoContexto) return;

    const columnaDescripcionIngreso = document.getElementById('mapeo-desc-ingreso').value;
    const columnaMontoIngreso = document.getElementById('mapeo-monto-ingreso-tabla').value;
    const columnaDescripcionGasto = document.getElementById('mapeo-desc-gasto').value;
    const columnaMontoGasto = document.getElementById('mapeo-monto-gasto-tabla').value;
    if (!columnaDescripcionIngreso || !columnaMontoIngreso || !columnaDescripcionGasto || !columnaMontoGasto) {
        showToast('Elegí las columnas de Descripción y Monto para Ingresos y para Gastos', 'error');
        return;
    }

    const { anio, mes } = mapeoContexto;
    const formData = new FormData();
    formData.append('archivo', archivoPendienteImportacion);
    formData.append('columnaFecha', document.getElementById('mapeo-fecha').value);
    formData.append('columnaCategoria', document.getElementById('mapeo-categoria').value);
    formData.append('recordarMapeo', document.getElementById('mapeo-recordar').checked ? 'true' : 'false');
    formData.append('modoImporte', 'TABLAS_INDEPENDIENTES');
    formData.append('columnaDescripcionIngreso', columnaDescripcionIngreso);
    formData.append('columnaMontoIngreso', columnaMontoIngreso);
    formData.append('columnaDescripcionGasto', columnaDescripcionGasto);
    formData.append('columnaMontoGasto', columnaMontoGasto);

    try {
        const resultado = await api.importarTransaccionesConMapeo(anio, mes, formData);
        cerrarModalMapeo();
        manejarResultadoImportacion(anio, mes, resultado);
    } catch (err) {
        if (err.filasConError && err.filasConError.length > 0) {
            cerrarModalMapeo();
            mostrarErroresImportacion(err.message, err.filasConError);
        } else {
            showToast(err.message, 'error');
        }
    }
}
