
// core/lecapsMath.js

/**
 * Parsea una fecha en formato YYYY-MM-DD a un objeto Date UTC.
 * @param {string} dateString - La fecha en formato YYYY-MM-DD.
 * @returns {Date} Objeto Date en UTC.
 */
const parseDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Calcula la diferencia de días entre dos fechas bajo la convención 30E/360.
 * @param {Date} startDate - Fecha de inicio.
 * @param {Date} endDate - Fecha de fin.
 * @returns {number} Días bajo la convención 30/360.
 */
const diff30_360 = (startDate, endDate) => {
    let d1 = startDate.getUTCDate();
    let m1 = startDate.getUTCMonth() + 1;
    let y1 = startDate.getUTCFullYear();
    let d2 = endDate.getUTCDate();
    let m2 = endDate.getUTCMonth() + 1;
    let y2 = endDate.getUTCFullYear();

    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;

    return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
};

/**
 * Procesa un único instrumento LECAP para calcular todas sus métricas.
 * @param {object} item - El objeto del instrumento desde el JSON.
 * @param {object} params - Los parámetros globales del JSON.
 * @param {Date} today - La fecha de "hoy" para los cálculos.
 * @returns {object} El instrumento enriquecido con todas las métricas calculadas.
 */
export function processLecap(item, params, today = new Date()) {
    const enriched = { ...item };

    // 1. Determinar T+N y fecha de liquidación
    const t_plus = item.overrides?.t_plus ?? params.t_plus;
    const fecha_liquidacion = new Date(today);
    fecha_liquidacion.setDate(fecha_liquidacion.getDate() + t_plus);

    // 2. Días al vencimiento (calendario)
    const fecha_vencimiento = parseDate(item.vencimiento);
    const dias_al_vto = (fecha_vencimiento - fecha_liquidacion) / (1000 * 60 * 60 * 24);

    if (dias_al_vto <= 0) {
        enriched.invalid = 'Vencido o ilíquido';
    }

    // 3. Vigencia del instrumento (30/360)
    const fecha_emision = parseDate(item.emision);
    const vigencia_360 = diff30_360(fecha_emision, fecha_vencimiento);
    const meses = Math.floor(vigencia_360 / 30);
    const fraccion_mes = (vigencia_360 % 30) / 30;

    // 4. Valor Futuro (FV)
    const fv = 100 * Math.pow(1 + item.tem, meses + fraccion_mes);

    // 5. Selección de precio y estado "stale"
    const precio_base = item.precios.ultimo ?? item.precios.compra ?? item.precios.cierre;
    let precio_src = 'N/A';
    if (item.precios.ultimo) precio_src = 'ULT';
    else if (item.precios.compra) precio_src = 'COM';
    else if (item.precios.cierre) precio_src = 'CIE';

    let stale = true;
    if (item.precios.hora) {
        const precio_hora = new Date(item.precios.hora);
        // Considera stale si tiene más de ~1 día hábil (28 hs para cubrir fines de semana)
        stale = (new Date() - precio_hora) / (1000 * 60 * 60) > 28;
    }

    // 6. Costos y Precio Neto
    const comision_pct = item.overrides?.comision_pct ?? params.comision_pct ?? 0;
    const dm_pct = item.overrides?.dm_pct ?? params.dm_pct ?? 0;
    const dm_monto = item.overrides?.dm_monto ?? params.dm_monto ?? 0;
    
    const precio_neto = precio_base 
        ? (precio_base * (1 + comision_pct) * (1 + dm_pct)) + dm_monto
        : null;

    // 7. Rendimientos (TIR)
    let tir_em = null;
    let tir_ea = null;

    if (precio_neto && precio_neto > 0 && dias_al_vto > 0) {
        const factor_total = fv / precio_neto;
        tir_em = Math.pow(factor_total, 30 / dias_al_vto) - 1;
        tir_ea = Math.pow(factor_total, 360 / dias_al_vto) - 1;
    }

    // Ensamblar el objeto final
    return {
        ...enriched,
        // Inputs y overrides
        t_plus,
        comision_pct,
        dm_pct,
        dm_monto,
        // Calculados
        fecha_liquidacion,
        dias_al_vto,
        vigencia_360,
        fv,
        precio_base,
        precio_src,
        stale,
        precio_neto,
        tir_em,
        tir_ea,
    };
}
