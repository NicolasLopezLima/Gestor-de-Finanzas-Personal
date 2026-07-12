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

function emptyState({ icon, title, text, actionLabel, actionOnClick }) {
    return `
    <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        ${text ? `<p class="empty-state-text">${text}</p>` : ''}
        ${actionLabel ? `<button type="button" class="btn btn-primary" onclick="${actionOnClick}">${actionLabel}</button>` : ''}
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

function buildDonut(segments, { size = 180, stroke = 20 } = {}) {
    const r = (size - stroke) / 2;
    const cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total <= 0) return '';
    let offset = 0;
    const circles = segments.filter(s => s.value > 0).map(seg => {
        const frac = seg.value / total;
        const dash = frac * circumference;
        const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" stroke-linecap="round"/>`;
        offset += dash;
        return circle;
    }).join('');
    return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <g transform="rotate(-90 ${cx} ${cy})">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
            ${circles}
        </g>
    </svg>`;
}

const TIPO_COLORS = {
    ACCIONES: '#0F172A',
    ORO: '#B45309',
    BONOS: '#0D9488',
    OTRO: '#64748B',
};

const TIPO_ICONS = {
    ACCIONES: 'trending_up',
    ORO: 'paid',
    BONOS: 'description',
    OTRO: 'category',
};
