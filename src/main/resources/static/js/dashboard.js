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

    try {
        const mes = now.getMonth() + 1;
        const [periodo, metas, resumen] = await Promise.all([
            api.getPeriodo(anio, mes),
            api.listarMetas().catch(() => []),
            api.resumenCartera().catch(() => ({})),
        ]);

        const metasActivas = metas.filter(m => m.estado === 'ACTIVA');
        const metasCompletadas = metas.filter(m => m.estado === 'COMPLETADA');

        const cards = document.getElementById('dashboard-cards');
        cards.innerHTML = `
            <div class="stat-card stat-card-hero">
                <div class="label">Balance mensual</div>
                <div class="value" style="color:${periodo.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    ${fmt(periodo.balance)}
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Ingresos del mes</div>
                <div class="value income">${fmt(periodo.totalIngresos)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Gastos del mes</div>
                <div class="value expense">${fmt(periodo.totalGastos)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Total invertido</div>
                <div class="value neutral">${fmt(resumen.totalInvertido ?? 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Metas activas</div>
                <div class="value neutral">${metasActivas.length}</div>
            </div>
            <div class="stat-card">
                <div class="label">Metas completadas</div>
                <div class="value income">${metasCompletadas.length}</div>
            </div>
        `;

        if (metasActivas.length > 0) {
            const section = document.createElement('div');
            section.style.marginTop = '24px';
            section.innerHTML = `
                <h2>Progreso de Metas Activas</h2>
                <div class="cards-grid">
                    ${metasActivas.slice(0, 4).map(m => `
                        <div class="meta-card">
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
    } catch (err) {
        document.getElementById('dashboard-cards').innerHTML =
            `<p style="color:var(--danger)">Error al cargar: ${err.message}</p>`;
    }
}
