let inversiones = [];
let resumenActual = null;
let filtroInvActivo = 'TODOS';

async function initInversiones() {
    document.getElementById('btn-nueva-inversion').addEventListener('click', () => abrirModalInv());
    document.getElementById('btn-cancelar-inv').addEventListener('click', cerrarModalInv);
    document.getElementById('form-inversion').addEventListener('submit', guardarInversion);
    document.addEventListener('click', () => document.getElementById('inv-filter-menu').classList.add('hidden'));

    await cargarInversiones();
}

function toggleInvFilterMenu(e) {
    e.stopPropagation();
    document.getElementById('inv-filter-menu').classList.toggle('hidden');
}

const TIPO_LABELS = { ACCIONES: 'Acciones', BONOS: 'Bonos', ORO: 'Oro', OTRO: 'Otro' };

function seleccionarFiltroInv(tipo) {
    filtroInvActivo = tipo;
    document.getElementById('inv-filter-menu').classList.add('hidden');
    const label = tipo === 'TODOS' ? 'Filtrar' : `Filtrar: ${TIPO_LABELS[tipo]}`;
    document.getElementById('inv-filter-btn').innerHTML = `
        <span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px">filter_list</span>
        ${label}`;
    renderPosiciones();
}

async function cargarInversiones() {
    try {
        inversiones = await api.listarInversiones();
        resumenActual = await api.resumenCartera();
        renderCartera();
        renderPosiciones();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderCartera() {
    document.getElementById('inv-total-value').textContent = fmt(resumenActual.totalInvertido);

    const montos = resumenActual.montosPorTipo || {};
    const porcs = resumenActual.porcentajesReales || {};
    const segments = Object.keys(montos)
        .filter(tipo => montos[tipo] > 0)
        .map(tipo => ({ label: tipo, value: montos[tipo], color: TIPO_COLORS[tipo] || '#64748B' }));

    const bento = document.getElementById('inv-bento');
    if (!segments.length) {
        bento.style.display = 'none';
        return;
    }
    bento.style.display = '';

    const wrapper = document.getElementById('inv-donut-wrapper');
    wrapper.innerHTML = `
        ${buildDonut(segments, { size: 200, stroke: 24 })}
        <div class="dash-donut-center">
            <div class="dash-donut-center-label">Diversificación</div>
            <div class="dash-donut-center-value">${segments.length} categoría${segments.length === 1 ? '' : 's'}</div>
        </div>
    `;

    document.getElementById('inv-legend-grid').innerHTML = segments.map(s => `
        <div class="inv-legend-item">
            <span class="inv-legend-dot" style="background:${s.color}"></span>
            <div>
                <div class="inv-legend-label">${s.label}</div>
                <div class="inv-legend-pct">${porcs[s.label] ?? 0}%</div>
            </div>
        </div>`).join('');

    renderRebalanceCard();
}

function calcularDesviacion(inv, total) {
    const actual = total > 0 ? (Number(inv.montoInvertido) / total) * 100 : 0;
    const objetivo = Number(inv.porcentajeCartera);
    return { actual, objetivo, desv: actual - objetivo };
}

function renderRebalanceCard() {
    const cont = document.getElementById('inv-rebalance-card');
    const total = Number(resumenActual.totalInvertido) || 0;
    if (!inversiones.length || total <= 0) {
        cont.innerHTML = '';
        return;
    }

    let peor = null;
    inversiones.forEach(inv => {
        const d = calcularDesviacion(inv, total);
        if (!peor || Math.abs(d.desv) > Math.abs(peor.desv)) peor = { inv, ...d };
    });

    if (!peor || Math.abs(peor.desv) < 3) {
        cont.innerHTML = `
            <div class="inv-rebalance-head">
                <span class="material-symbols-outlined" style="color:var(--success)">verified</span>
                <h3>Cartera Balanceada</h3>
            </div>
            <p>Tus posiciones están dentro del margen de tolerancia respecto a tus objetivos de asignación. No hay acciones sugeridas por ahora.</p>`;
        return;
    }

    const signo = peor.desv > 0 ? '+' : '';
    const accion = peor.desv > 0 ? 'liquidar el excedente de' : 'reforzar';
    cont.innerHTML = `
        <div class="inv-rebalance-head">
            <span class="material-symbols-outlined">auto_fix_high</span>
            <h3>Rebalanceo Sugerido</h3>
            <span class="inv-rebalance-tag">${signo}${peor.desv.toFixed(1)}%</span>
        </div>
        <p>
            <strong>${peor.inv.nombre}</strong> (${peor.inv.tipo}) representa el ${peor.actual.toFixed(1)}% de tu cartera,
            contra un objetivo del ${peor.objetivo.toFixed(1)}%. Considerá ${accion} esta posición para volver a tu meta de asignación.
        </p>`;
}

function renderPosiciones() {
    const cont = document.getElementById('inv-posiciones-list');
    const total = Number(resumenActual?.totalInvertido) || 0;
    let lista = inversiones;
    if (filtroInvActivo !== 'TODOS') lista = lista.filter(i => i.tipo === filtroInvActivo);

    if (!inversiones.length) {
        cont.innerHTML = emptyState({
            icon: '📊',
            title: 'Todavía no cargaste inversiones',
            text: 'Registrá tu primera posición para hacer seguimiento de tu cartera.',
            actionLabel: '+ Nueva inversión',
            actionOnClick: 'abrirModalInv()',
        });
        return;
    }
    if (!lista.length) {
        cont.innerHTML = emptyState({
            icon: '📊',
            title: 'Nada para mostrar con este filtro',
            text: 'Probá con otro tipo de activo.',
        });
        return;
    }

    cont.innerHTML = lista.map(inv => {
        const { actual, objetivo, desv } = calcularDesviacion(inv, total);
        const enObjetivo = Math.abs(desv) < 0.5;
        const desvLabel = enObjetivo ? 'En objetivo' : `${desv > 0 ? '+' : ''}${desv.toFixed(1)}% (${desv > 0 ? 'Excedido' : 'Por debajo'})`;
        const color = TIPO_COLORS[inv.tipo] || '#64748B';
        return `
        <div class="np-flat inv-pos-card">
            <div class="inv-pos-top">
                <div class="inv-pos-left">
                    <span class="inv-pos-icon" style="background:${color}22;color:${color}">
                        <span class="material-symbols-outlined">${TIPO_ICONS[inv.tipo] || 'category'}</span>
                    </span>
                    <div>
                        <h4>${inv.nombre}</h4>
                        <p>${inv.notas ? inv.notas : inv.tipo}</p>
                    </div>
                </div>
                <div class="inv-pos-right">
                    <div class="inv-pos-monto">${fmt(inv.montoInvertido)}</div>
                    <div class="inv-pos-actions">
                        <button class="btn-icon inv-icon-btn" title="Editar" onclick="abrirModalInv(${inv.id})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn-icon inv-icon-btn" title="Eliminar" onclick="eliminarInversion(${inv.id})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="inv-pos-bar-row">
                <span>Desviación Objetivo</span>
                <span class="${enObjetivo ? '' : 'inv-desv-off'}">${desvLabel}</span>
            </div>
            <div class="inv-pos-bar-track">
                <div class="inv-pos-bar-fill" style="width:${Math.min(actual, 100)}%;background:${color}"></div>
            </div>
            <div class="inv-pos-bar-labels">
                <span>META: ${objetivo.toFixed(1)}%</span>
                <span>ACTUAL: ${actual.toFixed(1)}%</span>
            </div>
        </div>`;
    }).join('');
}

function abrirModalInv(id) {
    const modal = document.getElementById('modal-inversion');
    document.getElementById('form-inversion').reset();
    document.getElementById('inv-id').value = '';
    document.getElementById('modal-inv-title').textContent = 'Nueva Inversión';
    crearCustomSelect('inv-tipo',
        Object.entries(TIPO_LABELS).map(([valor, texto]) => ({ valor, texto })), null);

    if (id) {
        const inv = inversiones.find(x => x.id === id);
        if (inv) {
            document.getElementById('modal-inv-title').textContent = 'Editar Inversión';
            document.getElementById('inv-id').value = inv.id;
            document.getElementById('inv-nombre').value = inv.nombre;
            document.getElementById('inv-tipo').value = inv.tipo;
            document.getElementById('inv-monto').value = inv.montoInvertido;
            document.getElementById('inv-porcentaje').value = inv.porcentajeCartera;
            document.getElementById('inv-notas').value = inv.notas || '';
        }
    }
    modal.classList.remove('hidden');
}

function cerrarModalInv() {
    document.getElementById('modal-inversion').classList.add('hidden');
}

async function guardarInversion(e) {
    e.preventDefault();
    const id = document.getElementById('inv-id').value;
    const dto = {
        nombre: document.getElementById('inv-nombre').value,
        tipo: document.getElementById('inv-tipo').value,
        montoInvertido: +document.getElementById('inv-monto').value,
        porcentajeCartera: +document.getElementById('inv-porcentaje').value,
        notas: document.getElementById('inv-notas').value,
    };
    try {
        if (id) {
            await api.actualizarInversion(+id, dto);
        } else {
            await api.agregarInversion(dto);
        }
        cerrarModalInv();
        await cargarInversiones();
        showToast('Inversión guardada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function eliminarInversion(id) {
    if (!confirm('¿Eliminar esta inversión?')) return;
    try {
        await api.eliminarInversion(id);
        await cargarInversiones();
        showToast('Inversión eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
