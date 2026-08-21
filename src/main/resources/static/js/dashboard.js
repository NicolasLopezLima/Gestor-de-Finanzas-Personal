const PASOS_TOUR_DASHBOARD = [
    { selector: '#dashboard-cards', titulo: 'Tu pantalla principal', texto: 'Acá ves tu balance disponible del mes y accesos rápidos a tus metas e inversiones.' },
    { selector: ['.sidebar', '.bottom-nav'], titulo: 'Así navegás', texto: 'Desde acá entrás a Ingresos & Gastos, Presupuesto, Metas e Inversiones.' },
    { selector: null, titulo: '¡Listo!', texto: 'Ya podés explorar cada sección — la primera vez que entres a cada una te mostramos un tour cortito como este.' },
];

const DASH_ICONS = {
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
        <div class="dash-header-row">
            <div class="dashboard-welcome">
                <div class="welcome-greeting">Buenos días</div>
                <div class="welcome-period">${mesNombre} ${anio}</div>
            </div>
        </div>
        <div class="cards-grid" id="dashboard-cards"><p style="color:var(--text-muted)">Cargando...</p></div>
    `;

    currentUserPromise.then(u => {
        if (!u) return;
        const greeting = pageEl.querySelector('.welcome-greeting');
        if (greeting) greeting.textContent = `Buenos días, ${u.nombre?.split(' ')[0] ?? u.email}`;
    });

    const mes = now.getMonth() + 1;
    // Mes anterior, para la comparación de "Balance disponible" — puede no existir (usuario
    // nuevo) o fallar, en cuyo caso simplemente no se muestra el badge de comparación.
    const mesPrev = mes === 1 ? 12 : mes - 1;
    const anioPrev = mes === 1 ? anio - 1 : anio;

    const [periodoRes, metasRes, resumenRes, prevRes, inversionesRes] = await Promise.allSettled([
        api.getPeriodo(anio, mes),
        api.listarMetas(),
        api.resumenCartera(),
        api.getPeriodo(anioPrev, mesPrev),
        api.listarInversiones(),
    ]);

    const periodo = periodoRes.status === 'fulfilled'
        ? periodoRes.value
        : { balance: 0, totalIngresos: 0, totalGastos: 0, transacciones: [], cerrado: false };
    const metas = metasRes.status === 'fulfilled' ? metasRes.value : [];
    const resumen = resumenRes.status === 'fulfilled' ? resumenRes.value : {};
    const periodoPrev = prevRes.status === 'fulfilled' ? prevRes.value : null;
    const inversiones = inversionesRes.status === 'fulfilled' ? inversionesRes.value : [];

    const metasActivas = metas.filter(m => m.estado === 'ACTIVA');
    const metasCompletadas = metas.filter(m => m.estado === 'COMPLETADA');

    const cards = document.getElementById('dashboard-cards');

    const sinDatos = (periodo.transacciones?.length ?? 0) === 0
        && metas.length === 0
        && !(resumen.totalInvertido > 0);

    if (sinDatos) {
        cards.innerHTML = emptyState({
            icon: '<span class="material-symbols-outlined">waving_hand</span>',
            title: '¡Bienvenido a FinanzasApp!',
            text: 'Todavía no cargaste ningún movimiento. Empezá agregando tu primer ingreso o gasto del mes.',
            actionLabel: '+ Agregar transacción',
            actionOnClick: "navigateTo('transacciones')",
        });
        iniciarTour('DASHBOARD', PASOS_TOUR_DASHBOARD);
        return;
    }

    const periodoBadge = periodo.cerrado
        ? `<span class="dash-badge dash-badge-closed">CERRADO</span>`
        : `<span class="dash-badge dash-badge-open"><span class="dash-dot"></span>ABIERTO</span>`;
    const headerBadge = pageEl.querySelector('.dash-header-row');
    if (headerBadge) headerBadge.insertAdjacentHTML('beforeend', periodoBadge);

    const invertido = resumen.totalInvertido ?? 0;

    // Igual que en Ingresos & Gastos: una transacción con fecha futura (recurrente o cargada a
    // mano) todavía no cuenta como plata real, así que el Balance disponible del Dashboard usa
    // el mismo recorte "hasta hoy" en vez de los totales del mes completo.
    const totales = totalesHastaHoy(periodo.transacciones);

    // % del ingreso del mes que quedó como balance disponible — mismo criterio que "Ahorro" en
    // el resto de la app (Presupuesto/Metas): balance / ingresos, nunca negativo ni > 100.
    const pctAhorro = totales.ingresos > 0
        ? Math.max(0, Math.min(100, Math.round((totales.balance / totales.ingresos) * 100)))
        : 0;
    const ringHero = buildDonut(
        [{ value: pctAhorro, color: 'var(--success)' }, { value: 100 - pctAhorro, color: 'rgba(255,255,255,.12)' }],
        { size: 88, stroke: 10 }
    );

    // Comparación vs. el mes anterior: solo se muestra si ese período existe y tuvo un balance
    // distinto de cero para comparar contra — nunca se inventa un % sin una base real.
    let comparacionHtml = '';
    const balancePrev = periodoPrev ? totalesHastaHoy(periodoPrev.transacciones).balance : 0;
    if (periodoPrev && balancePrev) {
        const variacion = Math.round(((totales.balance - balancePrev) / Math.abs(balancePrev)) * 100);
        const subiendo = variacion >= 0;
        comparacionHtml = `
            <span class="dash-hero-comparacion ${subiendo ? 'up' : 'down'}">
                <span class="material-symbols-outlined">${subiendo ? 'arrow_upward' : 'arrow_downward'}</span>
                ${Math.abs(variacion)}% vs. ${MESES[mesPrev - 1]}
            </span>`;
    }

    cards.className = 'dash-grid';
    cards.innerHTML = `
            <div class="dash-balance-hero">
                <div class="dash-balance-hero-top">
                    <div>
                        <div class="dash-balance-hero-label">Balance disponible</div>
                        <div class="dash-balance-hero-value">${fmt(totales.balance)}</div>
                        ${comparacionHtml}
                    </div>
                    <div class="dash-donut-wrapper" style="width:88px;height:88px;margin:0">
                        ${ringHero}
                        <div class="dash-donut-center">
                            <div class="dash-donut-center-label" style="color:rgba(255,255,255,.6)">Ahorro</div>
                            <div class="dash-donut-center-value" style="color:#fff;font-size:16px">${pctAhorro}%</div>
                        </div>
                    </div>
                </div>
                <div class="dash-balance-hero-stats">
                    <div class="dash-balance-hero-stat">
                        <span class="material-symbols-outlined">arrow_upward</span>
                        <div><div class="dash-balance-hero-stat-label">Ingresos</div><div class="dash-balance-hero-stat-value">${fmt(totales.ingresos)}</div></div>
                    </div>
                    <div class="dash-balance-hero-stat">
                        <span class="material-symbols-outlined">arrow_downward</span>
                        <div><div class="dash-balance-hero-stat-label">Gastos</div><div class="dash-balance-hero-stat-value">${fmt(totales.gastos)}</div></div>
                    </div>
                    <div class="dash-balance-hero-stat">
                        <span class="material-symbols-outlined">donut_small</span>
                        <div><div class="dash-balance-hero-stat-label">Invertido</div><div class="dash-balance-hero-stat-value">${fmt(invertido)}</div></div>
                    </div>
                </div>
            </div>
            <div class="cards-grid">
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
                <div class="stat-card">
                    <div class="stat-card-icon">${DASH_ICONS.invertido}</div>
                    <div class="label">Posiciones cartera</div>
                    <div class="value neutral">${inversiones.length}</div>
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

    iniciarTour('DASHBOARD', PASOS_TOUR_DASHBOARD);
}
