
// ui/LecapsCurveChart.js

let chartInstance = null;

function createChart(ctx, data, top3Tickers) {
    return new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'TIR vs. Días al Vto.',
                data: data.map(item => ({
                    x: item.dias_al_vto,
                    y: item.tir_ea * 100,
                    ticker: item.ticker
                })),
                pointBackgroundColor: (context) => {
                    const ticker = context.dataset.data[context.dataIndex].ticker;
                    return top3Tickers.includes(ticker) ? '#eab308' : 'rgba(13, 110, 253, 0.6)';
                },
                pointBorderColor: (context) => {
                    const ticker = context.dataset.data[context.dataIndex].ticker;
                    return top3Tickers.includes(ticker) ? '#d97706' : 'rgba(13, 110, 253, 1)';
                },
                pointRadius: 6,
                pointHoverRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Días al Vencimiento' },
                    beginAtZero: true,
                },
                y: {
                    title: { display: true, text: 'TIR Efectiva Anual (%)' },
                    ticks: {
                        callback: value => `${value.toFixed(2)}%`
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = context.dataset.data[context.dataIndex];
                            return `${item.ticker}: ${item.y.toFixed(2)}%`;
                        },
                        afterLabel: function(context) {
                            const item = context.dataset.data[context.dataIndex];
                            return `${item.x.toFixed(0)} días`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

export function initChart(selector) {
    const canvas = document.querySelector(selector);
    if (!canvas) return null;
    return canvas.getContext('2d');
}

export function renderChart(ctx, data) {
    if (!ctx) return;

    // Resaltar top 3
    const top3 = [...data]
        .filter(d => d.tir_ea !== null)
        .sort((a, b) => b.tir_ea - a.tir_ea)
        .slice(0, 3);
    const top3Tickers = top3.map(d => d.ticker);

    const chartData = data.filter(d => d.tir_ea !== null && d.dias_al_vto > 0);

    if (chartInstance) {
        chartInstance.data.datasets[0].data = chartData.map(item => ({
            x: item.dias_al_vto,
            y: item.tir_ea * 100,
            ticker: item.ticker
        }));
        chartInstance.options.plugins.pointBackgroundColor = (context) => {
            const ticker = context.dataset.data[context.dataIndex].ticker;
            return top3Tickers.includes(ticker) ? '#eab308' : 'rgba(13, 110, 253, 0.6)';
        };
        chartInstance.options.plugins.pointBorderColor = (context) => {
            const ticker = context.dataset.data[context.dataIndex].ticker;
            return top3Tickers.includes(ticker) ? '#d97706' : 'rgba(13, 110, 253, 1)';
        };
        chartInstance.update();
    } else {
        chartInstance = createChart(ctx, chartData, top3Tickers);
    }
}
