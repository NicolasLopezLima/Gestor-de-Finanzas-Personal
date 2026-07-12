let metas = [];

const META_ICONOS = ['savings', 'home', 'directions_car', 'school', 'flight', 'beach_access', 'celebration', 'favorite'];

async function initMetas() {
    document.getElementById('btn-cancelar-meta').addEventListener('click', cerrarModalMeta);
    document.getElementById('form-meta').addEventListener('submit', guardarMeta);
    document.getElementById('btn-cancelar-abono').addEventListener('click', cerrarModalAbono);
    document.getElementById('form-abono').addEventListener('submit', onAbonarMeta);
    document.getElementById('btn-cerrar-detalle').addEventListener('click', cerrarModalDetalle);
    document.getElementById('modal-meta-detalle').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-meta-detalle')) cerrarModalDetalle();
    });
    document.addEventListener('click', cerrarMetaMenus);
    await cargarMetas();
}

async function cargarMetas() {
    try {
        metas = await api.listarMetas();
        renderMetas();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderMetas() {
    const grid = document.getElementById('metas-grid');
    if (!metas.length) {
        grid.innerHTML = emptyState({
            icon: '🎯',
            title: 'No tenés metas creadas',
            text: 'Definí un objetivo de ahorro con monto y fecha límite, y hacé seguimiento de tu progreso.',
            actionLabel: '+ Nueva meta',
            actionOnClick: 'abrirModalMeta()',
        });
        return;
    }

    const estadoColor = { ACTIVA: '#334155', COMPLETADA: '#10b981', VENCIDA: '#e11d48' };
    const estadoHeaderClass = { ACTIVA: 'meta-head-activa', COMPLETADA: 'meta-head-completada', VENCIDA: 'meta-head-vencida' };

    const activas = metas.filter(m => m.estado === 'ACTIVA');
    const totalAcumulado = activas.reduce((s, m) => s + Number(m.montoAcumulado), 0);
    const totalObjetivo = activas.reduce((s, m) => s + Number(m.montoObjetivo), 0);
    const pctGlobal = totalObjetivo > 0 ? Math.round((totalAcumulado / totalObjetivo) * 100) : 0;
    const ring = buildDonut([{ value: pctGlobal, color: 'var(--primary)' }, { value: 100 - pctGlobal, color: 'transparent' }], { size: 64, stroke: 6 });

    const hero = activas.length > 0 ? `
        <div class="metas-hero">
            <div>
                <div class="dash-period-label">Patrimonio reservado</div>
                <div class="metas-hero-value">${fmt(totalAcumulado)} <span>de ${fmt(totalObjetivo)}</span></div>
            </div>
            <div class="metas-hero-ring">
                <div class="dash-donut-wrapper" style="width:64px;height:64px;margin:0">
                    ${ring}
                    <div class="dash-donut-center"><span style="font-size:13px;font-weight:700">${pctGlobal}%</span></div>
                </div>
                <div>
                    <div style="font-weight:600">${activas.length} meta${activas.length === 1 ? '' : 's'} en curso</div>
                    <div style="font-size:12px;color:var(--text-muted)">Seguimiento activo</div>
                </div>
            </div>
        </div>` : '';

    // TODO: texto de ejemplo — reemplazar por cálculo real (ritmo de ahorro vs. plan, proyección de cumplimiento)
    const insights = activas.length > 0 ? `
        <div class="metas-insights">
            <div class="metas-insight-card metas-insight-primary">
                <div class="metas-insight-icon">💡</div>
                <div>
                    <div class="metas-insight-title">Optimización de Ahorro</div>
                    <div class="metas-insight-text">Próximamente: vamos a comparar tu ritmo de ahorro contra el plan de cada meta y sugerirte reasignaciones.</div>
                </div>
            </div>
            <div class="metas-insight-card metas-insight-secondary">
                <div class="metas-insight-icon">📈</div>
                <div>
                    <div class="metas-insight-title">Proyección Mensual</div>
                    <div class="metas-insight-text">Próximamente: al ritmo actual, te vamos a mostrar qué % de tus metas se completarían a tiempo.</div>
                </div>
            </div>
        </div>` : '';

    grid.innerHTML = hero + '<div class="cards-grid" style="grid-column:1/-1">' + metas.map(m => {
        const activa = m.estado === 'ACTIVA';
        const icono = m.icono || 'savings';
        return `
        <div class="meta-card">
            <div class="meta-card-head ${estadoHeaderClass[m.estado] || 'meta-head-activa'}">
                <div class="meta-card-head-top">
                    <span class="badge badge-${m.estado.toLowerCase()}">${m.estado}</span>
                    <div class="meta-kebab-wrap">
                        <button type="button" class="meta-kebab-btn" onclick="toggleMetaMenu(event, ${m.id})">
                            <span class="material-symbols-outlined">more_vert</span>
                        </button>
                        <div class="meta-kebab-menu hidden" id="meta-menu-${m.id}">
                            ${activa ? `<button type="button" onclick="cerrarMetaMenus(); abrirModalMeta(${m.id})">Editar</button>` : ''}
                            <button type="button" class="meta-kebab-danger" onclick="cerrarMetaMenus(); eliminarMeta(${m.id})">Eliminar</button>
                        </div>
                    </div>
                </div>
                <div class="meta-card-head-row">
                    <div class="meta-nombre"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;margin-right:6px">${icono}</span>${m.nombre}</div>
                    <div class="meta-card-pct">${m.porcentajeProgreso}%</div>
                </div>
            </div>
            <div class="meta-card-body">
                ${m.descripcion ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${m.descripcion}</p>` : ''}
                <div class="progress-bar-container">
                    <div class="progress-bar-label">
                        <span>${fmt(m.montoAcumulado)}</span>
                        <span>de ${fmt(m.montoObjetivo)}</span>
                    </div>
                    ${progressBar(m.porcentajeProgreso, estadoColor[m.estado] || 'var(--primary)')}
                </div>
                <div class="meta-fecha" style="margin-top:10px">📅 Vence: ${fmtDate(m.fechaFin)}</div>
                <div class="meta-montos" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">
                    ${activa ? `<button class="np-button-dark np-pill-sm" onclick="abrirModalAbono(${m.id})">Abonar</button>` : '<span></span>'}
                    <button class="np-button np-pill-sm" onclick="abrirModalDetalle(${m.id})">Detalles</button>
                </div>
            </div>
        </div>
    `; }).join('') + `
        <button type="button" class="meta-add-card" onclick="abrirModalMeta()">
            <div class="meta-add-icon">🎯</div>
            <h3>Nueva Meta</h3>
            <p>Planificá tu próximo gran objetivo financiero.</p>
        </button>
    ` + '</div>' + insights;
}

function toggleMetaMenu(e, id) {
    e.stopPropagation();
    const menu = document.getElementById(`meta-menu-${id}`);
    const yaAbierto = !menu.classList.contains('hidden');
    cerrarMetaMenus();
    if (!yaAbierto) menu.classList.remove('hidden');
}

function cerrarMetaMenus() {
    document.querySelectorAll('.meta-kebab-menu').forEach(m => m.classList.add('hidden'));
}

function renderIconPicker(seleccionado) {
    const cont = document.getElementById('meta-icon-picker');
    cont.innerHTML = META_ICONOS.map(ic => `
        <button type="button" class="meta-icon-btn ${ic === seleccionado ? 'active' : ''}" data-icon="${ic}" onclick="seleccionarIcono('${ic}')">
            <span class="material-symbols-outlined">${ic}</span>
        </button>`).join('');
}

function seleccionarIcono(icono) {
    document.getElementById('meta-icono').value = icono;
    document.querySelectorAll('.meta-icon-btn').forEach(b => b.classList.toggle('active', b.dataset.icon === icono));
    document.querySelector('#meta-form-icon-ring .material-symbols-outlined').textContent = icono;
}

function abrirModalMeta(id) {
    const modal = document.getElementById('modal-meta');
    const form = document.getElementById('form-meta');
    form.reset();
    document.getElementById('meta-id').value = '';
    document.getElementById('modal-meta-title').textContent = 'Nueva Meta';
    document.getElementById('meta-edit-progreso').classList.add('hidden');
    let icono = 'savings';

    if (id) {
        const m = metas.find(x => x.id === id);
        if (m) {
            document.getElementById('modal-meta-title').textContent = 'Editar Meta';
            document.getElementById('meta-id').value = m.id;
            document.getElementById('meta-nombre').value = m.nombre;
            document.getElementById('meta-descripcion').value = m.descripcion || '';
            document.getElementById('meta-monto').value = m.montoObjetivo;
            document.getElementById('meta-fecha').value = m.fechaFin;
            icono = m.icono || 'savings';

            document.getElementById('meta-edit-progreso').classList.remove('hidden');
            document.getElementById('meta-edit-progreso-pct').textContent = `${m.porcentajeProgreso}% completado`;
            document.getElementById('meta-edit-progreso-bar').style.width = `${Math.min(m.porcentajeProgreso, 100)}%`;
        }
    }
    document.getElementById('meta-icono').value = icono;
    renderIconPicker(icono);
    document.querySelector('#meta-form-icon-ring .material-symbols-outlined').textContent = icono;
    modal.classList.remove('hidden');
}

function cerrarModalMeta() {
    document.getElementById('modal-meta').classList.add('hidden');
}

async function abrirModalDetalle(id) {
    const m = metas.find(x => x.id === id);
    if (!m) return;

    document.getElementById('detalle-meta-nombre').textContent = m.nombre;
    document.getElementById('detalle-monto-actual').textContent = fmt(m.montoAcumulado);
    document.getElementById('detalle-monto-objetivo').textContent = fmt(m.montoObjetivo);
    document.getElementById('detalle-pct-badge').textContent = `${m.porcentajeProgreso}% completado`;
    document.getElementById('detalle-fecha').textContent = fmtDate(m.fechaFin);
    document.getElementById('detalle-bar-fill').style.width = `${Math.min(m.porcentajeProgreso, 100)}%`;

    const faltante = Math.max(Number(m.montoObjetivo) - Number(m.montoAcumulado), 0);
    document.getElementById('detalle-faltan').textContent = faltante > 0 ? `Faltan ${fmt(faltante)}` : '¡Completada!';
    document.getElementById('detalle-objetivo-label').textContent = fmt(m.montoObjetivo);

    const activa = m.estado === 'ACTIVA';
    document.getElementById('detalle-action').style.display = activa ? '' : 'none';
    document.getElementById('btn-abonar-desde-detalle').onclick = () => {
        cerrarModalDetalle();
        abrirModalAbono(m.id);
    };

    document.getElementById('detalle-promedio').textContent = '—';
    document.getElementById('detalle-tiempo-restante').textContent = '—';
    document.getElementById('detalle-ultimo-aporte').textContent = '—';
    document.getElementById('detalle-consejo-text').textContent = '';
    document.getElementById('detalle-aportes-list').innerHTML = '<p style="color:var(--text-muted);font-size:12px">Cargando...</p>';

    document.getElementById('modal-meta-detalle').classList.remove('hidden');

    let abonos = [];
    try {
        abonos = await api.listarAbonosMeta(id);
    } catch (err) {
        document.getElementById('detalle-aportes-list').innerHTML = '<p style="color:var(--text-muted);font-size:12px">No se pudo cargar el historial de aportes.</p>';
        return;
    }

    renderAportesRecientes(abonos);
    renderStatsAbonos(m, abonos, faltante);
    renderConsejoMeta(m, abonos, faltante);
}

function cerrarModalDetalle() {
    document.getElementById('modal-meta-detalle').classList.add('hidden');
}

function fmtFechaHora(iso) {
    return new Date(iso).toLocaleDateString('es-AR');
}

function renderAportesRecientes(abonos) {
    const cont = document.getElementById('detalle-aportes-list');
    if (!abonos.length) {
        cont.innerHTML = '<p style="color:var(--text-muted);font-size:12px">Todavía no registraste aportes para esta meta.</p>';
        return;
    }
    cont.innerHTML = abonos.slice(0, 8).map(a => `
        <div class="meta-detalle-aporte-item">
            <div class="meta-detalle-aporte-left">
                <span class="meta-detalle-aporte-icon"><span class="material-symbols-outlined" style="font-size:18px">account_balance</span></span>
                <div>
                    <div style="font-size:13px;font-weight:600">Abono</div>
                    <div class="meta-detalle-aporte-fecha">${fmtFechaHora(a.fecha)}</div>
                </div>
            </div>
            <span class="meta-detalle-aporte-monto">+${fmt(a.monto)}</span>
        </div>`).join('');
}

function promedioMensualAbonos(abonos) {
    if (!abonos.length) return 0;
    const meses = new Set(abonos.map(a => a.fecha.slice(0, 7)));
    const total = abonos.reduce((s, a) => s + Number(a.monto), 0);
    return total / meses.size;
}

function renderStatsAbonos(m, abonos, faltante) {
    if (!abonos.length) {
        document.getElementById('detalle-promedio').textContent = 'Sin datos';
        document.getElementById('detalle-tiempo-restante').textContent = 'Sin datos';
        document.getElementById('detalle-ultimo-aporte').textContent = 'Sin aportes';
        return;
    }

    const promedio = promedioMensualAbonos(abonos);
    document.getElementById('detalle-promedio').textContent = fmt(promedio);

    if (faltante <= 0) {
        document.getElementById('detalle-tiempo-restante').textContent = '¡Completada!';
    } else if (promedio > 0) {
        const mesesRestantes = Math.ceil(faltante / promedio);
        document.getElementById('detalle-tiempo-restante').textContent = `~${mesesRestantes} mes${mesesRestantes === 1 ? '' : 'es'}`;
    } else {
        document.getElementById('detalle-tiempo-restante').textContent = 'Sin datos';
    }

    document.getElementById('detalle-ultimo-aporte').textContent = `+${fmt(abonos[0].monto)}`;
}

function renderConsejoMeta(m, abonos, faltante) {
    const texto = document.getElementById('detalle-consejo-text');
    if (!abonos.length) {
        texto.textContent = 'Registrá tu primer aporte para que empecemos a calcular tu ritmo de ahorro y una fecha estimada de cumplimiento.';
        return;
    }

    const promedio = promedioMensualAbonos(abonos);
    if (faltante <= 0) {
        texto.textContent = '¡Alcanzaste tu meta! Podés crear una nueva para seguir ahorrando con el mismo ritmo.';
        return;
    }
    if (promedio <= 0) {
        texto.textContent = 'Todavía no hay suficientes datos para estimar tu ritmo de ahorro.';
        return;
    }

    const mesesRestantes = Math.ceil(faltante / promedio);
    const fechaEstimada = new Date();
    fechaEstimada.setMonth(fechaEstimada.getMonth() + mesesRestantes);
    const fechaLimite = new Date(m.fechaFin + 'T00:00:00');

    texto.textContent = fechaEstimada <= fechaLimite
        ? `A tu ritmo actual (${fmt(promedio)}/mes), llegarías a la meta antes de tu fecha límite. ¡Vas bien encaminado!`
        : `A tu ritmo actual (${fmt(promedio)}/mes), tardarías ~${mesesRestantes} mes${mesesRestantes === 1 ? '' : 'es'} más — después de tu fecha límite. Considerá aumentar tus aportes.`;
}

async function guardarMeta(e) {
    e.preventDefault();
    const id = document.getElementById('meta-id').value;
    const dto = {
        nombre: document.getElementById('meta-nombre').value,
        descripcion: document.getElementById('meta-descripcion').value,
        montoObjetivo: +document.getElementById('meta-monto').value,
        fechaFin: document.getElementById('meta-fecha').value,
        icono: document.getElementById('meta-icono').value,
    };
    try {
        if (id) {
            await api.actualizarMeta(+id, dto);
        } else {
            await api.crearMeta(dto);
        }
        cerrarModalMeta();
        await cargarMetas();
        showToast('Meta guardada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function eliminarMeta(id) {
    if (!confirm('¿Eliminar esta meta?')) return;
    try {
        await api.eliminarMeta(id);
        await cargarMetas();
        showToast('Meta eliminada');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function abrirModalAbono(id) {
    const m = metas.find(x => x.id === id);
    document.getElementById('abono-meta-id').value = id;
    document.getElementById('abono-monto').value = '';
    document.getElementById('modal-abono-nombre').textContent = m?.nombre || '';
    document.getElementById('modal-abono').classList.remove('hidden');
    document.getElementById('abono-monto').focus();
}

function cerrarModalAbono() {
    document.getElementById('modal-abono').classList.add('hidden');
}

async function onAbonarMeta(e) {
    e.preventDefault();
    const id = +document.getElementById('abono-meta-id').value;
    const monto = +document.getElementById('abono-monto').value;
    try {
        await api.abonarMeta(id, monto);
        cerrarModalAbono();
        await cargarMetas();
        showToast('Abono registrado');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
