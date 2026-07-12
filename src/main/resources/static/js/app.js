const pages = {
    dashboard: { init: initDashboard, loaded: false },
    transacciones: { init: initTransacciones, loaded: false },
    presupuesto: { init: initPresupuesto, loaded: false },
    metas: { init: initMetas, loaded: false },
    inversiones: { init: initInversiones, loaded: false },
};

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a, .bottom-nav a').forEach(a => a.classList.remove('active'));

    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');

    document.querySelectorAll(`[data-page="${pageId}"]`).forEach(link => link.classList.add('active'));

    const entry = pages[pageId];
    if (entry && !entry.loaded) {
        entry.init();
        entry.loaded = true;
    } else if (pageId === 'dashboard') {
        initDashboard();
    }
}

document.querySelectorAll('.nav-links a, .bottom-nav a').forEach(a => {
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

// ── Sidebar colapsable (desktop) ──────────────────────────
const collapseBtn = document.getElementById('btn-sidebar-collapse');
if (localStorage.getItem('sidebar-collapsed') === 'true') {
    document.body.classList.add('sidebar-collapsed');
}
collapseBtn.addEventListener('click', () => {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebar-collapsed', collapsed);
});

// ── Theme toggle ─────────────────────────────────────────
const themeBtn = document.querySelector('.theme-toggle');
const themeMobileBtn = document.getElementById('btn-theme-mobile');

function syncThemeMobileIcon(isDark) {
    const icon = themeMobileBtn.querySelector('.material-symbols-outlined');
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';
}

function setTheme(isDark) {
    document.body.setAttribute('data-dark-mode', isDark ? 'true' : 'false');
    themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    syncThemeMobileIcon(isDark);
}

const saved = localStorage.getItem('theme');
if (saved === 'dark') setTheme(true);

themeBtn.addEventListener('click', () => {
    setTheme(themeBtn.getAttribute('aria-pressed') !== 'true');
});
themeMobileBtn.addEventListener('click', () => {
    setTheme(document.body.getAttribute('data-dark-mode') !== 'true');
});
