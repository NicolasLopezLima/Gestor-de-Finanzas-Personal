let inversiones = [];

async function initInversiones() {
    document.getElementById('btn-nueva-inversion').addEventListener('click', () => abrirModalInv());
    document.getElementById('btn-cancelar-inv').addEventListener('click', cerrarModalInv);
    document.getElementById('form-inversion').addEventListener('submit', guardarInversion);
    await cargarInversiones();
}

async function cargarInversiones() {
    try {
        inversiones = await api.listarInversiones();
        const resumen = await api.resumenCartera();
        renderCartera(resumen);
        renderTablaInversiones();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderCartera(resumen) {
    const resDiv = document.getElementById('cartera-resumen');
    resDiv.innerHTML = `
        <div class="stat-card" style="margin-bottom:16px">
            <div class="label">Total Invertido</div>
            <div class="value neutral">${fmt(resumen.totalInvertido)}</div>
        </div>
    `;

    const bars = document.getElementById('cartera-bars');
    const montos = resumen.montosPorTipo || {};
    const porcs = resumen.porcentajesReales || {};

    bars.innerHTML = Object.keys(montos).map(tipo => {
        if (montos[tipo] == 0) return '';
        const pct = porcs[tipo] ?? 0;
        const color = TIPO_COLORS[tipo] || '#64748b';
        return `
        <div class="cartera-tipo-row">
            <div class="cartera-tipo-label">
                <span style="color:${color};font-weight:600">${tipo}</span>
                <span>${fmt(montos[tipo])} <small style="color:var(--text-muted)">${pct}%</small></span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
        </div>`;
    }).join('');
}

function renderTablaInversiones() {
    const tbody = document.querySelector('#tabla-inversiones tbody');
    if (!inversiones.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin inversiones registradas</td></tr>';
        return;
    }
    tbody.innerHTML = inversiones.map(inv => `
        <tr>
            <td>${inv.nombre}</td>
            <td><span style="color:${TIPO_COLORS[inv.tipo]};font-weight:600">${inv.tipo}</span></td>
            <td style="font-weight:600">${fmt(inv.montoInvertido)}</td>
            <td>${inv.porcentajeCartera}%</td>
            <td>
                <button class="btn-icon" onclick="abrirModalInv(${inv.id})">✏️</button>
                <button class="btn-icon" onclick="eliminarInversion(${inv.id})">🗑</button>
            </td>
        </tr>`).join('');
}

function abrirModalInv(id) {
    const modal = document.getElementById('modal-inversion');
    document.getElementById('form-inversion').reset();
    document.getElementById('inv-id').value = '';
    document.getElementById('modal-inv-title').textContent = 'Nueva Inversión';

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
