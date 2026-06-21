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

// Cargar nombre del usuario logueado
fetch('/api/auth/me')
    .then(r => {
        if (r.status === 401 || r.status === 403) { window.location.href = '/login'; return null; }
        return r.json();
    })
    .then(u => {
        if (!u) return;
        const el = document.getElementById('sidebar-username');
        if (el) el.textContent = u.nombre?.split(' ')[0] ?? u.email;
    })
    .catch(() => {});

navigateTo('dashboard');

// ── Hamburger / sidebar mobile ───────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebar-overlay');
const hamburger = document.getElementById('btn-hamburger');

function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    hamburger.classList.add('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.classList.remove('open');
}

hamburger.addEventListener('click', () =>
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar()
);

overlay.addEventListener('click', closeSidebar);

// Cerrar sidebar al navegar en mobile
document.querySelectorAll('.nav-links a').forEach(a =>
    a.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
    })
);

// ── Theme toggle ─────────────────────────────────────────
const themeBtn = document.querySelector('.theme-toggle');
const saved = localStorage.getItem('theme');
if (saved === 'dark') {
    document.body.setAttribute('data-dark-mode', 'true');
    themeBtn.setAttribute('aria-pressed', 'true');
}
themeBtn.addEventListener('click', () => {
    const isDark = themeBtn.getAttribute('aria-pressed') === 'true';
    themeBtn.setAttribute('aria-pressed', isDark ? 'false' : 'true');
    document.body.setAttribute('data-dark-mode', isDark ? 'false' : 'true');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
});
