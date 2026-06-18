const pages = {
    dashboard: { init: initDashboard, loaded: false },
    transacciones: { init: initTransacciones, loaded: false },
    presupuesto: { init: initPresupuesto, loaded: false },
    metas: { init: initMetas, loaded: false },
    inversiones: { init: initInversiones, loaded: false },
};

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');

    const link = document.querySelector(`[data-page="${pageId}"]`);
    if (link) link.classList.add('active');

    const entry = pages[pageId];
    if (entry && !entry.loaded) {
        entry.init();
        entry.loaded = true;
    } else if (pageId === 'dashboard') {
        initDashboard();
    }
}

document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(a.dataset.page);
    });
});

navigateTo('dashboard');
