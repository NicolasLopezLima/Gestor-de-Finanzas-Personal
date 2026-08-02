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

async function requestMultipart(method, url, formData) {
    const res = await fetch(BASE + url, { method, body: formData });
    if (res.status === 401 || res.status === 403) {
        window.location.href = '/login';
        throw new Error('No autenticado');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error inesperado' }));
        const e = new Error(err.error || 'Error en la petición');
        e.filasConError = err.filasConError;
        throw e;
    }
    return res.json();
}

const api = {
    // Periodos
    getPeriodoActual: () => request('GET', '/periodos/actual'),
    getPeriodo: (a, m) => request('GET', `/periodos/${a}/${m}`),
    listarPeriodos: () => request('GET', '/periodos'),
    agregarTransaccion: (a, m, dto) => request('POST', `/periodos/${a}/${m}/transacciones`, dto),
    editarTransaccion: (id, dto) => request('PUT', `/periodos/transacciones/${id}`, dto),
    eliminarTransaccion: (id) => request('DELETE', `/periodos/transacciones/${id}`),
    cancelarRecurrencia: (transaccionId) => request('DELETE', `/periodos/transacciones/${transaccionId}/recurrencia`),
    listarCategorias: () => request('GET', '/categorias'),
    crearCategoria: (dto) => request('POST', '/categorias', dto),
    editarCategoria: (id, dto) => request('PUT', `/categorias/${id}`, dto),
    contarUsoCategoria: (id) => request('GET', `/categorias/${id}/uso`),
    eliminarCategoria: (id) => request('DELETE', `/categorias/${id}`),
    cerrarPeriodo: (a, m) => request('POST', `/periodos/${a}/${m}/cerrar`),
    importarTransacciones: (a, m, formData) => requestMultipart('POST', `/periodos/${a}/${m}/transacciones/importar`, formData),
    confirmarImportacion: (a, m, payload) => request('POST', `/periodos/${a}/${m}/transacciones/importar/confirmar`, payload),
    importarTransaccionesConMapeo: (a, m, formData) => requestMultipart('POST', `/periodos/${a}/${m}/transacciones/importar/mapeo`, formData),
    detectarHistorico: (formData) => requestMultipart('POST', '/transacciones/importar-historico/detectar', formData),
    confirmarHistorico: (formData) => requestMultipart('POST', '/transacciones/importar-historico/confirmar', formData),
    confirmarConflictosHistorico: (payload) => request('POST', '/transacciones/importar-historico/confirmar-conflictos', payload),

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
    listarAbonosMeta: (id) => request('GET', `/metas/${id}/abonos`),

    // Inversiones
    listarInversiones: () => request('GET', '/inversiones'),
    resumenCartera: () => request('GET', '/inversiones/resumen'),
    agregarInversion: (dto) => request('POST', '/inversiones', dto),
    actualizarInversion: (id, dto) => request('PUT', `/inversiones/${id}`, dto),
    eliminarInversion: (id) => request('DELETE', `/inversiones/${id}`),
    obtenerCotizaciones: () => request('GET', '/inversiones/cotizaciones'),
    buscarTickers: (q) => request('GET', `/inversiones/buscar-tickers?q=${encodeURIComponent(q)}`),
    obtenerEvolucion: (mercado, periodo) => request('GET', `/inversiones/evolucion?mercado=${mercado}&periodo=${periodo}`),
};
