// ============================================
// Статистика
// ============================================

function calculateWeightedBB100(hands) {
    if (!hands || hands.length === 0) {
        return { bb100: 0, avgLimit: 0, totalProfit: 0 };
    }

    const groups = {};
    hands.forEach(hand => {
        const limit = hand.limit;
        if (!groups[limit]) {
            groups[limit] = { hands: 0, profit: 0 };
        }
        groups[limit].hands += 1;
        groups[limit].profit += hand.totalProfit || 0;
    });

    let totalHands = 0;
    let weightedLimit = 0;
    for (const [limit, data] of Object.entries(groups)) {
        const limitValue = parseInt(limit.replace('NL', '')) || 0;
        weightedLimit += limitValue * data.hands;
        totalHands += data.hands;
    }

    if (totalHands === 0) {
        return { bb100: 0, avgLimit: 0, totalProfit: 0 };
    }

    const avgLimit = weightedLimit / totalHands;
    const totalProfit = hands.reduce((sum, h) => sum + (h.totalProfit || 0), 0);

    const bb = totalProfit / avgLimit;
    const bb100 = (bb / totalHands) * 100;

    return {
        bb100: bb100,
        avgLimit: avgLimit,
        totalProfit: totalProfit,
        totalHands: totalHands
    };
}

function calculateStats(hands, playerName) {
    if (!hands || hands.length === 0) {
        return {
            totalHands: 0,
            totalProfit: 0,
            bb100: 0,
            totalTime: 0,
            wins: 0,
            losses: 0,
            breakeven: 0
        };
    }

    const playerHands = hands.filter(hand =>
        hand.players.some(p => p.name === playerName)
    );

    let totalProfit = 0;
    let wins = 0;
    let losses = 0;
    let breakeven = 0;

    playerHands.forEach(hand => {
        const player = hand.players.find(p => p.name === playerName);
        if (player) {
            const profit = player.result;
            hand.totalProfit = profit;
            totalProfit += profit;

            if (profit > 0) wins++;
            else if (profit < 0) losses++;
            else breakeven++;
        }
    });

    // ===== ВРЕМЯ (суммируем время между раздачами + последняя раздача) =====
    let totalSeconds = 0;
    
    if (playerHands.length > 0) {
        const sortedByTime = [...playerHands].sort((a, b) => {
            const dateA = `${a.date} ${a.startTime}`;
            const dateB = `${b.date} ${b.startTime}`;
            return dateA.localeCompare(dateB);
        });

        for (let i = 0; i < sortedByTime.length; i++) {
            const current = sortedByTime[i];
            const currentStart = new Date(`${current.date}T${current.startTime}`);
            
            if (i < sortedByTime.length - 1) {
                const next = sortedByTime[i + 1];
                const nextStart = new Date(`${next.date}T${next.startTime}`);
                
                let diff = (nextStart - currentStart) / 1000;
                if (diff < 0) diff += 24 * 3600;
                
                if (diff < 3600 && diff > 0) {
                    totalSeconds += diff;
                }
            } else {
                const currentEnd = new Date(`${current.date}T${current.endTime}`);
                let duration = (currentEnd - currentStart) / 1000;
                if (duration < 0) duration += 24 * 3600;
                
                if (duration < 3600 && duration > 0) {
                    totalSeconds += duration;
                }
            }
        }
    }

    // Защита от ошибок
    if (totalSeconds > 24 * 3600) {
        console.warn('⚠️ Подозрительно большое время:', totalSeconds, 'сек. Сбрасываем.');
        totalSeconds = 0;
    }

    const bbResult = calculateWeightedBB100(playerHands);

    return {
        totalHands: playerHands.length,
        totalProfit: totalProfit,
        bb100: bbResult.bb100,
        totalTime: totalSeconds,
        wins: wins,
        losses: losses,
        breakeven: breakeven,
        avgLimit: bbResult.avgLimit
    };
}

function parseTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return null;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0ч 0м';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${minutes}м`;
}

function formatMoney(value, currency = '€') {
    if (value === 0) return `${currency}0.00`;
    const sign = value > 0 ? '+' : '';
    return `${sign}${currency}${value.toFixed(2)}`;
}

function getTopOpponents(hands, playerName, limit = 10) {
    if (!hands || hands.length === 0) return [];

    const opponents = {};

    hands.forEach(hand => {
        const player = hand.players.find(p => p.name === playerName);
        if (!player) return;

        const playerResult = player.result;

        hand.players.forEach(p => {
            if (p.name !== playerName) {
                if (!opponents[p.name]) {
                    opponents[p.name] = {
                        total: 0,
                        hands: 0,
                        wins: 0,
                        losses: 0
                    };
                }

                const opponentResult = -playerResult;

                opponents[p.name].total += opponentResult;
                opponents[p.name].hands++;

                if (opponentResult > 0) opponents[p.name].wins++;
                else if (opponentResult < 0) opponents[p.name].losses++;
            }
        });
    });

    return Object.entries(opponents)
        .map(([name, data]) => ({
            name,
            total: data.total,
            hands: data.hands,
            wins: data.wins,
            losses: data.losses,
            winRate: data.hands > 0 ? (data.wins / data.hands * 100) : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
}

function detectPlayer(hands) {
    if (!hands || hands.length === 0) return null;

    const frequency = {};
    hands.forEach(hand => {
        hand.players.forEach(p => {
            if (!frequency[p.name]) frequency[p.name] = 0;
            frequency[p.name]++;
        });
    });

    let maxCount = 0;
    let player = null;
    for (const [name, count] of Object.entries(frequency)) {
        if (count > maxCount) {
            maxCount = count;
            player = name;
        }
    }

    return player;
}

window.Stats = {
    calculate: calculateStats,
    calculateWeightedBB100: calculateWeightedBB100,
    formatTime: formatTime,
    formatMoney: formatMoney,
    getTopOpponents: getTopOpponents,
    detectPlayer: detectPlayer,
    parseTime: parseTime
};