// ============================================
// Парсер файлов раздач
// ============================================

function parseHandFile(content) {
    const lines = content.split('\n')
        .filter(line => line.trim() && line.includes(';'));

    return lines.map(line => {
        try {
            const parts = line.split(';');

            const gamecode = parts[0].trim();
            const startTime = parts[1]?.trim() || '00:00:00';
            const endTime = parts[2]?.trim() || '00:00:00';
            const limit = parts[3]?.trim() || 'NL0';

            const limitValue = parseInt(limit.replace('NL', '')) || 0;

            const players = [];
            for (let i = 4; i < parts.length; i++) {
                const part = parts[i].trim();
                if (!part) continue;

                const colonIndex = part.lastIndexOf(':');
                if (colonIndex === -1) continue;

                const name = part.substring(0, colonIndex).trim();
                const resultStr = part.substring(colonIndex + 1).trim();

                const cleanResult = resultStr.replace(/[^0-9.\-+]/g, '');
                const result = parseFloat(cleanResult) || 0;

                players.push({ name, result });
            }

            let date = new Date().toISOString().split('T')[0];
            if (gamecode && gamecode.length >= 10) {
                const year = gamecode.substring(0, 4);
                const month = gamecode.substring(4, 6);
                const day = gamecode.substring(6, 8);
                if (year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    date = `${year}-${month}-${day}`;
                }
            }

            return {
                gamecode,
                date,
                startTime,
                endTime,
                limit,
                limitValue,
                players
            };
        } catch (e) {
            console.warn('Ошибка парсинга строки:', line, e);
            return null;
        }
    }).filter(hand => hand !== null && hand.players.length > 0);
}

async function parseFiles(files, onProgress) {
    const allHands = [];
    let processed = 0;
    const total = files.length;

    for (const file of files) {
        try {
            const content = await file.text();
            const hands = parseHandFile(content);
            allHands.push(...hands);

            processed++;
            if (onProgress) {
                onProgress({
                    processed,
                    total,
                    fileName: file.name,
                    handsFound: hands.length,
                    totalHands: allHands.length
                });
            }
        } catch (e) {
            console.error(`Ошибка файла ${file.name}:`, e);
            if (onProgress) {
                onProgress({
                    processed,
                    total,
                    fileName: file.name,
                    error: e.message,
                    totalHands: allHands.length
                });
            }
        }
    }

    return allHands;
}

window.Parser = {
    parseFile: parseHandFile,
    parseFiles: parseFiles
};