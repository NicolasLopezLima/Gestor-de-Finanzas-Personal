const BASE = '/api';

async function request(method, url, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + url, opts);
    if (res.status === 401 || res.status === 403) {
        window.location.href = '/login';
        throw new Error('No autenticado');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error inesperado' }));
        throw new Error(err.error || 'Error en la petición');
    }
    if (res.status === 204) return null;
    return res.json();
}

const api = {
    // Periodos
    getPeriodoActual: () => request('GET', '/periodos/actual'),
    getPeriodo: (a, m) => request('GET', `/periodos/${a}/${m}`),
    listarPeriodos: () => request('GET', '/periodos'),
    agregarTransaccion: (a, m, dto) => request('POST', `/periodos/${a}/${m}/transacciones`, dto),
    eliminarTransaccion: (id) => request('DELETE', `/periodos/transacciones/${id}`),
    cerrarPeriodo: (a, m) => request('POST', `/periodos/${a}/${m}/cerrar`),

    // Presupuesto
    listarPresupuestos: () => request('GET', '/presupuestos'),
    getPresupuesto: (a, m) => request('GET', `/presupuestos/${a}/${m}`),
    guardarPresupuesto: (dto) => request('POST', '/presupuestos', dto),

    // Metas
    listarMetas: () => request('GET', '/metas'),
    crearMeta: (dto) => request('POST', '/metas', dto),
    actualizarMeta: (id, dto) => request('PUT', `/metas/${id}`, dto),
    eliminarMeta: (id) => request('DELETE', `/metas/${id}`),
    abonarMeta: (id, monto) => request('POST', `/metas/${id}/abonar`, { monto }),

    // Inversiones
    listarInversiones: () => request('GET', '/inversiones'),
    resumenCartera: () => request('GET', '/inversiones/resumen'),
    agregarInversion: (dto) => request('POST', '/inversiones', dto),
    actualizarInversion: (id, dto) => request('PUT', `/inversiones/${id}`, dto),
    eliminarInversion: (id) => request('DELETE', `/inversiones/${id}`),
};
