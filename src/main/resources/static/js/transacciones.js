let periodoActual = null;
let presupuestoMes = null;
let filtroActivo = 'todos';
let filtroCategoria = '';
let modoSeleccion = false;
let idsSeleccionados = new Set();
let idsVisibles = []; // ids de las transacciones renderizadas en la última renderTabla(), para "seleccionar todas"
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
let categoriasPorTipo = { INGRESO: [], GASTO: [], INVERSION: [] };
let iconoPorCategoria = {}; // "GASTO:Alimentación" -> icono, para el ícono de cada fila

// Íconos disponibles para elegir al crear/editar una categoría
const CATEGORIA_ICONOS_DISPONIBLES = [
    'payments', 'laptop_mac', 'trending_up', 'home', 'redeem', 'add_circle', 'shopping_cart',
    'directions_car', 'medical_services', 'school', 'checkroom', 'movie', 'lightbulb', 'restaurant',
    'computer', 'flight', 'sports_soccer', 'shield', 'remove_circle', 'pets', 'child_care',
    'fitness_center', 'local_gas_station', 'credit_card', 'savings', 'category', 'celebration',
    'favorite', 'local_cafe', 'spa',
];

const FRECUENCIAS = [
    { valor: 'SEMANAL', texto: 'Semanal' },
    { valor: 'QUINCENAL', texto: 'Quincenal' },
    { valor: 'MENSUAL', texto: 'Mensual' },
    { valor: 'ANUAL', texto: 'Anual' },
    { valor: 'PERSONALIZADA', texto: 'Cada N días' },
];

// Texto del banner "Esta transacción se repite ___" al editar una transacción recurrente.
function labelFrecuencia(frecuencia, intervaloDias) {
    switch (frecuencia) {
        case 'SEMANAL': return 'cada semana';
        case 'QUINCENAL': return 'cada 15 días';
        case 'ANUAL': return 'todos los años';
        case 'PERSONALIZADA': return intervaloDias ? `cada ${intervaloDias} días` : 'periódicamente';
        default: return 'todos los meses';
    }
}

async function cargarCategorias() {
    const lista = await api.listarCategorias();
    categoriasPorTipo = { INGRESO: [], GASTO: [], INVERSION: [] };
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
    document.querySelectorAll('.conflict-bulk-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const conflictos = conflictosEnModoHistorico ? importPreviewHistorico.conflictos : importPreview.conflictos;
            const resoluciones = conflictosEnModoHistorico ? resolucionesConflictoHistorico : resolucionesConflicto;
            conflictos.forEach((_, i) => resoluciones.set(i, btn.dataset.accion));
            if (conflictosEnModoHistorico) renderConflictosHistorico(); else renderConflictos();
        });
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
    document.getElementById('revision-incluir-todas').addEventListener('change', (e) => {
        document.querySelectorAll('.revision-incluir').forEach(cb => { cb.checked = e.target.checked; });
    });
    // Rellena en vivo solo las filas que no fueron editadas a mano (ni traían año detectado) —
    // se guía por el flag "editado" y no por si el campo está vacío, así corrige sin problema
    // mientras el usuario todavía está tipeando el año dígito por dígito (ej. "2025").
    document.getElementById('revision-anio-comun').addEventListener('input', (e) => {
        const anio = e.target.value;
        if (!anio) return;
        document.querySelectorAll('.revision-anio-input').forEach(input => {
            if (!input.dataset.editado) input.value = anio;
        });
    });

    // Toggle tipo (solo los botones del modal de transacción — el de categorías se maneja aparte)
    document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('t-tipo').value = btn.dataset.value;
            actualizarCamposPorTipo(btn.dataset.value);
        });
    });

    // Día actual por defecto
    document.getElementById('t-dia').value = new Date().getDate();

    crearCustomSelect('t-frecuencia', FRECUENCIAS, null);
    document.getElementById('t-repetir').addEventListener('change', (e) => {
        document.getElementById('t-frecuencia-grupo').classList.toggle('hidden', !e.target.checked);
    });
    document.getElementById('t-frecuencia').addEventListener('change', () => {
        const esPersonalizada = document.getElementById('t-frecuencia').value === 'PERSONALIZADA';
        document.getElementById('t-frecuencia-dias-grupo').classList.toggle('hidden', !esPersonalizada);
    });

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

    document.getElementById('btn-modo-seleccion').addEventListener('click', toggleModoSeleccion);
    document.getElementById('btn-cancelar-seleccion').addEventListener('click', cancelarModoSeleccion);
    document.getElementById('btn-eliminar-seleccionadas').addEventListener('click', eliminarSeleccionadas);
    document.getElementById('btn-seleccionar-todas').addEventListener('click', toggleSeleccionarTodas);

    document.getElementById('btn-cerrar-categorias').addEventListener('click', cerrarModalCategorias);
    document.getElementById('modal-categorias').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-categorias')) cerrarModalCategorias();
    });
    document.getElementById('categorias-modo-ingreso').addEventListener('click', () => cambiarTipoModalCategorias('INGRESO'));
    document.getElementById('categorias-modo-gasto').addEventListener('click', () => cambiarTipoModalCategorias('GASTO'));
    document.getElementById('categorias-modo-inversion').addEventListener('click', () => cambiarTipoModalCategorias('INVERSION'));
    document.getElementById('form-categoria').addEventListener('submit', onGuardarCategoria);

    await cargarCategorias();
    actualizarCategorias('INGRESO');
    actualizarFiltroCategoria();
    actualizarMesLabel();
    await cargarPeriodo();
    programarActualizacionMedianoche();
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

// Una Meta no tiene categoría, descripción libre ni día del mes propios (el abono siempre es "hoy",
// con descripción autogenerada en el backend) ni soporta "Repetir" desde acá — la automatización
// de una meta se maneja desde su propia tarjeta en la página de Metas. En cambio, Inversión se
// comporta igual que Gasto en todo (categorías propias + recurrencia normal).
async function actualizarCamposPorTipo(tipo) {
    const esMeta = tipo === 'META';
    document.getElementById('t-categoria-grupo').classList.toggle('hidden', esMeta);
    document.getElementById('t-meta-grupo').classList.toggle('hidden', !esMeta);
    document.getElementById('t-descripcion-grupo').classList.toggle('hidden', esMeta);
    document.getElementById('t-descripcion').required = !esMeta;
    document.getElementById('t-dia-grupo').classList.toggle('hidden', esMeta);
    document.getElementById('t-repetir-grupo').classList.toggle('hidden', esMeta);
    if (esMeta) {
        document.getElementById('t-repetir').checked = false;
        document.getElementById('t-frecuencia-grupo').classList.add('hidden');
        await cargarMetasParaSelector();
    } else {
        actualizarCategorias(tipo);
    }
    document.getElementById('tx-submit-btn-label').textContent = esMeta ? 'Abonar a la Meta' : 'Registrar Transacción';
}

async function cargarMetasParaSelector() {
    const prev = document.getElementById('t-meta').value;
    const activas = (await api.listarMetas()).filter(m => m.estado === 'ACTIVA');
    crearCustomSelect('t-meta', activas.map(m => ({ valor: String(m.id), texto: m.nombre })), '— Seleccionar —');
    if (activas.some(m => String(m.id) === prev)) document.getElementById('t-meta').value = prev;
}

// Opciones del filtro por categoría de la lista de transacciones: se limitan al
// tipo elegido en las tabs (Ingresos/Gastos), o a la unión de ambas con "Todos".
function actualizarFiltroCategoria() {
    const prev = document.getElementById('filtro-categoria').value;
    const categorias = filtroActivo === 'todos'
        ? [...new Set([...categoriasPorTipo.INGRESO, ...categoriasPorTipo.GASTO, ...categoriasPorTipo.INVERSION].map(c => c.nombre))]
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
        actualizarCamposPorTipo(document.getElementById('t-tipo').value);
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
    document.getElementById('categorias-modo-inversion').classList.toggle('active', tipo === 'INVERSION');
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
        const etiqueta = { INGRESO: 'ingreso', GASTO: 'gasto', INVERSION: 'inversión' }[tipo] || tipo.toLowerCase();
        cont.innerHTML = `<p class="mapeo-hint">Todavía no hay categorías de ${etiqueta}.</p>`;
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
    let mensaje = '';
    try {
        const uso = await api.contarUsoCategoria(id);
        if (uso > 0) {
            mensaje = `Esta categoría tiene ${uso} transacción(es) cargada(s). Van a mantener este nombre, pero la categoría ya no va a poder elegirse para transacciones nuevas.`;
        }
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }
    if (!(await confirmDialog({ title: '¿Eliminar esta categoría?', message: mensaje }))) return;
    try {
        await api.eliminarCategoria(id);
        await cargarCategorias();
        renderListaCategorias(categoriaModalTipo);
        showToast('Categoría eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function abrirModalTransaccion(id) {
    if (periodoActual?.cerrado) return;

    document.getElementById('form-transaccion').reset();
    document.getElementById('t-id').value = '';
    document.getElementById('modal-transaccion-title').textContent = 'Nueva Transacción';
    document.getElementById('tx-submit-btn-label').textContent = 'Registrar Transacción';
    document.getElementById('t-dia').value = new Date().getDate();
    document.getElementById('t-repetir-grupo').classList.remove('hidden');
    document.getElementById('t-fija-info').classList.add('hidden');
    document.getElementById('t-repetir').checked = false;
    document.getElementById('t-frecuencia-grupo').classList.add('hidden');
    document.getElementById('t-frecuencia-dias-grupo').classList.add('hidden');
    document.getElementById('t-frecuencia').value = 'MENSUAL';
    document.getElementById('t-frecuencia-dias').value = '';

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

        if (t.transaccionFijaId) {
            // Ya es recurrente: acá no se cambia la frecuencia, solo se puede cancelarla.
            document.getElementById('t-repetir-grupo').classList.add('hidden');
            document.getElementById('t-fija-info').classList.remove('hidden');
            document.getElementById('t-fija-info-texto').textContent =
                `Esta transacción se repite ${labelFrecuencia(t.frecuencia, t.intervaloDias)}.`;
            document.getElementById('btn-cancelar-recurrencia').onclick = () => cancelarRecurrencia(t.id);
        }
        // Si todavía no es recurrente, el checkbox "Repetir esta transacción" queda visible
        // (ya lo dejó así el reset de arriba) para poder convertirla en recurrente desde acá.
    }

    document.querySelectorAll('#modal-transaccion .tipo-btn').forEach(b => b.classList.toggle('active', b.dataset.value === tipo));
    document.getElementById('t-tipo').value = tipo;
    await actualizarCamposPorTipo(tipo);
    if (t) document.getElementById('t-categoria').value = t.categoria;

    document.getElementById('modal-transaccion').classList.remove('hidden');
    document.getElementById('t-descripcion').focus();
}

async function cancelarRecurrencia(transaccionId) {
    if (!(await confirmDialog({
        title: '¿Dejar de repetir esta transacción?',
        message: 'Los meses posteriores a este que ya se hayan generado se van a eliminar; los anteriores (incluido este) quedan intactos.',
        confirmText: 'Dejar de repetir',
    }))) return;
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

// Si la pestaña queda abierta de un día para el otro, una transacción "pendiente" (fecha futura)
// tiene que pasar a verse normal y entrar en Disponible sin que el usuario recargue la página —
// se reprograma a sí mismo cada vez que dispara, así sigue funcionando noche tras noche.
function programarActualizacionMedianoche() {
    const ahora = new Date();
    const proximaMedianoche = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 5);
    const msHastaMedianoche = proximaMedianoche - ahora;
    setTimeout(() => {
        renderPeriodo();
        programarActualizacionMedianoche();
    }, msHastaMedianoche);
}

function actualizarMesLabel() {
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    document.getElementById('fecha-mes-label').textContent = `${MESES[mes - 1]} ${anio} —`;
}

async function cargarPeriodo() {
    actualizarMesLabel();
    cancelarModoSeleccion();
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

    const btnSeleccion = document.getElementById('btn-modo-seleccion');
    btnSeleccion.classList.toggle('hidden', cerrado);
    if (cerrado) cancelarModoSeleccion();

    // La asignación de tipo GASTO es siempre la base del disponible
    const gastoPresupuestado = presupuestoMes?.asignaciones
        ?.filter(a => a.tipo === 'GASTO')
        .reduce((sum, a) => sum + Number(a.monto), 0) ?? 0;

    // Ingresos, Gastos, Metas y Disponible reflejan solo la plata que YA pasó por el bolsillo
    // hasta hoy — una transacción con fecha futura (recurrente o cargada a mano) no cuenta en
    // ninguno de los cuatro todavía, aunque ya esté generada/cargada en el período.
    const { ingresos: ingresosHastaHoy, gastos: gastosHastaHoy, metas: metasHastaHoy, inversion: inversionHastaHoy } = totalesHastaHoy(periodoActual.transacciones);

    // Disponible = gasto presupuestado + ingresos hasta hoy - gastos hasta hoy - metas hasta hoy - inversión hasta hoy
    const disponible = gastoPresupuestado + ingresosHastaHoy - gastosHastaHoy - metasHastaHoy - inversionHastaHoy;

    const tienePresupuesto = presupuestoMes !== null;

    const bar = document.getElementById('summary-bar');
    bar.innerHTML = `
        <div class="summary-item">
            <div class="s-label">Ingresos</div>
            <div class="s-value text-success">${fmt(ingresosHastaHoy)}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Gastos</div>
            <div class="s-value text-danger">${fmt(gastosHastaHoy)}</div>
        </div>
        <div class="summary-item summary-item-meta">
            <div class="s-label">Metas</div>
            <div class="s-value">${fmt(metasHastaHoy)}</div>
        </div>
        <div class="summary-item summary-item-inversion">
            <div class="s-label">Inversión</div>
            <div class="s-value">${fmt(inversionHastaHoy)}</div>
        </div>
        <div class="summary-item summary-item-dark">
            <div class="s-label">Disponible${tienePresupuesto ? ` <small class="disponible-base-info" style="color:rgba(255,255,255,.5);font-weight:400" title="Es el monto que asignaste a Gasto en tu Presupuesto de este mes. Se cuenta como base porque ya está reservado para gastar, aunque todavía no lo hayas usado."><span class="material-symbols-outlined" style="font-size:12px;vertical-align:-1px">info</span> base ${fmt(gastoPresupuestado)}</small>` : ''}</div>
            <div class="s-value" style="color:${disponible >= 0 ? '#fff' : 'var(--danger)'}">
                ${fmt(disponible)}
            </div>
        </div>
        ${cerrado ? '<div class="summary-item"><div class="s-label" style="color:var(--warning)"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">lock</span> Periodo CERRADO</div></div>' : ''}
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
    const hoyStr = todayStr();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
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
    idsVisibles = lista.map(t => t.id);

    const hayFiltro = filtroActivo !== 'todos' || filtroCategoria;
    if (lista.length === 0) {
        cont.innerHTML = emptyState({
            icon: '<span class="material-symbols-outlined">receipt_long</span>',
            title: hayFiltro ? 'Nada para mostrar con este filtro' : 'Todavía no hay movimientos',
            text: hayFiltro
                ? 'Probá con otro filtro o agregá una transacción nueva.'
                : 'Cargá tu primer ingreso o gasto con el botón "+".',
        });
        return;
    }

    const hoy = todayStr();
    const grupos = agruparPorFecha(lista);
    cont.innerHTML = grupos.map(([fecha, items]) => `
        <div class="tx-group">
            <div class="tx-group-label">${labelFecha(fecha)}</div>
            ${items.map(t => {
                const seleccionada = idsSeleccionados.has(t.id);
                const pendiente = t.fecha > hoy;
                const esMeta = t.tipo === 'META';
                const esInversion = t.tipo === 'INVERSION';
                const claseTipo = t.tipo === 'INGRESO' ? 'success' : esMeta ? 'meta' : esInversion ? 'inversion' : 'danger';
                const iconoFallback = t.tipo === 'INGRESO' ? 'arrow_upward' : esMeta ? 'track_changes' : esInversion ? 'pie_chart' : 'arrow_downward';
                return `
                <div class="tx-row ${modoSeleccion ? 'tx-row-selectable' : ''} ${seleccionada ? 'tx-row-selected' : ''} ${pendiente ? 'tx-row-pendiente' : ''}"
                     ${modoSeleccion ? `onclick="toggleSeleccionTx(${t.id})"` : ''}>
                    ${modoSeleccion ? `
                        <span class="tx-checkbox-circle">
                            <span class="material-symbols-outlined">${seleccionada ? 'check_circle' : 'radio_button_unchecked'}</span>
                        </span>` : ''}
                    <span class="tx-icon ${claseTipo}">
                        <span class="material-symbols-outlined">${iconoDeCategoria(t.tipo, t.categoria) || iconoFallback}</span>
                    </span>
                    <div class="tx-row-info">
                        <div class="tx-row-desc">${t.descripcion}${t.transaccionFijaId ? ` <span class="material-symbols-outlined tx-fija-badge" title="Se repite ${labelFrecuencia(t.frecuencia, t.intervaloDias)}">sync</span>` : ''}${pendiente ? ' <span class="material-symbols-outlined tx-row-pendiente-badge" title="Todavía no llegó esta fecha">schedule</span>' : ''}</div>
                        <div class="tx-row-cat">${t.categoria}</div>
                    </div>
                    <div class="tx-row-right">
                        <div class="tx-row-monto ${t.tipo === 'INGRESO' ? 'income' : esMeta ? 'meta' : esInversion ? 'inversion' : 'expense'}">${t.tipo === 'INGRESO' ? '+' : '-'} ${fmt(t.monto)}</div>
                        ${periodoActual.cerrado || modoSeleccion ? '' : `
                            ${esMeta ? '' : `<button class="btn-icon" onclick="editarTransaccion(${t.id})"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>`}
                            <button class="btn-icon" onclick="eliminarTransaccion(${t.id})"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>`}
                    </div>
                </div>`;
            }).join('')}
        </div>`).join('');
}

// ── Selección múltiple para borrado en lote ─────────────────────────────────

function toggleModoSeleccion() {
    modoSeleccion = !modoSeleccion;
    idsSeleccionados.clear();
    document.getElementById('btn-modo-seleccion').classList.toggle('active', modoSeleccion);
    document.getElementById('tx-seleccion-bar').classList.toggle('hidden', !modoSeleccion);
    renderTabla();
    actualizarBarraSeleccion();
}

function cancelarModoSeleccion() {
    if (!modoSeleccion) return;
    modoSeleccion = false;
    idsSeleccionados.clear();
    document.getElementById('btn-modo-seleccion')?.classList.remove('active');
    document.getElementById('tx-seleccion-bar')?.classList.add('hidden');
    renderTabla();
}

function toggleSeleccionTx(id) {
    if (idsSeleccionados.has(id)) idsSeleccionados.delete(id); else idsSeleccionados.add(id);
    renderTabla();
    actualizarBarraSeleccion();
}

// Seleccionar/deseleccionar de un saque todas las transacciones actualmente visibles (respeta
// el filtro de Ingresos/Gastos/categoría aplicado) — si ya están todas tildadas, el mismo botón
// las destilda a todas en vez de forzar siempre a "seleccionar".
function toggleSeleccionarTodas() {
    const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every(id => idsSeleccionados.has(id));
    if (todasSeleccionadas) {
        idsVisibles.forEach(id => idsSeleccionados.delete(id));
    } else {
        idsVisibles.forEach(id => idsSeleccionados.add(id));
    }
    renderTabla();
    actualizarBarraSeleccion();
}

function actualizarBarraSeleccion() {
    const n = idsSeleccionados.size;
    document.getElementById('tx-seleccion-count').textContent = n === 1 ? '1 seleccionada' : `${n} seleccionadas`;
    document.getElementById('btn-eliminar-seleccionadas').disabled = n === 0;

    const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every(id => idsSeleccionados.has(id));
    const btnTodas = document.getElementById('btn-seleccionar-todas');
    btnTodas.querySelector('.material-symbols-outlined').textContent = todasSeleccionadas ? 'check_circle' : 'remove_circle_outline';
    btnTodas.classList.toggle('checked', todasSeleccionadas);
    btnTodas.title = todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas';
}

async function eliminarSeleccionadas() {
    const ids = [...idsSeleccionados];
    if (ids.length === 0) return;
    if (!(await confirmDialog({
        title: ids.length === 1 ? '¿Eliminar la transacción seleccionada?' : `¿Eliminar las ${ids.length} transacciones seleccionadas?`,
    }))) return;

    const resultados = await Promise.allSettled(ids.map(id => api.eliminarTransaccion(id)));
    const exitosas = resultados.filter(r => r.status === 'fulfilled').length;
    const fallidas = resultados.length - exitosas;

    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;
    periodoActual = await api.getPeriodo(anio, mes);
    cancelarModoSeleccion();
    renderPeriodo();

    if (fallidas > 0) {
        showToast(`Se eliminaron ${exitosas} de ${resultados.length} transacciones. ${fallidas} no se pudieron borrar.`, 'error');
    } else {
        showToast(exitosas === 1 ? 'Transacción eliminada' : `${exitosas} transacciones eliminadas`);
    }
}

async function onAgregarTransaccion(e) {
    e.preventDefault();
    const anio = +document.getElementById('periodo-anio').value;
    const mes = +document.getElementById('periodo-mes').value;

    if (document.getElementById('t-tipo').value === 'META') {
        const metaId = document.getElementById('t-meta').value;
        const monto = +document.getElementById('t-monto').value;
        if (!metaId) { showToast('Seleccioná a qué meta abonar', 'error'); return; }
        try {
            await api.abonarMeta(+metaId, monto);
            periodoActual = await api.getPeriodo(anio, mes);
            renderPeriodo();
            document.getElementById('t-monto').value = '';
            cerrarModalTransaccion();
            showToast('Abono registrado');
        } catch (err) {
            showToast(err.message, 'error');
        }
        return;
    }

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
    // El checkbox solo está visible para crear una transacción nueva o para editar una que
    // todavía no es recurrente (ver abrirModalTransaccion) — en ambos casos vale leerlo igual.
    dto.repetirTodosLosMeses = document.getElementById('t-repetir').checked;
    if (dto.repetirTodosLosMeses) {
        dto.frecuencia = document.getElementById('t-frecuencia').value;
        if (dto.frecuencia === 'PERSONALIZADA') {
            const intervalo = +document.getElementById('t-frecuencia-dias').value;
            if (!intervalo || intervalo < 1) {
                showToast('Indicá cada cuántos días se repite', 'error');
                return;
            }
            dto.intervaloDias = intervalo;
        }
    }
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
    if (!(await confirmDialog({ title: '¿Eliminar esta transacción?' }))) return;
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
    if (!(await confirmDialog({
        title: `¿Cerrar el periodo ${MESES[mes-1]} ${anio}?`,
        message: 'Esta acción no se puede deshacer.',
        confirmText: 'Cerrar periodo',
        danger: false,
    }))) return;
    try {
        periodoActual = await api.cerrarPeriodo(anio, mes);
        renderPeriodo();
        showToast('Periodo cerrado correctamente');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// A diferencia del resto de los endpoints, esto devuelve un archivo binario en vez de JSON —
// por eso no usa api.request/requestMultipart y maneja la respuesta a mano (fetch + blob),
// en vez de un simple window.location.href, para poder mostrar un toast si el usuario todavía
// no tiene ninguna transacción cargada (el backend devuelve un error en ese caso).
async function descargarPlantilla() {
    const btn = document.getElementById('btn-descargar-plantilla');
    setBotonCargando(btn, true, 'Generando…');
    try {
        const res = await api.exportarHistorico();
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/login';
            return;
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'No se pudo generar el archivo.' }));
            showToast(err.error, 'error');
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transacciones-historial.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        showToast('No se pudo generar el archivo.', 'error');
    } finally {
        setBotonCargando(btn, false);
    }
}

// Deshabilita el botón y le muestra un spinner mientras dura una operación async — sin esto,
// una importación de varias hojas puede tardar unos segundos y el usuario, al no ver nada,
// tiende a apretar el botón varias veces (disparando la importación más de una vez).
function setBotonCargando(boton, cargando, textoCargando = 'Importando…') {
    if (!boton) return;
    if (cargando) {
        if (boton.dataset.textoOriginal === undefined) boton.dataset.textoOriginal = boton.innerHTML;
        boton.disabled = true;
        boton.classList.add('is-loading');
        boton.innerHTML = `<span class="btn-spinner"></span> ${textoCargando}`;
    } else {
        boton.disabled = false;
        boton.classList.remove('is-loading');
        if (boton.dataset.textoOriginal !== undefined) {
            boton.innerHTML = boton.dataset.textoOriginal;
            delete boton.dataset.textoOriginal;
        }
    }
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

    const btnImportar = document.getElementById('btn-importar-excel');
    setBotonCargando(btnImportar, true, 'Analizando archivo…');

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
        setBotonCargando(btnImportar, false);
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
        } finally {
            setBotonCargando(btnImportar, false);
        }
        return;
    }

    setBotonCargando(btnImportar, false);
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
    const btnConfirmar = document.getElementById('btn-confirmar-import');
    setBotonCargando(btnConfirmar, true, 'Importando…');
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
    } finally {
        setBotonCargando(btnConfirmar, false);
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
    const btnConfirmar = document.getElementById('btn-confirmar-import');
    setBotonCargando(btnConfirmar, true, 'Importando…');
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
    } finally {
        setBotonCargando(btnConfirmar, false);
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

    const btnMapeo = e.target.querySelector('button[type="submit"]');
    setBotonCargando(btnMapeo, true, 'Importando…');
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
    } finally {
        setBotonCargando(btnMapeo, false);
    }
}

// ── Revisión de hojas al importar historial completo (varios períodos) ─────
// Reusa fillMesCustomSelect (utils.js) para el desplegable de mes de cada fila.

function abrirModalRevisionHojas() {
    // Se muestran TODAS las hojas detectadas, no solo las que el heurístico reconoce — así una
    // hoja con columnas que no adivinamos sigue siendo elegible, en vez de quedar invisible.
    const hojas = deteccionHistoricoActual.hojas;
    renderFilasRevisionHojas(hojas);
    document.getElementById('revision-incluir-todas').checked = hojas.every(h => h.incluir);
    document.getElementById('revision-anio-comun-grupo').classList.toggle('hidden', !deteccionHistoricoActual.requiereAnioComun);
    document.getElementById('revision-anio-comun').value = '';
    document.getElementById('modal-revision-hojas').classList.remove('hidden');
}

function renderFilasRevisionHojas(hojas) {
    const cont = document.getElementById('revision-hojas-list');
    cont.innerHTML = hojas.map((h, i) => `
        <div class="revision-hoja-row">
            <label><input type="checkbox" class="revision-incluir np-checkbox" id="revision-incluir-${i}" ${h.incluir ? 'checked' : ''}> ${h.nombreHoja}</label>
            <div class="revision-hoja-periodo">
                <div class="np-flat tx-field revision-mes-field">
                    <div id="revision-mes-${i}" class="custom-select"></div>
                </div>
                <div class="np-flat tx-field revision-anio-field">
                    <input type="number" id="revision-anio-${i}" class="revision-anio-input" min="2000" max="2100" placeholder="Año" value="${h.anioInferido ?? ''}" ${h.anioInferido ? 'data-editado="true"' : ''}>
                </div>
            </div>
        </div>`).join('');
    hojas.forEach((h, i) => fillMesCustomSelect(`revision-mes-${i}`, h.mesInferido || 1));
    // Marca la fila como "editada" solo ante tipeo real del usuario (setear .value por código,
    // como hace el autocompletado del año común, no dispara 'input') — así el año común puede
    // seguir actualizando una fila mientras el usuario todavía la está completando de a un
    // dígito por vez, pero deja de tocarla en cuanto la persona la edita a mano.
    cont.querySelectorAll('.revision-anio-input').forEach(input => {
        input.addEventListener('input', () => { input.dataset.editado = 'true'; });
    });
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

    const btnConfirmar = document.getElementById('btn-confirmar-revision-hojas');
    setBotonCargando(btnConfirmar, true, 'Importando…');
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
    } finally {
        setBotonCargando(btnConfirmar, false);
    }
}
