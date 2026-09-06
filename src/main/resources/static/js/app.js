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

    // Se devuelve la promesa de init (si corrió) para quien necesite esperar a que la página
    // termine de cargar sus datos antes de seguir — ej. agregarGastoDesdeMeta en metas.js, que
    // navega acá y después abre un modal que vive en esta página.
    const entry = pages[pageId];
    let initPromise;
    if (entry && !entry.loaded) {
        initPromise = entry.init();
        entry.loaded = true;
    } else if (pageId === 'dashboard') {
        initPromise = initDashboard();
    }

    // La vista 3D no se dispara por navegación — se abre al clickear alguna de las 4 tarjetas
    // del resumen en Ingresos & Gastos (ver transacciones.js). Igual la cerramos al salir de
    // esa página por si quedó abierta encima.
    if (pageId !== 'transacciones') {
        window.cerrarVista3D?.();
    }
    return initPromise;
}

document.querySelectorAll('.nav-links a, .bottom-nav a').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(a.dataset.page);
    });
});

// Los campos ".tx-field" muestran un ícono y un chevron como decoración junto al
// select/input real; como son elementos hermanos (no el control en sí), un click
// justo sobre el ícono no abre el desplegable. Delegamos ese click al control interno.
// (Los custom-select del asistente de mapeo manejan su propio click sobre todo el
// campo directamente en transacciones.js, no dependen de este listener.)
document.addEventListener('click', e => {
    if (e.target.closest('select, input')) return;
    const campo = e.target.closest('.tx-field');
    if (!campo) return;
    const control = campo.querySelector('select, input');
    if (!control) return;
    control.focus();
    if (control.tagName === 'SELECT' && typeof control.showPicker === 'function') {
        control.showPicker();
    }
});

// Cargar nombre del usuario logueado. Se expone como promesa compartida
// (currentUserPromise) para que otras vistas —como el saludo del dashboard—
// puedan usar el mismo dato sin repetir el fetch, incluso si ya se resolvió.
const currentUserPromise = fetch('/api/auth/me')
    .then(r => {
        if (r.status === 401 || r.status === 403) { window.location.href = '/login'; return null; }
        if (!r.ok) return null;
        return r.json();
    })
    .catch(() => null);

currentUserPromise.then(u => {
    if (!u) return;
    const el = document.getElementById('sidebar-username');
    if (el) el.textContent = u.nombre?.split(' ')[0] ?? u.email;
});

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
const themeBtn = document.querySelector('.theme-toggle-btn');
const themeMobileBtn = document.getElementById('btn-theme-mobile');

function syncThemeMobileIcon(isDark) {
    const icon = themeMobileBtn.querySelector('.material-symbols-outlined');
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';
}

function syncThemeSidebarBtn(isDark) {
    themeBtn.querySelector('.material-symbols-outlined').textContent = isDark ? 'light_mode' : 'dark_mode';
    themeBtn.querySelector('.nav-label').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
}

function setTheme(isDark) {
    document.body.setAttribute('data-dark-mode', isDark ? 'true' : 'false');
    themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    syncThemeMobileIcon(isDark);
    syncThemeSidebarBtn(isDark);
}

const saved = localStorage.getItem('theme');
if (saved === 'dark') setTheme(true);

themeBtn.addEventListener('click', () => {
    setTheme(themeBtn.getAttribute('aria-pressed') !== 'true');
});
themeMobileBtn.addEventListener('click', () => {
    setTheme(document.body.getAttribute('data-dark-mode') !== 'true');
});
