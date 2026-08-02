let periodoActual = null;
let presupuestoMes = null;
let filtroActivo = 'todos';
let filtroCategoria = '';
let importPreview = null;              // { anio, mes, nuevas, conflictos }
let resolucionesConflicto = new Map(); // indice del conflicto -> 'MANTENER_EXISTENTE' | 'USAR_EXCEL' | 'MANTENER_AMBAS'
let archivoPendienteImportacion = null; // File seleccionado, por si hace falta reenviarlo con un mapeo
let mapeoContexto = null;               // { anio, mes }

// Importación de historial completo (varias hojas, cada una a su propio período)
let deteccionHistoricoActual = null;   // DeteccionHistoricoDTO tal cual la devuelve el backend
let modoMapeoHistorico = false;        // true mientras el asistente de mapeo está resolviendo para este flujo
let mapeoHistoricoResuelto = null;     // SeleccionMapeoDTO ya armado, listo para mandar en la confirmación
let importPreviewHistorico = null;     // { nuevas, conflictos } de la importación multi-período
let resolucionesConflictoHistorico = new Map();
let conflictosEnModoHistorico = false; // qué handler usa el botón "Confirmar importación" compartido

// Categorías del usuario, cargadas del servidor (se pueden crear/editar/borrar).
// categoriasPorTipo: { INGRESO: [{id, nombre, icono}], GASTO: [...] }
let categoriasPorTipo = { INGRESO: [], GASTO: [] };
let iconoPorCategoria = {}; // "GASTO:Alimentación" -> icono, para el ícono de cada fila

// Íconos disponibles para elegir al crear/editar una categoría
const CATEGORIA_ICONOS_DISPONIBLES = [
    'payments', 'laptop_mac', 'trending_up', 'home', 'redeem', 'add_circle', 'shopping_cart',
    'directions_car', 'medical_services', 'school', 'checkroom', 'movie', 'lightbulb', 'restaurant',
    'computer', 'flight', 'sports_soccer', 'shield', 'remove_circle', 'pets', 'child_care',
    'fitness_center', 'local_gas_station', 'credit_card', 'savings', 'category', 'celebration',
    'favorite', 'local_cafe', 'spa',
];

async function cargarCategorias() {
    const lista = await api.listarCategorias();
    categoriasPorTipo = { INGRESO: [], GASTO: [] };
    iconoPorCategoria = {};
    lista.forEach(c => {
        categoriasPorTipo[c.tipo].push(c);
        iconoPorCategoria[`${c.tipo}:${c.nombre}`] = c.icono;
    });
}

function iconoDeCategoria(tipo, nombre) {
    return iconoPorCategoria[`${tipo}:${nombre}`];
}

async function initTransacciones() {
    fillAnioCustomSelect('periodo-anio');
    fillMesCustomSelect('periodo-mes');

    document.getElementById('periodo-anio').addEventListener('change', cargarPeriodo);
    document.getElementById('periodo-mes').addEventListener('change', cargarPeriodo);
    document.getElementById('btn-cerrar-periodo').addEventListener('click', cerrarPeriodo);
    document.getElementById('form-transaccion').addEventListener('submit', onAgregarTransaccion);

    document.getElementById('btn-nueva-transaccion').addEventListener('click', () => abrirModalTransaccion());
    document.getElementById('btn-cerrar-transaccion').addEventListener('click', cerrarModalTransaccion);
    document.getElementById('modal-transaccion').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-transaccion')) cerrarModalTransaccion();
    });

    document.getElementById('btn-descargar-plantilla').addEventListener('click', descargarPlantilla);
    document.getElementById('btn-importar-excel').addEventListener('click', () => document.getElementById('input-importar-excel').click());
    document.getElementById('input-importar-excel').addEventListener('change', onImportarExcel);
    document.getElementById('btn-cerrar-import-errores').addEventListener('click', () => document.getElementById('modal-import-errores').classList.add('hidden'));

    document.getElementById('btn-cerrar-conflictos-import').addEventListener('click', cerrarModalConflictos);
    document.getElementById('btn-confirmar-import').addEventListener('click', () => {
        if (conflictosEnModoHistorico) onConfirmarImportacionHistorico(); else onConfirmarImportacion();
    });
    document.getElementById('modal-conflictos-import').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-conflictos-import')) cerrarModalConflictos();
    });

    document.getElementById('btn-cerrar-mapeo-import').addEventListener('click', cerrarModalMapeo);
    document.getElementById('modal-mapeo-import').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-mapeo-import')) cerrarModalMapeo();
    });
    document.getElementById('form-mapeo-import').addEventListener('submit', onSubmitMapeoWizard);

    document.getElementById('btn-cerrar-revision-hojas').addEventListener('click', cerrarModalRevisionHojas);
    document.getElementById('modal-revision-hojas').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-revision-hojas')) cerrarModalRevisionHojas();
    });
    document.getElementById('btn-confirmar-revision-hojas').addEventListener('click', onConfirmarRevisionHojas);

    // Toggle tipo (solo los botones del modal de transacción — el de categorías se maneja aparte)
    document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('t-tipo').value = btn.dataset.value;
            actualizarCategorias(btn.dataset.value);
        });
    });

    // Día actual por defecto
    document.getElementById('t-dia').value = new Date().getDate();

    // Tabs filtro (tipo) + desplegable de filtro por categoría
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtroActivo = tab.dataset.filter;
            actualizarFiltroCategoria();
            renderTabla();
        });
    });
    document.getElementById('filtro-categoria').addEventListener('change', () => {
        filtroCategoria = document.getElementById('filtro-categoria').value;
        renderTabla();
    });

    document.getElementById('btn-cerrar-categorias').addEventListener('click', cerrarModalCategorias);
    document.getElementById('modal-categorias').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-categorias')) cerrarModalCategorias();
    });
    document.getElementById('categorias-modo-ingreso').addEventListener('click', () => cambiarTipoModalCategorias('INGRESO'));
    document.getElementById('categorias-modo-gasto').addEventListener('click', () => cambiarTipoModalCategorias('GASTO'));
    document.getElementById('form-categoria').addEventListener('submit', onGuardarCategoria);

    await cargarCategorias();
    actualizarCategorias('INGRESO');
    actualizarFiltroCategoria();
    actualizarMesLabel();
    await cargarPeriodo();
}

function actualizarCategorias(tipo) {
    const prev = document.getElementById('t-categoria').value;
    const categorias = (categoriasPorTipo[tipo] || []).map(c => c.nombre);
    crearCustomSelect('t-categoria', categorias, '— Seleccionar —', {
        texto: 'Agregar categoría',
        icono: 'add_circle',
        onClick: () => abrirModalCategorias(document.getElementById('t-tipo').value),
    });
    if (categorias.includes(prev)) document.getElementById('t-categoria').value = prev;
}

// Opciones del filtro por categoría de la lista de transacciones: se limitan al
// tipo elegido en las tabs (Ingresos/Gastos), o a la unión de ambas con "Todos".
function actualizarFiltroCategoria() {
    const prev = document.getElementById('filtro-categoria').value;
    const categorias = filtroActivo === 'todos'
        ? [...new Set([...categoriasPorTipo.INGRESO, ...categoriasPorTipo.GASTO].map(c => c.nombre))]
        : (categoriasPorTipo[filtroActivo] || []).map(c => c.nombre);
    crearCustomSelect('filtro-categoria', categorias, 'Todas las categorías');
    filtroCategoria = categorias.includes(prev) ? prev : '';
    document.getElementById('filtro-categoria').value = filtroCategoria;
}

// ── Gestión de categorías (crear/editar/borrar, con ícono propio) ──────────

let categoriaModalTipo = 'INGRESO';

function abrirModalCategorias(tipoInicial) {
    cambiarTipoModalCategorias(tipoInicial || 'INGRESO');
    document.getElementById('modal-categorias').classList.remove('hidden');
}

function cerrarModalCategorias() {
    document.getElementById('modal-categorias').classList.add('hidden');
    // Si el modal de Nueva Transacción sigue abierto detrás, refrescamos su desplegable
    // de categoría por si se creó/editó/borró algo mientras tanto.
    if (!document.getElementById('modal-transaccion').classList.contains('hidden')) {
        actualizarCategorias(document.getElementById('t-tipo').value);
    }
    // El filtro de categoría de la lista puede haber quedado con un nombre viejo
    // (renombrado) o inexistente (borrado) — se recalcula y se vuelve a renderizar.
    actualizarFiltroCategoria();
    renderTabla();
}

function cambiarTipoModalCategorias(tipo) {
    categoriaModalTipo = tipo;
    document.getElementById('categorias-modo-ingreso').classList.toggle('active', tipo === 'INGRESO');
    document.getElementById('categorias-modo-gasto').classList.toggle('active', tipo === 'GASTO');
    resetFormCategoria();
    renderListaCategorias(tipo);
}

function resetFormCategoria() {
    document.getElementById('form-categoria').reset();
    document.getElementById('categoria-id').value = '';
    document.getElementById('categoria-icono').value = 'category';
    renderCategoriaIconPicker('category');
    document.getElementById('btn-guardar-categoria').textContent = 'Agregar categoría';
}

function renderCategoriaIconPicker(seleccionado) {
    const cont = document.getElementById('categoria-icon-picker');
    cont.innerHTML = CATEGORIA_ICONOS_DISPONIBLES.map(ic => `
        <button type="button" class="meta-icon-btn ${ic === seleccionado ? 'active' : ''}" data-icon="${ic}" onclick="seleccionarIconoCategoria('${ic}')">
            <span class="material-symbols-outlined">${ic}</span>
        </button>`).join('');
}

function seleccionarIconoCategoria(icono) {
    document.getElementById('categoria-icono').value = icono;
    document.querySelectorAll('#categoria-icon-picker .meta-icon-btn').forEach(b => b.classList.toggle('active', b.dataset.icon === icono));
}

function renderListaCategorias(tipo) {
    const lista = categoriasPorTipo[tipo] || [];
    const cont = document.getElementById('categorias-lista');
    if (lista.length === 0) {
        cont.innerHTML = `<p class="mapeo-hint">Todavía no hay categorías de ${tipo === 'INGRESO' ? 'ingreso' : 'gasto'}.</p>`;
        return;
    }
    cont.innerHTML = lista.map(c => `
        <div class="categoria-row">
            <span class="material-symbols-outlined categoria-row-icon">${c.icono}</span>
            <span class="categoria-row-nombre">${c.nombre}</span>
            <div class="categoria-row-acciones">
                <button type="button" class="btn-icon" onclick="prepararEdicionCategoria(${c.id})"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>
                <button type="button" class="btn-icon" onclick="onEliminarCategoria(${c.id})"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>
            </div>
        </div>`).join('');
}

function prepararEdicionCategoria(id) {
    const c = (categoriasPorTipo[categoriaModalTipo] || []).find(x => x.id === id);
    if (!c) return;
    document.getElementById('categoria-id').value = c.id;
    document.getElementById('categoria-nombre').value = c.nombre;
    document.getElementById('categoria-icono').value = c.icono;
    renderCategoriaIconPicker(c.icono);
    document.getElementById('btn-guardar-categoria').textContent = 'Guardar cambios';
    document.getElementById('categoria-nombre').focus();
}

async function onGuardarCategoria(e) {
    e.preventDefault();
    const nombre = document.getElementById('categoria-nombre').value.trim();
    if (!nombre) { showToast('Ponele un nombre a la categoría', 'error'); return; }

    const dto = { nombre, tipo: categoriaModalTipo, icono: document.getElementById('categoria-icono').value };
    const id = document.getElementById('categoria-id').value;
    try {
        if (id) {
            await api.editarCategoria(+id, dto);
        } else {
            await api.crearCategoria(dto);
        }
        await cargarCategorias();
        resetFormCategoria();
        renderListaCategorias(categoriaModalTipo);
        showToast('Categoría guardada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function onEliminarCategoria(id) {
    let mensaje = '¿Eliminar esta categoría?';
    try {
        const uso = await api.contarUsoCategoria(id);
        if (uso > 0) {
            mensaje = `Esta categoría tiene ${uso} transacción(es) cargada(s). Van a mantener este nombre, pero la categoría ya no va a poder elegirse para transacciones nuevas. ¿Eliminarla igual?`;
        }
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }
    if (!confirm(mensaje)) return;
    try {
        await api.eliminarCategoria(id);
        await cargarCategorias();
        renderListaCategorias(categoriaModalTipo);
        showToast('Categoría eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function abrirModalTransaccion(id) {
    if (periodoActual?.cerrado) return;

    document.getElementById('form-transaccion').reset();
    document.getElementById('t-id').value = '';
    document.getElementById('modal-transaccion-title').textContent = 'Nueva Transacción';
    document.getElementById('tx-submit-btn-label').textContent = 'Registrar Transacción';
    document.getElementById('t-dia').value = new Date().getDate();
    document.getElementById('t-repetir-grupo').classList.remove('hidden');
    document.getElementById('t-fija-info').classList.add('hidden');

    let tipo = 'INGRESO';
    const t = id ? (periodoActual?.transacciones || []).find(x => x.id === id) : null;
    if (t) {
        document.getElementById('modal-transaccion-title').textContent = 'Editar Transacción';
        document.getElementById('tx-submit-btn-label').textContent = 'Guardar cambios';
        document.getElementById('t-id').value = t.id;
        document.getElementById('t-monto').value = t.monto;
        document.getElementById('t-descripcion').value = t.descripcion;
        document.getElementById('t-dia').value = +t.fecha.slice(8, 10);
        tipo = t.tipo;

        // No se puede tildar "repetir" al editar (solo se decide al crear)
        document.getElementById('t-repetir-grupo').classList.add('hidden');
        if (t.transaccionFijaId) {
            document.getElementById('t-fija-info').classList.remove('hidden');
            document.getElementById('btn-cancelar-recurrencia').onclick = () => cancelarRecurrencia(t.id);
        }
    }

    document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(b => b.classList.toggle('active', b.dataset.value === tipo));
    document.getElementById('t-tipo').value = tipo;
    actualizarCategorias(tipo);
    if (t) document.getElementById('t-categoria').value = t.categoria;

    document.getElementById('modal-transaccion').classList.remove('hidden');
    document.getElementById('t-descripcion').focus();
}

async function cancelarRecurrencia(transaccionId) {
    if (!confirm('¿Dejar de repetir esta transacción? Los meses posteriores a este que ya se hayan generado se van a eliminar; los anteriores (incluido este) quedan intactos.')) return;
    try {
        await api.cancelarRecurrencia(transaccionId);
        cerrarModalTransaccion();
        await cargarPeriodo();
        showToast('Se canceló la recurrencia');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function editarTransaccion(id) {
    abrirModalTransaccion(id);
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
    if (filtroCategoria) lista = lista.filter(t => t.categoria === filtroCategoria);

    const hayFiltro = filtroActivo !== 'todos' || filtroCategoria;
    if (lista.length === 0) {
        cont.innerHTML = emptyState({
            icon: '🧾',
            title: hayFiltro ? 'Nada para mostrar con este filtro' : 'Todavía no hay movimientos',
            text: hayFiltro
                ? 'Probá con otro filtro o agregá una transacción nueva.'
                : 'Cargá tu primer ingreso o gasto con el botón "+".',
        });
        return;
    }

    const grupos = agruparPorFecha(lista);
    cont.innerHTML = grupos.map(([fecha, items]) => `
        <div class="tx-group">
            <div class="tx-group-label">${labelFecha(fecha)}</div>
            ${items.map(t => `
                <div class="tx-row">
                    <span class="tx-icon ${t.tipo === 'INGRESO' ? 'success' : 'danger'}">
                        <span class="material-symbols-outlined">${iconoDeCategoria(t.tipo, t.categoria) || (t.tipo === 'INGRESO' ? 'arrow_upward' : 'arrow_downward')}</span>
                    </span>
                    <div class="tx-row-info">
                        <div class="tx-row-desc">${t.descripcion}${t.transaccionFijaId ? ' <span class="material-symbols-outlined tx-fija-badge" title="Se repite todos los meses">sync</span>' : ''}</div>
                        <div class="tx-row-cat">${t.categoria}</div>
                    </div>
                    <div class="tx-row-right">
                        <div class="tx-row-monto ${t.tipo === 'INGRESO' ? 'income' : 'expense'}">${t.tipo === 'INGRESO' ? '+' : '-'} ${fmt(t.monto)}</div>
                        ${periodoActual.cerrado ? '' : `
                            <button class="btn-icon" onclick="editarTransaccion(${t.id})"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>
                            <button class="btn-icon" onclick="eliminarTransaccion(${t.id})">🗑</button>`}
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
    const id = document.getElementById('t-id').value;
    if (!id) dto.repetirTodosLosMeses = document.getElementById('t-repetir').checked;
    try {
        if (id) {
            await api.editarTransaccion(+id, dto);
        } else {
            await api.agregarTransaccion(anio, mes, dto);
        }
        periodoActual = await api.getPeriodo(anio, mes);
        renderPeriodo();
        if (id) {
            cerrarModalTransaccion();
        } else {
            // Resetear solo descripción y monto, mantener tipo/categoría/día
            document.getElementById('t-descripcion').value = '';
            document.getElementById('t-monto').value = '';
            cerrarModalTransaccion();
        }
        showToast(id ? 'Transacción actualizada' : 'Transacción agregada');
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
    archivoPendienteImportacion = file;
    const formData = new FormData();
    formData.append('archivo', file);

    // Primero se detectan las hojas del archivo — si tiene más de una con pinta de
    // transacciones, se ofrece el flujo de revisión multi-período en vez de importar
    // directo al período que se está viendo (mismo File, FormData se puede reusar/
    // reconstruir sin problema ya que un File no se "consume" al mandarlo).
    let deteccion;
    try {
        deteccion = await api.detectarHistorico(formData);
    } catch (err) {
        archivoPendienteImportacion = null;
        showToast(err.message, 'error');
        return;
    }

    // La decisión de mostrar la revisión es por CANTIDAD de hojas del archivo, no por cuántas
    // "parecen" transacciones — ese heurístico solo decide el tilde por defecto de cada una;
    // con una sola hoja no hay ambigüedad posible, se sigue el camino de siempre.
    if (deteccion.hojas.length <= 1) {
        const anio = +document.getElementById('periodo-anio').value;
        const mes = +document.getElementById('periodo-mes').value;
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
        return;
    }

    deteccionHistoricoActual = deteccion;
    if (deteccion.requiereMapeo) {
        modoMapeoHistorico = true;
        abrirModalMapeo(null, null, deteccion.encabezadosReferencia);
    } else {
        mapeoHistoricoResuelto = null;
        abrirModalRevisionHojas();
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
    conflictosEnModoHistorico = false;
    importPreview = { anio, mes, nuevas: preview.nuevas, conflictos: preview.conflictos };
    resolucionesConflicto = new Map();
    renderConflictos();
    document.getElementById('modal-conflictos-import').classList.remove('hidden');
}

function cerrarModalConflictos() {
    document.getElementById('modal-conflictos-import').classList.add('hidden');
    importPreviewHistorico = null;
    resolucionesConflictoHistorico = new Map();
    conflictosEnModoHistorico = false;
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
                    <span class="tx-icon ${t.tipo === 'INGRESO' ? 'success' : 'danger'}">
                        <span class="material-symbols-outlined">${iconoDeCategoria(t.tipo, t.categoria) || (t.tipo === 'INGRESO' ? 'arrow_upward' : 'arrow_downward')}</span>
                    </span>
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

function abrirModalConflictosHistorico(preview) {
    conflictosEnModoHistorico = true;
    importPreviewHistorico = { nuevas: preview.nuevas, conflictos: preview.conflictos };
    resolucionesConflictoHistorico = new Map();
    renderConflictosHistorico();
    document.getElementById('modal-conflictos-import').classList.remove('hidden');
}

// Mismo diseño de tarjeta que renderConflictos(), reusando renderFilaConflicto — pero sin la
// vista previa en vivo (asumía un solo período; acá los conflictos pueden ser de varios meses
// a la vez, no hay un "periodoActual" único contra el cual armarla).
function renderConflictosHistorico() {
    const cont = document.getElementById('conflictos-list');
    cont.innerHTML = importPreviewHistorico.conflictos.map((c, i) => {
        const accion = resolucionesConflictoHistorico.get(i);
        return `
        <div class="conflict-card">
            <div class="conflict-card-header">
                <span class="conflict-badge">Conflicto ${i + 1} de ${importPreviewHistorico.conflictos.length}</span>
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
            resolucionesConflictoHistorico.set(+btn.dataset.index, btn.dataset.accion);
            renderConflictosHistorico();
        });
    });
    document.getElementById('conflictos-preview-list').innerHTML =
        '<p class="mapeo-hint">La vista previa en vivo no está disponible al importar varios períodos a la vez.</p>';

    const total = importPreviewHistorico.conflictos.length;
    const resueltos = resolucionesConflictoHistorico.size;
    document.getElementById('conflictos-progreso').textContent = `${resueltos} / ${total} conflictos resueltos`;
    document.getElementById('btn-confirmar-import').disabled = resueltos < total;
}

async function onConfirmarImportacionHistorico() {
    if (!importPreviewHistorico) return;
    const resoluciones = importPreviewHistorico.conflictos.map((c, i) => ({
        existenteId: c.existenteId,
        entrante: c.entrante,
        accion: resolucionesConflictoHistorico.get(i),
    }));
    try {
        const resultado = await api.confirmarConflictosHistorico({
            nuevas: importPreviewHistorico.nuevas,
            resoluciones,
        });
        cerrarModalConflictos();
        await cargarPeriodo();
        showToast(`Se importaron ${resultado.importadas} transacciones`);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ── Asistente de mapeo de columnas (archivos que no siguen la plantilla) ────
// crearCustomSelect/cerrarCustomSelects viven en utils.js (se reutilizan en
// todos los desplegables de la app, no solo en este asistente).

function abrirModalMapeo(anio, mes, encabezados) {
    mapeoContexto = { anio, mes };
    const encabezadosConNombre = encabezados.filter(h => h && h.trim());

    crearCustomSelect('mapeo-fecha', encabezadosConNombre, '— No tengo esta columna —');
    crearCustomSelect('mapeo-categoria', encabezadosConNombre, '— No tengo esta columna —');
    ['mapeo-desc-ingreso', 'mapeo-monto-ingreso-tabla', 'mapeo-desc-gasto', 'mapeo-monto-gasto-tabla'].forEach(id => {
        crearCustomSelect(id, encabezadosConNombre, '— Seleccionar —');
    });

    document.getElementById('mapeo-recordar').checked = false;
    document.getElementById('modal-mapeo-import').classList.remove('hidden');
}

function cerrarModalMapeo() {
    cerrarCustomSelects();
    document.getElementById('modal-mapeo-import').classList.add('hidden');
    mapeoContexto = null;
    archivoPendienteImportacion = null;
    modoMapeoHistorico = false;
    deteccionHistoricoActual = null;
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
    const columnaFecha = document.getElementById('mapeo-fecha').value;
    const columnaCategoria = document.getElementById('mapeo-categoria').value;
    const recordarMapeo = document.getElementById('mapeo-recordar').checked;

    if (modoMapeoHistorico) {
        mapeoHistoricoResuelto = {
            modoImporte: 'TABLAS_INDEPENDIENTES',
            columnaFecha, columnaCategoria, recordarMapeo,
            columnaDescripcionIngreso, columnaMontoIngreso, columnaDescripcionGasto, columnaMontoGasto,
        };
        modoMapeoHistorico = false;
        cerrarCustomSelects();
        document.getElementById('modal-mapeo-import').classList.add('hidden');
        abrirModalRevisionHojas();
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

// ── Revisión de hojas al importar historial completo (varios períodos) ─────
// Reusa fillMesCustomSelect (utils.js) para el desplegable de mes de cada fila.

function abrirModalRevisionHojas() {
    // Se muestran TODAS las hojas detectadas, no solo las que el heurístico reconoce — así una
    // hoja con columnas que no adivinamos sigue siendo elegible, en vez de quedar invisible.
    const hojas = deteccionHistoricoActual.hojas;
    renderFilasRevisionHojas(hojas);
    document.getElementById('revision-anio-comun-grupo').classList.toggle('hidden', !deteccionHistoricoActual.requiereAnioComun);
    document.getElementById('revision-anio-comun').value = '';
    document.getElementById('modal-revision-hojas').classList.remove('hidden');
}

function renderFilasRevisionHojas(hojas) {
    const cont = document.getElementById('revision-hojas-list');
    cont.innerHTML = hojas.map((h, i) => `
        <div class="revision-hoja-row">
            <label><input type="checkbox" class="revision-incluir" id="revision-incluir-${i}" ${h.incluir ? 'checked' : ''}> ${h.nombreHoja}</label>
            <div class="revision-hoja-periodo">
                <div class="np-flat tx-field revision-mes-field">
                    <div id="revision-mes-${i}" class="custom-select"></div>
                </div>
                <div class="np-flat tx-field revision-anio-field">
                    <input type="number" id="revision-anio-${i}" min="2000" max="2100" placeholder="Año" value="${h.anioInferido ?? ''}">
                </div>
            </div>
        </div>`).join('');
    hojas.forEach((h, i) => fillMesCustomSelect(`revision-mes-${i}`, h.mesInferido || 1));
}

function cerrarModalRevisionHojas() {
    document.getElementById('modal-revision-hojas').classList.add('hidden');
    deteccionHistoricoActual = null;
    mapeoHistoricoResuelto = null;
    archivoPendienteImportacion = null;
}

async function onConfirmarRevisionHojas() {
    const hojas = deteccionHistoricoActual.hojas;
    const anioComun = document.getElementById('revision-anio-comun').value;

    const seleccionHojas = hojas.map((h, i) => {
        const incluir = document.getElementById(`revision-incluir-${i}`).checked;
        const mes = +document.getElementById(`revision-mes-${i}`).value;
        const anioFila = document.getElementById(`revision-anio-${i}`).value;
        const anio = anioFila ? +anioFila : (anioComun ? +anioComun : null);
        return { nombreHoja: h.nombreHoja, anio, mes, incluir };
    });

    if (seleccionHojas.some(s => s.incluir && !s.anio)) {
        showToast('Falta indicar el año para alguna hoja incluida', 'error');
        return;
    }
    if (!seleccionHojas.some(s => s.incluir)) {
        showToast('Elegí al menos una hoja para importar', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('archivo', archivoPendienteImportacion);
    formData.append('seleccion', JSON.stringify({ hojas: seleccionHojas, mapeoOpcional: mapeoHistoricoResuelto }));

    try {
        const resultado = await api.confirmarHistorico(formData);
        cerrarModalRevisionHojas();
        if (resultado.requiereResolucion) {
            abrirModalConflictosHistorico(resultado.preview);
        } else {
            await cargarPeriodo();
            showToast(`Se importaron ${resultado.resultado.importadas} transacciones`);
        }
    } catch (err) {
        if (err.filasConError && err.filasConError.length > 0) {
            cerrarModalRevisionHojas();
            mostrarErroresImportacion(err.message, err.filasConError);
        } else {
            showToast(err.message, 'error');
        }
    }
}
