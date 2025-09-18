
// ui/LecapsTable.js

let state = {
    sort: { key: 'tir_ea', asc: false },
    filters: {}
};

let tableBody, headers;

function formatValue(value, type) {
    if (value === null || typeof value === 'undefined') return '-';
    switch (type) {
        case 'percent': return `${(value * 100).toFixed(2)}%`;
        case 'bps': return `${(value * 10000).toFixed(0)} bps`;
        case 'price': return `$${value.toFixed(2)}`;
        case 'days': return value.toFixed(0);
        case 'tem': return value.toFixed(5);
        case 'stale': return value ? '⚠️' : '✅';
        default: return value;
    }
}

function renderRow(item) {
    return `
        <tr data-ticker="${item.ticker}" class="${item.invalid ? 'invalid-row' : ''}">
            <td>${item.ticker}</td>
            <td>${item.emision}</td>
            <td>${item.vencimiento}</td>
            <td>${formatValue(item.dias_al_vto, 'days')}</td>
            <td>${formatValue(item.tem, 'tem')}</td>
            <td>${formatValue(item.fv, 'price')}</td>
            <td>${formatValue(item.precio_base, 'price')} (${item.precio_src})</td>
            <td>${formatValue(item.comision_pct, 'percent')}</td>
            <td>${formatValue(item.dm_pct, 'percent')} + ${formatValue(item.dm_monto, 'price')}</td>
            <td>${formatValue(item.precio_neto, 'price')}</td>
            <td>${formatValue(item.tir_em, 'percent')}</td>
            <td>${formatValue(item.tir_ea, 'percent')}</td>
            <td title="${item.stale ? 'Precio posiblemente desactualizado' : 'Precio actualizado'}">${formatValue(item.stale, 'stale')}</td>
        </tr>
    `;
}

function applySort(data) {
    const { key, asc } = state.sort;
    return [...data].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (valA === null) return 1;
        if (valB === null) return -1;
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
    });
}

function handleSort(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    if (state.sort.key === key) {
        state.sort.asc = !state.sort.asc;
    } else {
        state.sort.key = key;
        state.sort.asc = false; // Default a DESC para TIRs
    }
    // Aquí se debería llamar a una función de renderizado principal
    document.dispatchEvent(new CustomEvent('renderRequest'));
}

export function initTable(selector) {
    const table = document.querySelector(selector);
    if (!table) return;
    tableBody = table.querySelector('tbody');
    headers = table.querySelectorAll('thead th[data-key]');
    headers.forEach(th => th.addEventListener('click', handleSort));
}

export function renderTable(data) {
    if (!tableBody) return;
    const sortedData = applySort(data);
    tableBody.innerHTML = sortedData.map(renderRow).join('');
}
