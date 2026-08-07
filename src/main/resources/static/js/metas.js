let metas = [];
let ritmoMetas = null;

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
        [metas, ritmoMetas] = await Promise.all([api.listarMetas(), api.obtenerRitmoMetas()]);
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

    const totalAcumulado = metas.reduce((s, m) => s + Number(m.montoAcumulado), 0);
    const totalObjetivo = metas.reduce((s, m) => s + Number(m.montoObjetivo), 0);
    const pctGlobal = totalObjetivo > 0 ? Math.round((totalAcumulado / totalObjetivo) * 100) : 0;
    const ring = buildDonut([{ value: pctGlobal, color: 'var(--primary)' }, { value: 100 - pctGlobal, color: 'transparent' }], { size: 64, stroke: 6 });

    const hero = `
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
                    <div style="font-weight:600">${metas.length} meta${metas.length === 1 ? '' : 's'}</div>
                    <div style="font-size:12px;color:var(--text-muted)">Progreso acumulado</div>
                </div>
            </div>
        </div>`;

    const tieneDatosRitmo = ritmoMetas && ritmoMetas.metasActivasConDatos > 0;
    const pctATiempo = tieneDatosRitmo ? Math.round((ritmoMetas.metasATiempo / ritmoMetas.metasActivasConDatos) * 100) : 0;
    const donutProyeccion = tieneDatosRitmo
        ? buildDonut([{ value: pctATiempo, color: 'var(--success)' }, { value: 100 - pctATiempo, color: 'var(--danger)' }], { size: 60, stroke: 8 })
        : '';

    const insights = `
        <div class="metas-insights">
            <div class="metas-insight-card metas-insight-primary">
                <div class="metas-insight-header">
                    <div class="metas-insight-icon"><span class="material-symbols-outlined">savings</span></div>
                    <div class="metas-insight-title">Optimización de Ahorro</div>
                </div>
                ${renderDisponibleVsNecesario(ritmoMetas)}
                <div class="metas-insight-text">${textoOptimizacionAhorro(ritmoMetas)}</div>
                ${renderBarrasRitmo(ritmoMetas)}
            </div>
            <div class="metas-insight-card metas-insight-secondary">
                <div class="metas-insight-header">
                    <div class="metas-insight-icon"><span class="material-symbols-outlined">trending_up</span></div>
                    <div class="metas-insight-title">Proyección Mensual</div>
                </div>
                <div class="metas-insight-text">${textoProyeccionMensual(ritmoMetas)}</div>
                ${tieneDatosRitmo ? `
                <div class="metas-insight-donut-row">
                    <div class="dash-donut-wrapper" style="width:60px;height:60px;margin:0">
                        ${donutProyeccion}
                        <div class="dash-donut-center"><span style="font-size:12px;font-weight:700">${pctATiempo}%</span></div>
                    </div>
                    <div class="metas-insight-donut-caption">${ritmoMetas.metasATiempo} de ${ritmoMetas.metasActivasConDatos} a tiempo</div>
                </div>` : ''}
            </div>
        </div>`;

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
                <div class="meta-fecha" style="margin-top:10px"><span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px">calendar_today</span> Vence: ${fmtDate(m.fechaFin)}</div>
                <div class="meta-montos" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">
                    ${activa ? `<button class="np-button-dark np-pill-sm" onclick="abrirModalAbono(${m.id})">Abonar</button>` : '<span></span>'}
                    <button class="np-button np-pill-sm" onclick="abrirModalDetalle(${m.id})">Detalles</button>
                </div>
            </div>
        </div>
    `; }).join('') + `
        <button type="button" class="meta-add-card" onclick="abrirModalMeta()">
            <div class="meta-add-icon"><span class="material-symbols-outlined">add</span></div>
            <h3>Nueva Meta</h3>
            <p>Planificá tu próximo gran objetivo financiero.</p>
        </button>
    ` + '</div>' + insights;
}

// Arma el mensaje de "Proyección Mensual" a partir de MetasRitmoDTO — cubre explícitamente los
// casos sin datos suficientes, en vez de mostrar un cálculo con ceros sin sentido.
function textoProyeccionMensual(r) {
    if (!r || r.metasActivasTotal === 0) return 'Creá una meta activa para ver esta proyección.';
    if (r.metasActivasConDatos === 0) return 'Todavía no hay aportes registrados en tus metas activas para poder proyectar.';
    const n = r.metasActivasConDatos;
    return `A tu ritmo actual, ${r.metasATiempo} de ${n} meta${n === 1 ? '' : 's'} activa${n === 1 ? '' : 's'} con aportes se completaría${r.metasATiempo === 1 ? '' : 'n'} a tiempo.`;
}

// Compara el disponible mensual promedio (ingresos - gastos reales de los últimos meses, ANTES
// de contar lo que ya se destina a abonar metas) contra la suma de lo que TODAS las metas
// activas necesitan por mes para llegar a tiempo — la pregunta que las barras por-meta no
// responden solas: ¿alcanza la plata real para todo junto, o cada meta "parece" alcanzable
// mirada sola pero juntas no entran en el sueldo?
function renderDisponibleVsNecesario(r) {
    if (!r || r.metasActivasConDatos === 0) return '';
    if (r.disponibleMensualPromedio == null) {
        return `<div class="metas-insight-text" style="margin-top:0">Todavía no hay suficiente historial de Ingresos y Gastos para saber si tu ritmo de ingresos alcanza para todas tus metas juntas.</div>`;
    }
    const pct = Math.round((r.disponibleMensualPromedio / r.ritmoNecesarioTotal) * 100);
    const anchoBarra = Math.min(100, Math.max(0, pct));
    const color = r.alcanzaParaTodas ? 'var(--success)' : 'var(--danger)';
    const mensaje = r.alcanzaParaTodas
        ? `Tu disponible mensual promedio (${fmt(r.disponibleMensualPromedio)}) alcanza para cubrir lo que necesitás ahorrar en total (${fmt(r.ritmoNecesarioTotal)}/mes) para llegar a tiempo a todas tus metas activas.`
        : `Necesitarías ahorrar ${fmt(r.ritmoNecesarioTotal)}/mes en total para llegar a tiempo a todas tus metas activas, pero tu disponible mensual promedio es ${fmt(r.disponibleMensualPromedio)}. No te va a alcanzar para todas al mismo tiempo — vas a tener que priorizar o estirar algún plazo.`;
    return `
    <div class="metas-ritmo-row metas-ritmo-total">
        <div class="metas-ritmo-row-label"><span>Disponible vs. necesario total</span><span>${pct}%</span></div>
        ${progressBar(anchoBarra, color)}
        <div class="metas-insight-text" style="margin-top:0">${mensaje}</div>
    </div>`;
}

// Solo señala qué metas están por debajo del ritmo necesario — no sugiere montos a mover entre
// metas, ya que la app no modela la plata de cada una como algo separado/intercambiable.
function textoOptimizacionAhorro(r) {
    if (!r || r.metasActivasTotal === 0) return 'Creá una meta activa para ver este análisis.';
    if (r.metasActivasConDatos === 0) return 'Todavía no hay aportes registrados en tus metas activas para calcular tu ritmo de ahorro.';
    const atrasadas = r.detalle.filter(d => d.porcentajeRitmo < 100);
    if (atrasadas.length === 0) return '¡Vas bien! Ninguna de tus metas activas está por debajo del ritmo necesario para llegar a tiempo.';
    return `Están por debajo del ritmo necesario para llegar a tiempo: ${atrasadas.map(d => d.nombre).join(', ')}.`;
}

// Una barra por meta activa con datos, comparando el ritmo real contra el necesario para llegar
// a tiempo (100% = justo a tiempo). El ancho se limita a 100 para que la barra no se rompa,
// pero el número mostrado es el porcentaje real (puede superar el 100%).
function renderBarrasRitmo(r) {
    if (!r || !r.detalle || r.detalle.length === 0) return '';
    return `<div class="metas-ritmo-list">${r.detalle.map(d => {
        const anchoBarra = Math.min(100, Math.max(0, d.porcentajeRitmo));
        const color = d.porcentajeRitmo >= 100 ? 'var(--success)' : 'var(--danger)';
        return `
        <div class="metas-ritmo-row">
            <div class="metas-ritmo-row-label"><span>${d.nombre}</span><span>${d.porcentajeRitmo}%</span></div>
            ${progressBar(anchoBarra, color)}
        </div>`;
    }).join('')}</div>`;
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
