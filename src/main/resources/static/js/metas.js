let metas = [];

async function initMetas() {
    document.getElementById('btn-nueva-meta').addEventListener('click', () => abrirModalMeta());
    document.getElementById('btn-cancelar-meta').addEventListener('click', cerrarModalMeta);
    document.getElementById('form-meta').addEventListener('submit', guardarMeta);
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
        grid.innerHTML = '<p style="color:var(--text-muted)">No hay metas creadas aún.</p>';
        return;
    }

    const estadoColor = { ACTIVA: '#4f46e5', COMPLETADA: '#10b981', VENCIDA: '#ef4444' };

    grid.innerHTML = metas.map(m => `
        <div class="meta-card">
            <div class="meta-header">
                <div>
                    <div class="meta-nombre">${m.nombre}</div>
                    <div class="meta-fecha">Vence: ${fmtDate(m.fechaFin)}</div>
                </div>
                <span class="badge badge-${m.estado.toLowerCase()}">${m.estado}</span>
            </div>
            ${m.descripcion ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${m.descripcion}</p>` : ''}
            <div class="progress-bar-container">
                <div class="progress-bar-label">
                    <span>${fmt(m.montoAcumulado)}</span>
                    <span>${m.porcentajeProgreso}% de ${fmt(m.montoObjetivo)}</span>
                </div>
                ${progressBar(m.porcentajeProgreso, estadoColor[m.estado] || '#4f46e5')}
            </div>
            <div class="meta-montos" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                ${m.estado === 'ACTIVA' ? `
                    <button class="btn btn-sm btn-primary" onclick="abonarMeta(${m.id})">+ Abonar</button>
                    <button class="btn btn-sm btn-secondary" onclick="abrirModalMeta(${m.id})">Editar</button>
                ` : ''}
                <button class="btn btn-sm btn-danger" onclick="eliminarMeta(${m.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function abrirModalMeta(id) {
    const modal = document.getElementById('modal-meta');
    const form = document.getElementById('form-meta');
    form.reset();
    document.getElementById('meta-id').value = '';
    document.getElementById('modal-meta-title').textContent = 'Nueva Meta';

    if (id) {
        const m = metas.find(x => x.id === id);
        if (m) {
            document.getElementById('modal-meta-title').textContent = 'Editar Meta';
            document.getElementById('meta-id').value = m.id;
            document.getElementById('meta-nombre').value = m.nombre;
            document.getElementById('meta-descripcion').value = m.descripcion || '';
            document.getElementById('meta-monto').value = m.montoObjetivo;
            document.getElementById('meta-fecha').value = m.fechaFin;
        }
    }
    modal.classList.remove('hidden');
}

function cerrarModalMeta() {
    document.getElementById('modal-meta').classList.add('hidden');
}

async function guardarMeta(e) {
    e.preventDefault();
    const id = document.getElementById('meta-id').value;
    const dto = {
        nombre: document.getElementById('meta-nombre').value,
        descripcion: document.getElementById('meta-descripcion').value,
        montoObjetivo: +document.getElementById('meta-monto').value,
        fechaFin: document.getElementById('meta-fecha').value,
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

async function abonarMeta(id) {
    const monto = prompt('¿Cuánto deseas abonar a esta meta?');
    if (!monto || isNaN(+monto) || +monto <= 0) return;
    try {
        await api.abonarMeta(id, +monto);
        await cargarMetas();
        showToast('Abono registrado');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
