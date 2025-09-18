
// admin/LecapsAdminPanel.js

// Simple in-memory state for the admin panel
let lecapsData = {
    params: {},
    items: []
};

// --- DOM Elements ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const validationErrorsEl = document.getElementById('validation-errors');
const previewEl = document.getElementById('preview');
const confirmImportBtn = document.getElementById('confirm-import-btn');
const paramsForm = document.getElementById('params-form');
const adminTableBody = document.getElementById('admin-lecaps-table-body');
const exportJsonBtn = document.getElementById('export-json-btn');

// --- JSON Validation ---
function validateLecapsJson(data) {
    const errors = [];
    if (!data.version || !data.version.startsWith('lecaps.v')) errors.push('Falta o es inválida la "version".');
    if (!data.updated_at || isNaN(new Date(data.updated_at))) errors.push('Falta o es inválida la "updated_at".');
    if (!data.params) errors.push('Falta el objeto "params".');
    if (typeof data.params?.t_plus !== 'number') errors.push('params.t_plus debe ser un número.');
    if (typeof data.params?.comision_pct !== 'number') errors.push('params.comision_pct debe ser un número.');
    if (!Array.isArray(data.items)) errors.push('"items" debe ser un array.');

    if (errors.length > 0) return errors;

    data.items.forEach((item, i) => {
        if (!item.ticker) errors.push(`Item ${i}: Falta "ticker".`);
        if (!item.emision || !/\d{4}-\d{2}-\d{2}/.test(item.emision)) errors.push(`Item ${i} (${item.ticker}): "emision" inválida.`);
        if (!item.vencimiento || !/\d{4}-\d{2}-\d{2}/.test(item.vencimiento)) errors.push(`Item ${i} (${item.ticker}): "vencimiento" inválido.`);
        if (typeof item.tem !== 'number' || item.tem <= 0) errors.push(`Item ${i} (${item.ticker}): "tem" debe ser un número positivo.`);
        if (!item.precios) errors.push(`Item ${i} (${item.ticker}): Falta el objeto "precios".`);
    });

    return errors;
}

// --- UI Rendering ---
function renderParams() {
    if (!paramsForm) return;
    paramsForm.elements['t_plus'].value = lecapsData.params.t_plus ?? 0;
    paramsForm.elements['comision_pct'].value = lecapsData.params.comision_pct ?? 0;
    paramsForm.elements['dm_pct'].value = lecapsData.params.dm_pct ?? 0;
    paramsForm.elements['dm_monto'].value = lecapsData.params.dm_monto ?? 0;
}

function renderAdminTable() {
    if (!adminTableBody) return;
    adminTableBody.innerHTML = lecapsData.items.map(item => `
        <tr>
            <td>${item.ticker}</td>
            <td>${item.emision}</td>
            <td>${item.vencimiento}</td>
            <td>${item.tem}</td>
            <td>${item.precios.ultimo ?? 'N/A'}</td>
            <td>
                <button class="btn secondary btn-sm">Editar</button>
                <button class="btn danger btn-sm">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// --- Data Handling ---
function loadDataFromStorage() {
    const storedData = localStorage.getItem('lecapsData');
    if (storedData) {
        lecapsData = JSON.parse(storedData);
        console.log('Datos cargados desde localStorage.');
        return true;
    }
    return false;
}

async function loadDataFromFile() {
    try {
        const response = await fetch('../data/lecaps.sample.json');
        if (!response.ok) throw new Error('No se encontró el archivo de datos inicial.');
        lecapsData = await response.json();
        localStorage.setItem('lecapsData', JSON.stringify(lecapsData));
        console.log('Datos iniciales cargados desde lecaps.sample.json');
    } catch (error) {
        console.error(error.message);
    }
}

function handleJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const errors = validateLecapsJson(data);

            validationErrorsEl.classList.toggle('hidden', errors.length === 0);
            previewEl.classList.toggle('hidden', errors.length > 0);
            confirmImportBtn.classList.toggle('hidden', errors.length > 0);

            if (errors.length > 0) {
                validationErrorsEl.innerHTML = `<strong>Errores de validación:</strong><br>${errors.join('<br>')}`;
            } else {
                previewEl.innerHTML = `<strong>Previsualización:</strong><br>
                    Versión: ${data.version}<br>
                    Actualizado: ${new Date(data.updated_at).toLocaleString()}<br>
                    ${data.items.length} instrumentos encontrados.`;
                // Store pending data in a temporary variable
                confirmImportBtn.pendingData = data;
            }
        } catch (err) {
            validationErrorsEl.classList.remove('hidden');
            validationErrorsEl.innerHTML = `<strong>Error:</strong> El archivo no es un JSON válido.`;
            previewEl.classList.add('hidden');
            confirmImportBtn.classList.add('hidden');
        }
    };
    reader.readAsText(file);
}

// --- Event Listeners ---
if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/json') {
            handleJsonFile(file);
        }
    });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleJsonFile(file);
    });
}

if (confirmImportBtn) {
    confirmImportBtn.addEventListener('click', () => {
        if (confirmImportBtn.pendingData) {
            lecapsData = confirmImportBtn.pendingData;
            localStorage.setItem('lecapsData', JSON.stringify(lecapsData));
            renderParams();
            renderAdminTable();
            alert('Datos importados y guardados correctamente.');
            // Reset UI
            previewEl.classList.add('hidden');
            confirmImportBtn.classList.add('hidden');
            dropZone.classList.remove('drag-over');
        }
    });
}

if (paramsForm) {
    paramsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(paramsForm);
        lecapsData.params.t_plus = parseInt(formData.get('t_plus'), 10);
        lecapsData.params.comision_pct = parseFloat(formData.get('comision_pct'));
        lecapsData.params.dm_pct = parseFloat(formData.get('dm_pct'));
        lecapsData.params.dm_monto = parseFloat(formData.get('dm_monto'));
        localStorage.setItem('lecapsData', JSON.stringify(lecapsData));
        alert('Parámetros guardados. La tabla principal será recalculada.');
    });
}

if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(lecapsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lecaps.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    if (!loadDataFromStorage()) {
        await loadDataFromFile();
    }
    renderParams();
    renderAdminTable();
});
