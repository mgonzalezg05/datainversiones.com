
// app-lecaps.js

import { processLecap } from './core/lecapsMath.js';
import { initTable, renderTable } from './ui/LecapsTable.js';
import { initChart, renderChart } from './ui/LecapsCurveChart.js';

// --- State Management ---
const state = {
    lecapsData: null, // Contendrá el JSON completo { version, updated_at, params, items }
    processedItems: [], // Contendrá los items procesados con todas las métricas
    chartCtx: null,
};

// --- Data Loading ---
async function loadInitialData() {
    try {
        const storedData = localStorage.getItem('lecapsData');
        if (storedData) {
            console.log('Cargando datos desde localStorage');
            state.lecapsData = JSON.parse(storedData);
        } else {
            console.log('Cargando datos desde archivo de ejemplo');
            const response = await fetch('./data/lecaps.sample.json');
            if (!response.ok) throw new Error('No se pudo cargar el archivo de datos inicial.');
            state.lecapsData = await response.json();
            localStorage.setItem('lecapsData', JSON.stringify(state.lecapsData));
        }
    } catch (error) {
        console.error('Error fatal al cargar datos:', error);
        alert('No se pudieron cargar los datos de LECAPs. Por favor, verifique el archivo JSON en el panel de administración.');
    }
}

// --- Core Logic ---
function processAndRender() {
    if (!state.lecapsData) return;

    const today = new Date(); // Usar la misma fecha para todos los cálculos en un render
    state.processedItems = state.lecapsData.items.map(item => 
        processLecap(item, state.lecapsData.params, today)
    );

    // TODO: Aplicar filtros aquí antes de renderizar
    const filteredData = state.processedItems;

    renderTable(filteredData);
    renderChart(state.chartCtx, filteredData);
}

// --- Event Listeners ---
function addEventListeners() {
    // Escucha eventos personalizados para solicitar un re-renderizado
    document.addEventListener('renderRequest', processAndRender);

    // Escucha si los datos cambian en otra pestaña (admin panel)
    window.addEventListener('storage', (e) => {
        if (e.key === 'lecapsData') {
            console.log('Detectado cambio en localStorage. Recargando...');
            state.lecapsData = JSON.parse(e.newValue);
            processAndRender();
        }
    });
}

// --- Initialization ---
async function main() {
    initTable('#lecaps-table');
    state.chartCtx = initChart('#lecaps-chart');
    
    await loadInitialData();
    processAndRender();
    addEventListeners();
}

main();
