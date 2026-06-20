const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0);
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('es-AR');
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function progressBar(pct, color) {
    return `
    <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%; background:${color}"></div>
    </div>`;
}

function fillAnioSelect(sel, selected) {
    const now = new Date();
    sel.innerHTML = '';
    for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
        const o = document.createElement('option');
        o.value = y;
        o.textContent = y;
        if (y === (selected ?? now.getFullYear())) o.selected = true;
        sel.appendChild(o);
    }
}

function fillMesSelect(sel, selected) {
    const now = new Date();
    sel.innerHTML = '';
    MESES.forEach((m, i) => {
        const o = document.createElement('option');
        o.value = i + 1;
        o.textContent = m;
        if ((i + 1) === (selected ?? now.getMonth() + 1)) o.selected = true;
        sel.appendChild(o);
    });
}

const TIPO_COLORS = {
    ACCIONES: '#4038c8',
    ORO: '#d4a024',
    BONOS: '#3d7a5c',
    OTRO: '#8a7a6a',
};
