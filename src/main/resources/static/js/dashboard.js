const DASH_ICONS = {
    balance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    ingreso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>',
    gasto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>',
    invertido: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    metaActiva: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    metaOk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>',
};

async function initDashboard() {
    const pageEl = document.getElementById('page-dashboard');

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const now = new Date();
    const mesNombre = MESES[now.getMonth()];
    const anio = now.getFullYear();

    pageEl.innerHTML = `
        <div class="dashboard-welcome">
            <div class="welcome-greeting">Buenos días, Nicolas</div>
            <div class="welcome-period">${mesNombre} ${anio}</div>
        </div>
        <div class="cards-grid" id="dashboard-cards"><p style="color:var(--text-muted)">Cargando...</p></div>
    `;

    const mes = now.getMonth() + 1;
    const [periodoRes, metasRes, resumenRes] = await Promise.allSettled([
        api.getPeriodo(anio, mes),
        api.listarMetas(),
        api.resumenCartera(),
    ]);

    const periodo = periodoRes.status === 'fulfilled'
        ? periodoRes.value
        : { balance: 0, totalIngresos: 0, totalGastos: 0, transacciones: [], cerrado: false };
    const metas = metasRes.status === 'fulfilled' ? metasRes.value : [];
    const resumen = resumenRes.status === 'fulfilled' ? resumenRes.value : {};

    const metasActivas = metas.filter(m => m.estado === 'ACTIVA');
    const metasCompletadas = metas.filter(m => m.estado === 'COMPLETADA');

    const cards = document.getElementById('dashboard-cards');

    const sinDatos = (periodo.transacciones?.length ?? 0) === 0
        && metas.length === 0
        && !(resumen.totalInvertido > 0);

    if (sinDatos) {
        cards.innerHTML = emptyState({
            icon: '👋',
            title: '¡Bienvenido a FinanzasApp!',
            text: 'Todavía no cargaste ningún movimiento. Empezá agregando tu primer ingreso o gasto del mes.',
            actionLabel: '+ Agregar transacción',
            actionOnClick: "navigateTo('transacciones')",
        });
        return;
    }

    const periodoBadge = periodo.cerrado
        ? `<span class="dash-badge dash-badge-closed">CERRADO</span>`
        : `<span class="dash-badge dash-badge-open"><span class="dash-dot"></span>ABIERTO</span>`;

    const ahorro = Math.max(periodo.balance, 0);
    const invertido = resumen.totalInvertido ?? 0;
    const donutSegments = [
        { label: 'Gastos', value: periodo.totalGastos, color: '#4A6FA5' },
        { label: 'Ahorro', value: ahorro, color: '#2D5A61' },
        { label: 'Invertido', value: invertido, color: '#E5908E' },
    ];
    const donutTotal = donutSegments.reduce((s, seg) => s + seg.value, 0);
    const donutHtml = donutTotal > 0 ? buildDonut(donutSegments, { size: 180, stroke: 20 }) : '';

    cards.className = 'dash-grid';
    cards.innerHTML = `
            <div class="dash-period-card">
                <div>
                    <div class="dash-period-label">Período actual</div>
                    <div class="dash-period-value">${mesNombre} ${anio}</div>
                </div>
                ${periodoBadge}
            </div>
            <div class="dash-hero-row">
                <div class="card dash-donut-card">
                    <h2>Distribución del mes</h2>
                    ${donutTotal > 0 ? `
                    <div class="dash-donut-wrapper">
                        ${donutHtml}
                        <div class="dash-donut-center">
                            <div class="dash-donut-center-label">Balance</div>
                            <div class="dash-donut-center-value">${fmt(periodo.balance)}</div>
                        </div>
                    </div>
                    <div class="dash-legend">
                        ${donutSegments.filter(s => s.value > 0).map(s => `
                            <div class="dash-legend-item">
                                <span class="dash-legend-dot" style="background:${s.color}"></span>
                                <span class="dash-legend-name">${s.label}</span>
                                <span class="dash-legend-value">${fmt(s.value)}</span>
                            </div>`).join('')}
                    </div>` : `<p style="color:var(--text-muted);font-size:13px;margin-top:12px">Todavía no hay suficientes datos para graficar la distribución.</p>`}
                </div>
                <div class="card dash-resumen-card">
                    <h2>Resumen Mensual</h2>
                    <div class="dash-row">
                        <div class="stat-card-icon success">${DASH_ICONS.ingreso}</div>
                        <div class="dash-row-info">
                            <div class="dash-row-label">Ingresos</div>
                            <div class="dash-row-sub">Totales del mes</div>
                        </div>
                        <div class="dash-row-value income">+ ${fmt(periodo.totalIngresos)}</div>
                    </div>
                    <div class="dash-row">
                        <div class="stat-card-icon danger">${DASH_ICONS.gasto}</div>
                        <div class="dash-row-info">
                            <div class="dash-row-label">Gastos</div>
                            <div class="dash-row-sub">Totales del mes</div>
                        </div>
                        <div class="dash-row-value expense">- ${fmt(periodo.totalGastos)}</div>
                    </div>
                    <div class="dash-balance-highlight">
                        <div>
                            <div class="dash-balance-label">Balance disponible</div>
                            <div class="dash-balance-value">${fmt(periodo.balance)}</div>
                        </div>
                        <div class="dash-balance-icon">${DASH_ICONS.balance}</div>
                    </div>
                </div>
            </div>
            <div class="cards-grid">
                <div class="stat-card">
                    <div class="stat-card-icon">${DASH_ICONS.invertido}</div>
                    <div class="label">Total invertido</div>
                    <div class="value neutral">${fmt(invertido)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">${DASH_ICONS.metaActiva}</div>
                    <div class="label">Metas activas</div>
                    <div class="value neutral">${metasActivas.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon success">${DASH_ICONS.metaOk}</div>
                    <div class="label">Metas completadas</div>
                    <div class="value income">${metasCompletadas.length}</div>
                </div>
            </div>
        `;

        if (metasActivas.length > 0) {
            const section = document.createElement('div');
            section.style.marginTop = '24px';
            section.innerHTML = `
                <h2>Progreso de Metas Activas</h2>
                <div class="cards-grid">
                    ${metasActivas.slice(0, 4).map(m => `
                        <div class="dash-meta-card">
                            <div class="meta-nombre">${m.nombre}</div>
                            <div class="meta-fecha" style="margin-bottom:8px">Vence: ${fmtDate(m.fechaFin)}</div>
                            <div class="progress-bar-label" style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                                <span>${fmt(m.montoAcumulado)}</span>
                                <span>${m.porcentajeProgreso}%</span>
                            </div>
                            ${progressBar(m.porcentajeProgreso, 'var(--primary)')}
                        </div>`).join('')}
                </div>`;
            pageEl.appendChild(section);
        }
}
