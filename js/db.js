// ============================================
// IndexedDB - работа с базой данных
// ============================================

const DB_NAME = 'PokerAnalyticsDB';
const DB_VERSION = 1;
const STORE_NAME = 'hands';

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, {
                    keyPath: 'gamecode'
                });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('limit', 'limit', { unique: false });
                store.createIndex('players', 'players', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('✅ IndexedDB открыта');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('❌ Ошибка открытия IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

function saveHands(hands) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('База данных не открыта'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        let saved = 0;
        const total = hands.length;

        hands.forEach(hand => {
            const request = store.put(hand);
            request.onsuccess = () => {
                saved++;
                if (saved % 100 === 0 || saved === total) {
                    updateProgress(saved, total);
                }
            };
        });

        transaction.oncomplete = () => {
            console.log(`✅ Сохранено ${saved} раздач`);
            resolve(saved);
        };

        transaction.onerror = (event) => {
            console.error('❌ Ошибка транзакции:', event.target.error);
            reject(event.target.error);
        };
    });
}

function getAllHands() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('База данных не открыта'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = (event) => {
            console.error('❌ Ошибка получения данных:', event.target.error);
            reject(event.target.error);
        };
    });
}

function getAllPlayers() {
    return new Promise((resolve, reject) => {
        getAllHands()
            .then(hands => {
                const players = new Set();
                hands.forEach(hand => {
                    hand.players.forEach(p => players.add(p.name));
                });
                resolve([...players].sort());
            })
            .catch(reject);
    });
}

function getAllLimits() {
    return new Promise((resolve, reject) => {
        getAllHands()
            .then(hands => {
                const limits = new Set();
                hands.forEach(hand => limits.add(hand.limit));
                resolve([...limits].sort());
            })
            .catch(reject);
    });
}

function clearDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('База данных не открыта'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('✅ База данных очищена');
            resolve();
        };

        request.onerror = (event) => {
            console.error('❌ Ошибка очистки:', event.target.error);
            reject(event.target.error);
        };
    });
}

function updateProgress(saved, total) {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const percent = (saved / total) * 100;
        progressFill.style.width = `${percent}%`;
    }
}

window.DB = {
    open: openDB,
    save: saveHands,
    getAll: getAllHands,
    getPlayers: getAllPlayers,
    getLimits: getAllLimits,
    clear: clearDB
};