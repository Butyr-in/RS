// ============================================
// Графики (Chart.js)
// ============================================

let capitalChartInstance = null;

function initCharts() {
    const capitalCtx = document.getElementById('capitalChart');
    if (capitalCtx) {
        capitalChartInstance = new Chart(capitalCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '',
                    data: [],
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#6c5ce7'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255,255,255,0.05)'
                        },
                        ticks: {
                            maxTicksLimit: 30,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255,255,255,0.05)'
                        },
                        ticks: {
                            font: { size: 10 },
                            callback: function(value) {
                                return '€' + value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
}

function updateCapitalChart(hands, playerName, view = 'hands') {
    if (!capitalChartInstance) return;

    if (!hands || hands.length === 0) {
        capitalChartInstance.data.labels = [];
        capitalChartInstance.data.datasets[0].data = [];
        capitalChartInstance.update();
        return;
    }

    const playerHands = hands.filter(hand =>
        hand.players.some(p => p.name === playerName)
    );

    if (playerHands.length === 0) {
        capitalChartInstance.data.labels = [];
        capitalChartInstance.data.datasets[0].data = [];
        capitalChartInstance.update();
        return;
    }

    const sorted = [...playerHands].sort((a, b) => {
        const dateA = `${a.date} ${a.startTime}`;
        const dateB = `${b.date} ${b.startTime}`;
        return dateA.localeCompare(dateB);
    });

    let labels = [];
    let data = [];
    let cumulative = 0;

    if (view === 'hands') {
        sorted.forEach(hand => {
            const player = hand.players.find(p => p.name === playerName);
            if (player) {
                cumulative += player.result;
                const shortTime = hand.startTime.substring(0, 5);
                labels.push(shortTime);
                data.push(cumulative);
            }
        });
    } else if (view === 'days') {
        const dayMap = {};
        sorted.forEach(hand => {
            const player = hand.players.find(p => p.name === playerName);
            if (player) {
                if (!dayMap[hand.date]) {
                    dayMap[hand.date] = { profit: 0, count: 0 };
                }
                dayMap[hand.date].profit += player.result;
                dayMap[hand.date].count++;
            }
        });

        const dayKeys = Object.keys(dayMap).sort();
        dayKeys.forEach(date => {
            cumulative += dayMap[date].profit;
            const parts = date.split('-');
            labels.push(`${parts[2]}.${parts[1]}`);
            data.push(cumulative);
        });
    } else if (view === 'months') {
        const monthMap = {};
        sorted.forEach(hand => {
            const player = hand.players.find(p => p.name === playerName);
            if (player) {
                const monthKey = hand.date.substring(0, 7);
                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = { profit: 0, count: 0 };
                }
                monthMap[monthKey].profit += player.result;
                monthMap[monthKey].count++;
            }
        });

        const monthKeys = Object.keys(monthMap).sort();
        monthKeys.forEach(month => {
            cumulative += monthMap[month].profit;
            const parts = month.split('-');
            labels.push(`${parts[1]}.${parts[0]}`);
            data.push(cumulative);
        });
    } else if (view === 'years') {
        const yearMap = {};
        sorted.forEach(hand => {
            const player = hand.players.find(p => p.name === playerName);
            if (player) {
                const yearKey = hand.date.substring(0, 4);
                if (!yearMap[yearKey]) {
                    yearMap[yearKey] = { profit: 0, count: 0 };
                }
                yearMap[yearKey].profit += player.result;
                yearMap[yearKey].count++;
            }
        });

        const yearKeys = Object.keys(yearMap).sort();
        yearKeys.forEach(year => {
            cumulative += yearMap[year].profit;
            labels.push(year);
            data.push(cumulative);
        });
    } else if (view === 'all') {
        const firstHand = sorted[0];
        const lastHand = sorted[sorted.length - 1];

        let totalProfit = 0;
        sorted.forEach(hand => {
            const player = hand.players.find(p => p.name === playerName);
            if (player) {
                totalProfit += player.result;
            }
        });

        const dateParts = firstHand.date.split('-');
        const startLabel = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
        const endParts = lastHand.date.split('-');
        const endLabel = `${endParts[2]}.${endParts[1]}.${endParts[0]}`;

        labels = [startLabel, endLabel];
        data = [0, totalProfit];
    }

    const MAX_POINTS = 500;
    if (labels.length > MAX_POINTS) {
        const step = Math.ceil(labels.length / MAX_POINTS);
        const filteredLabels = [];
        const filteredData = [];
        for (let i = 0; i < labels.length; i += step) {
            filteredLabels.push(labels[i]);
            filteredData.push(data[i]);
        }
        if (filteredLabels[filteredLabels.length - 1] !== labels[labels.length - 1]) {
            filteredLabels.push(labels[labels.length - 1]);
            filteredData.push(data[data.length - 1]);
        }
        capitalChartInstance.data.labels = filteredLabels;
        capitalChartInstance.data.datasets[0].data = filteredData;
    } else {
        capitalChartInstance.data.labels = labels;
        capitalChartInstance.data.datasets[0].data = data;
    }

    const lastValue = data[data.length - 1] || 0;
    const color = lastValue >= 0 ? '#00d2d3' : '#ff6b6b';
    const bgColor = lastValue >= 0 ? 'rgba(0, 210, 211, 0.1)' : 'rgba(255, 107, 107, 0.1)';

    capitalChartInstance.data.datasets[0].borderColor = color;
    capitalChartInstance.data.datasets[0].backgroundColor = bgColor;
    capitalChartInstance.data.datasets[0].pointBackgroundColor = color;

    capitalChartInstance.update();
}

function updateChartColors(isDark) {
    if (capitalChartInstance) {
        capitalChartInstance.update();
    }
}

window.Charts = {
    init: initCharts,
    updateCapital: updateCapitalChart,
    updateColors: updateChartColors
};