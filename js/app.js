// ============================================
// Главное приложение
// ============================================

const App = {
    allHands: [],
    selectedPlayer: '',
    selectedLimits: [],
    allPlayers: [],
    allLimits: [],
    theme: 'dark',
    chartView: 'hands',

    dayStart: '06:00',
    sessionGap: 30,

    selectedDay: null,
    selectedSession: null,
    filteredHands: [],
    folderHandle: null,

    async init() {
    console.log('🚀 Инициализация Poker Analytics...');

    try {
        await DB.open();
        console.log('✅ База данных готова');
    } catch (e) {
        console.error('❌ Ошибка открытия БД:', e);
        alert('Ошибка открытия базы данных. Проверьте консоль.');
        return;
    }

    await this.loadData();
    this.initUI();
    Charts.init();
    this.updateDashboard();

    // ===== КОПИРАЙТ =====
    const year = new Date().getFullYear();
    const el = document.getElementById('copyright');
    if (el) {
        el.textContent = `© Butyrin ${year}`;
    }

    console.log('✅ Приложение готово');
},

    async loadData() {
        try {
            this.allHands = await DB.getAll();
            console.log(`📊 Загружено ${this.allHands.length} раздач`);

            this.allPlayers = await DB.getPlayers();
            console.log(`👥 Найдено ${this.allPlayers.length} игроков`);

            this.allLimits = await DB.getLimits();
            console.log(`🎯 Найдено лимитов: ${this.allLimits.length}`);

            const detected = Stats.detectPlayer(this.allHands);
            if (detected) {
                this.selectedPlayer = detected;
                console.log(`👤 Определен игрок: ${this.selectedPlayer}`);
            }

            this.selectedLimits = [...this.allLimits];

        } catch (e) {
            console.error('❌ Ошибка загрузки данных:', e);
        }
    },

    initUI() {
        this.updatePlayerSelect();
        this.updateLimitFilter();
        this.bindEvents();
        this.applyTheme();
        this.loadSettings();
    },

    loadSettings() {
        const dayStart = localStorage.getItem('dayStart');
        const sessionGap = localStorage.getItem('sessionGap');

        if (dayStart) {
            document.getElementById('dayStart').value = dayStart;
            this.dayStart = dayStart;
        }
        if (sessionGap) {
            document.getElementById('sessionGap').value = sessionGap;
            this.sessionGap = parseInt(sessionGap);
        }
    },

    saveSettings() {
        localStorage.setItem('dayStart', this.dayStart);
        localStorage.setItem('sessionGap', String(this.sessionGap));
    },

    updatePlayerSelect() {
        const select = document.getElementById('playerSelect');
        if (!select) return;

        select.innerHTML = '';

        if (this.allPlayers.length === 0) {
            select.innerHTML = '<option value="">Нет игроков</option>';
            return;
        }

        this.allPlayers.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (name === this.selectedPlayer) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    },

    updateLimitFilter() {
        const container = document.getElementById('limitDropdown');
        if (!container) return;

        container.innerHTML = '';

        if (this.allLimits.length === 0) {
            container.innerHTML = '<label>Нет лимитов</label>';
            return;
        }

        this.allLimits.forEach(limit => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = limit;
            checkbox.checked = this.selectedLimits.includes(limit);

            checkbox.addEventListener('change', () => {
                this.onLimitChange(limit, checkbox.checked);
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(limit));
            container.appendChild(label);
        });
    },

    onLimitChange(limit, checked) {
        if (checked) {
            if (!this.selectedLimits.includes(limit)) {
                this.selectedLimits.push(limit);
            }
        } else {
            this.selectedLimits = this.selectedLimits.filter(l => l !== limit);
        }
        this.updateDashboard();
    },

    bindEvents() {
        document.getElementById('playerSelect')?.addEventListener('change', (e) => {
            this.selectedPlayer = e.target.value;
            this.updateDashboard();
        });

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('limitToggle')?.addEventListener('click', () => {
            const dropdown = document.getElementById('limitDropdown');
            dropdown?.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            const filter = document.querySelector('.limit-filter');
            const dropdown = document.getElementById('limitDropdown');
            if (filter && dropdown && !filter.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            document.getElementById('uploadModal')?.classList.add('active');

            const warning = document.getElementById('browserWarning');
            if (!window.showDirectoryPicker) {
                warning.style.display = 'block';
            } else {
                warning.style.display = 'none';
            }
        });

        document.getElementById('closeModal')?.addEventListener('click', () => {
            document.getElementById('uploadModal')?.classList.remove('active');
        });

        document.getElementById('clearBtn')?.addEventListener('click', () => {
            this.clearAllData();
        });

        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshData();
        });

        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chartView = btn.dataset.view;
                this.updateChart();
            });
        });

        document.getElementById('dayStart')?.addEventListener('change', (e) => {
            this.dayStart = e.target.value;
            this.saveSettings();
            this.updateDashboard();
        });

        document.getElementById('sessionGap')?.addEventListener('change', (e) => {
            this.sessionGap = parseInt(e.target.value) || 30;
            this.saveSettings();
            this.updateDashboard();
        });

        // ===== DROP ZONE =====
const dropZone = document.getElementById('dropZone');
if (dropZone) {
    // Клик для выбора папки
    dropZone.addEventListener('click', () => {
        this.selectFolder();
    });

    // Drag & Drop для ФАЙЛОВ (упрощенный вариант)
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
        
        // Получаем файлы из события
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            alert('Ничего не перетащено.');
            return;
        }

        // Фильтруем только .txt файлы
        const txtFiles = [];
        for (const file of files) {
            if (file.name.endsWith('.txt')) {
                txtFiles.push(file);
            }
        }

        if (txtFiles.length === 0) {
            alert('📄 Перетащите .txt файлы с раздачами.\n\n📁 Или нажмите на зону, чтобы выбрать папку.');
            return;
        }

        // Показываем выбранные файлы
        document.getElementById('selectedFolder').style.display = 'block';
        document.getElementById('folderPath').textContent = `📄 ${txtFiles.length} файлов`;
        document.getElementById('fileCount').textContent = `перетащено файлов: ${txtFiles.length}`;

        await this.handleFiles(txtFiles);
    });
}
    },

    async selectFolder() {
        try {
            if (!window.showDirectoryPicker) {
                alert('Ваш браузер не поддерживает выбор папок.\nИспользуйте Chrome, Edge или Opera последней версии.');
                return;
            }

            const dirHandle = await window.showDirectoryPicker();
            this.folderHandle = dirHandle;

            document.getElementById('selectedFolder').style.display = 'block';
            document.getElementById('folderPath').textContent = `📁 ${dirHandle.name}`;
            document.getElementById('fileCount').textContent = '⏳ сканирование...';

            const files = await this.getFilesFromHandle(dirHandle);

            document.getElementById('fileCount').textContent = `найдено ${files.length} файлов`;

            if (files.length === 0) {
                alert('В выбранной папке нет .txt файлов');
                return;
            }

            await this.handleFiles(files);

        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('Ошибка выбора папки:', e);
                alert('Ошибка доступа к папке.');
            }
        }
    },

    async getFilesFromHandle(dirHandle) {
        const files = [];

        async function walkDirectory(handle) {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
                    const file = await entry.getFile();
                    files.push(file);
                } else if (entry.kind === 'directory') {
                    await walkDirectory(entry);
                }
            }
        }

        await walkDirectory(dirHandle);
        return files;
    },

    async handleFiles(files) {
    // Если files — это FileList, преобразуем в массив
    let fileArray = files;
    if (files instanceof FileList) {
        fileArray = Array.from(files);
    }

    // Проверяем, что файлы действительно .txt
    const txtFiles = fileArray.filter(f => f.name.endsWith('.txt'));

    if (txtFiles.length === 0) {
        alert('📄 Перетащите .txt файлы с раздачами.\n\n📁 Или нажмите на зону загрузки, чтобы выбрать папку.');
        return;
    }

    // Если есть файлы, которые не .txt — предупреждаем
    if (txtFiles.length !== fileArray.length) {
        console.warn(`Пропущено ${fileArray.length - txtFiles.length} файлов (не .txt)`);
    }

    const fileList = document.getElementById('fileList');
    const progressFill = document.getElementById('progressFill');

    fileList.innerHTML = '';
    progressFill.style.width = '0%';

    // Отображаем выбранные файлы
    txtFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>📄 ${file.name}</span>
            <span class="status loading">⏳ Ожидание...</span>
        `;
        fileList.appendChild(item);
    });

    const allHands = await Parser.parseFiles(txtFiles, (progress) => {
        const items = fileList.querySelectorAll('.file-item');
        const index = progress.processed - 1;
        if (items[index]) {
            const status = items[index].querySelector('.status');
            if (progress.error) {
                status.className = 'status error';
                status.textContent = `❌ ${progress.error}`;
            } else {
                status.className = 'status success';
                status.textContent = `✅ ${progress.handsFound} раздач`;
            }
        }

        const percent = (progress.processed / progress.total) * 100;
        progressFill.style.width = `${percent}%`;
    });

    if (allHands.length === 0) {
        alert('Не найдено раздач в загруженных файлах');
        return;
    }

    try {
        const saved = await DB.save(allHands);
        console.log(`💾 Сохранено ${saved} раздач в базу`);

        await this.loadData();
        this.updatePlayerSelect();
        this.updateLimitFilter();
        this.updateDashboard();

        alert(`✅ Загружено ${allHands.length} раздач из ${txtFiles.length} файлов!`);

        document.getElementById('uploadModal')?.classList.remove('active');
        document.getElementById('selectedFolder').style.display = 'none';

    } catch (e) {
        console.error('❌ Ошибка сохранения:', e);
        alert('Ошибка сохранения данных в базу');
    }
},


    async refreshData() {
        const btn = document.getElementById('refreshBtn');
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        try {
            // 1. Проверяем, есть ли сохраненная папка
            if (!this.folderHandle) {
                alert('Сначала выберите папку с раздачами (📁 Выбрать папку)');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            // 2. Проверяем, что доступ к папке еще есть
            try {
                await this.folderHandle.values().next();
            } catch (e) {
                alert('Доступ к папке потерян. Пожалуйста, выберите папку заново.');
                this.folderHandle = null;
                document.getElementById('selectedFolder').style.display = 'none';
                document.getElementById('folderStatus').textContent = '❌ доступ потерян';
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            // 3. Сканируем папку
            const files = await this.getFilesFromHandle(this.folderHandle);

            if (files.length === 0) {
                alert('В папке нет .txt файлов');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            // 4. Получаем уже загруженные gamecode из базы
            const existingHands = await DB.getAll();
            const existingGamecodes = new Set(existingHands.map(h => h.gamecode));
            const totalExisting = existingHands.length;

            // 5. Парсим файлы и фильтруем новые
            let allNewHands = [];
            let totalFiles = 0;
            let newFilesCount = 0;
            let processedFiles = [];

            for (const file of files) {
                totalFiles++;
                const content = await file.text();
                const hands = Parser.parseFile(content);

                if (hands && hands.length > 0) {
                    const newHands = hands.filter(h => !existingGamecodes.has(h.gamecode));

                    if (newHands.length > 0) {
                        newFilesCount++;
                        allNewHands = allNewHands.concat(newHands);
                        newHands.forEach(h => existingGamecodes.add(h.gamecode));
                        processedFiles.push(file.name);
                    }
                }
            }

            // 6. Если есть новые раздачи — сохраняем
            if (allNewHands.length > 0) {
                await DB.save(allNewHands);
                console.log(`💾 Добавлено ${allNewHands.length} новых раздач из ${newFilesCount} файлов`);
                console.log(`   Файлы: ${processedFiles.join(', ')}`);

                // Перезагружаем данные и обновляем интерфейс
                await this.loadData();
                this.updatePlayerSelect();
                this.updateLimitFilter();
                this.updateDashboard();

                const totalNew = allNewHands.length;
                const totalNow = this.allHands.length;
                alert(`✅ Добавлено ${totalNew} новых раздач из ${newFilesCount} файлов!\n\nВсего раздач: ${totalNow} (+${totalNew})`);
            } else {
                alert(`✅ Новых раздач не найдено.\n\nПроверено ${totalFiles} файлов.\nВсего раздач в базе: ${totalExisting}`);
            }

        } catch (e) {
            console.error('❌ Ошибка обновления:', e);
            alert(`Ошибка обновления данных: ${e.message}\n\nПопробуйте выбрать папку заново.`);
        }

        btn.textContent = '🔄';
        btn.disabled = false;
    },

    // === ОПРЕДЕЛЕНИЕ ВАЛЮТЫ ===
    getCurrency() {
        if (!this.allHands || this.allHands.length === 0) return '€';

        for (const hand of this.allHands) {
            for (const player of hand.players) {
                const result = player.result;
                if (typeof result === 'string') {
                    if (result.includes('$')) return '$';
                    if (result.includes('£')) return '£';
                    if (result.includes('€')) return '€';
                }
            }
        }
        return '€';
    },

    getFilteredHands() {
        return this.allHands.filter(hand => {
            const hasPlayer = hand.players.some(p => p.name === this.selectedPlayer);
            const hasLimit = this.selectedLimits.length === 0 ||
                this.selectedLimits.includes(hand.limit);
            return hasPlayer && hasLimit;
        });
    },

    groupHandsByDayAndSession(hands) {
        const dayStart = this.dayStart;
        const sessionGap = this.sessionGap * 60;

        const sorted = [...hands].sort((a, b) => {
            const dateA = `${a.date} ${a.startTime}`;
            const dateB = `${b.date} ${b.startTime}`;
            return dateA.localeCompare(dateB);
        });

        const dayGroups = {};

        sorted.forEach(hand => {
            const timeStr = hand.startTime;
            let dayStr = hand.date;

            if (timeStr < dayStart) {
                const prevDate = new Date(hand.date);
                prevDate.setDate(prevDate.getDate() - 1);
                dayStr = prevDate.toISOString().split('T')[0];
            }

            if (!dayGroups[dayStr]) {
                dayGroups[dayStr] = { date: dayStr, hands: [], sessions: [] };
            }
            dayGroups[dayStr].hands.push(hand);
        });

        for (const dayKey in dayGroups) {
            const day = dayGroups[dayKey];
            const sortedHands = day.hands.sort((a, b) => {
                return a.startTime.localeCompare(b.startTime);
            });

            let sessions = [];
            let currentSession = [];

            for (let i = 0; i < sortedHands.length; i++) {
                const hand = sortedHands[i];
                if (i === 0) {
                    currentSession.push(hand);
                } else {
                    const prevHand = sortedHands[i - 1];
                    const prevTime = new Date(`${prevHand.date}T${prevHand.startTime}`);
                    const currTime = new Date(`${hand.date}T${hand.startTime}`);
                    const diff = (currTime - prevTime) / 1000;

                    if (diff > sessionGap) {
                        sessions.push(currentSession);
                        currentSession = [];
                    }
                    currentSession.push(hand);
                }
            }

            if (currentSession.length > 0) {
                sessions.push(currentSession);
            }

            day.sessions = sessions;
            day.hands = sortedHands;
        }

        return Object.values(dayGroups).sort((a, b) => {
            return b.date.localeCompare(a.date);
        });
    },

    updateDashboard() {
        if (!this.selectedPlayer || this.allHands.length === 0) {
            this.showEmptyState();
            return;
        }

        const filteredHands = this.getFilteredHands();
        this.filteredHands = filteredHands;

        if (filteredHands.length === 0) {
            this.showEmptyState('Нет раздач для выбранного игрока и лимитов');
            return;
        }

        const currency = this.getCurrency();
        const stats = Stats.calculate(filteredHands, this.selectedPlayer);

        document.getElementById('totalHands').textContent = stats.totalHands;
        document.getElementById('totalTime').textContent = Stats.formatTime(stats.totalTime);
        document.getElementById('bb100').textContent = stats.bb100.toFixed(1);
        document.getElementById('totalProfit').textContent = Stats.formatMoney(stats.totalProfit, currency);

        this.updateOpponents(filteredHands);
        this.updateChart();
        this.updateTree(filteredHands);
    },

    updateChart() {
        const filteredHands = this.getFilteredHands();
        Charts.updateCapital(filteredHands, this.selectedPlayer, this.chartView);
    },

    updateOpponents(hands) {
        const container = document.getElementById('opponentsList');
        if (!container) return;

        const opponents = Stats.getTopOpponents(hands, this.selectedPlayer, 10);
        const filtered = opponents.filter(opp => opp.total > 0);

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-message">Нет оппонентов, которым вы проиграли</p>';
            return;
        }

        const currency = this.getCurrency();

        container.innerHTML = '';
        filtered.forEach((opp, index) => {
            const item = document.createElement('div');
            item.className = 'opponent-item';

            item.innerHTML = `
                    <span class="opponent-name">${index + 1}. ${opp.name}</span>
                    <div class="opponent-stats">
                        <span>${opp.hands} рук</span>
                        <span class="opponent-profit negative">
                            -${currency}${Math.abs(opp.total).toFixed(2)}
                        </span>
                    </div>
                `;
            container.appendChild(item);
        });
    },

    // === КОПИРОВАНИЕ В БУФЕР ОБМЕНА ===
    copyToClipboard(value, element) {
        if (!value) return;

        navigator.clipboard.writeText(String(value)).then(() => {
            element.classList.add('copied');
            const originalText = element.textContent;
            element.textContent = '✅ скопировано';

            setTimeout(() => {
                element.classList.remove('copied');
                element.textContent = originalText;
            }, 1500);
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = String(value);
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);

            element.classList.add('copied');
            const originalText = element.textContent;
            element.textContent = '✅ скопировано';

            setTimeout(() => {
                element.classList.remove('copied');
                element.textContent = originalText;
            }, 1500);
        });
    },

    updateTree(hands) {
        const container = document.getElementById('daysTree');
        if (!container) return;

        const dayGroups = this.groupHandsByDayAndSession(hands);

        if (dayGroups.length === 0) {
            container.innerHTML = '<p class="empty-message">Нет раздач</p>';
            document.getElementById('totalDaysCount').textContent = '0 дней';
            return;
        }

        document.getElementById('totalDaysCount').textContent = `${dayGroups.length} дней`;
        container.innerHTML = '';

        const currency = this.getCurrency();

        dayGroups.forEach((day) => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'tree-day';

            // --- Прибыль дня ---
            const dayProfit = day.hands.reduce((sum, h) => {
                const player = h.players.find(p => p.name === this.selectedPlayer);
                return sum + (player ? player.result : 0);
            }, 0);
            const profitClass = dayProfit > 0 ? 'positive' : (dayProfit < 0 ? 'negative' : 'zero');

            // --- Длительность дня ---
            let dayDurationSeconds = 0;
            day.sessions.forEach(session => {
                if (session.length === 0) return;
                const first = session[0];
                const last = session[session.length - 1];
                const startDt = new Date(`${first.date}T${first.startTime}`);
                const endDt = new Date(`${last.date}T${last.startTime}`);
                dayDurationSeconds += (endDt - startDt) / 1000;
            });
            const dayDurationMinutes = Math.round(dayDurationSeconds / 60);

            // --- Средний лимит дня ---
            let totalHands = 0;
            let weightedLimit = 0;
            day.hands.forEach(hand => {
                const limitValue = parseInt(hand.limit.replace('NL', '')) || 0;
                weightedLimit += limitValue;
                totalHands++;
            });
            const avgLimit = totalHands > 0 ? (weightedLimit / totalHands) : 0;
            const avgLimitDisplay = Math.round(avgLimit);
            const avgLimitCopy = avgLimit.toFixed(2);

            // --- Период дня ---
            const allDates = new Set();
            day.hands.forEach(hand => {
                allDates.add(hand.date);
            });
            const sortedDates = [...allDates].sort();
            const startDate = sortedDates[0];
            const endDate = sortedDates[sortedDates.length - 1];

            const startParts = startDate.split('-');
            const endParts = endDate.split('-');
            const startDisplay = `${startParts[2]}.${startParts[1]}.${startParts[0]}`;
            const endDisplay = `${endParts[2]}.${endParts[1]}.${endParts[0]}`;
            const dateRange = startDate === endDate ? startDisplay : `${startDisplay} - ${endDisplay}`;

            // --- Заголовок дня ---
            const dayHeader = document.createElement('div');
            dayHeader.className = 'tree-day-header';
            dayHeader.dataset.date = day.date;
            dayHeader.innerHTML = `
                    <div class="day-info">
                        <span class="date">📅 ${dateRange}</span>
                        <span class="pill avg-limit" data-copy="${avgLimitCopy}">NL${avgLimitDisplay}</span>
                        <span class="pill hands" data-copy="${day.hands.length}">${day.hands.length} рук</span>
                        <span class="pill duration" data-copy="${dayDurationMinutes}">${dayDurationMinutes} мин</span>
                        <span class="profit ${profitClass}">${Stats.formatMoney(dayProfit, currency)}</span>
                    </div>
                    <span class="toggle-icon">▶</span>
                `;

            // --- Клик по пилюлям дня ---
            const dayAvgPill = dayHeader.querySelector('.pill.avg-limit');
            if (dayAvgPill) {
                dayAvgPill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copyToClipboard(dayAvgPill.dataset.copy, dayAvgPill);
                });
            }
            const dayHandsPill = dayHeader.querySelector('.pill.hands');
            if (dayHandsPill) {
                dayHandsPill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copyToClipboard(dayHandsPill.dataset.copy, dayHandsPill);
                });
            }
            const dayDurationPill = dayHeader.querySelector('.pill.duration');
            if (dayDurationPill) {
                dayDurationPill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copyToClipboard(dayDurationPill.dataset.copy, dayDurationPill);
                });
            }

            // --- Сессии ---
            const sessionsDiv = document.createElement('div');
            sessionsDiv.className = 'tree-sessions';

            day.sessions.forEach((session, index) => {
                if (session.length === 0) return;

                // Прибыль сессии
                const sessionProfit = session.reduce((sum, h) => {
                    const player = h.players.find(p => p.name === this.selectedPlayer);
                    return sum + (player ? player.result : 0);
                }, 0);
                const sProfitClass = sessionProfit > 0 ? 'positive' : (sessionProfit < 0 ? 'negative' : 'zero');

                // Время начала и конца
                const firstHand = session[0];
                const lastHand = session[session.length - 1];
                const timeStart = firstHand.startTime.substring(0, 5);
                const timeEnd = lastHand.startTime.substring(0, 5);

                // Длительность сессии
                const startDt = new Date(`${firstHand.date}T${firstHand.startTime}`);
                const endDt = new Date(`${lastHand.date}T${lastHand.startTime}`);
                const durationMinutes = Math.round((endDt - startDt) / 60000);

                // --- Средний лимит сессии ---
                let sessionTotalHands = 0;
                let sessionWeightedLimit = 0;
                session.forEach(hand => {
                    const limitValue = parseInt(hand.limit.replace('NL', '')) || 0;
                    sessionWeightedLimit += limitValue;
                    sessionTotalHands++;
                });
                const sessionAvgLimit = sessionTotalHands > 0 ? (sessionWeightedLimit / sessionTotalHands) : 0;
                const sessionAvgLimitDisplay = Math.round(sessionAvgLimit);
                const sessionAvgLimitCopy = sessionAvgLimit.toFixed(2);

                // --- Элемент сессии ---
                const sessionItem = document.createElement('div');
                sessionItem.className = 'tree-session';
                sessionItem.dataset.day = day.date;
                sessionItem.dataset.sessionIndex = index;
                sessionItem.innerHTML = `
                        <div class="session-info">
                            <span class="time">⏱ ${timeStart} — ${timeEnd}</span>
                            <span class="pill avg-limit" data-copy="${sessionAvgLimitCopy}">NL${sessionAvgLimitDisplay}</span>
                            <span class="pill hands" data-copy="${session.length}">${session.length} рук</span>
                            <span class="pill duration" data-copy="${durationMinutes}">${durationMinutes} мин</span>
                            <span class="profit ${sProfitClass}">${Stats.formatMoney(sessionProfit, currency)}</span>
                        </div>
                    `;

                // --- Клик по пилюлям сессии ---
                const sAvgPill = sessionItem.querySelector('.pill.avg-limit');
                if (sAvgPill) {
                    sAvgPill.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.copyToClipboard(sAvgPill.dataset.copy, sAvgPill);
                    });
                }
                const sHandsPill = sessionItem.querySelector('.pill.hands');
                if (sHandsPill) {
                    sHandsPill.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.copyToClipboard(sHandsPill.dataset.copy, sHandsPill);
                    });
                }
                const sDurationPill = sessionItem.querySelector('.pill.duration');
                if (sDurationPill) {
                    sDurationPill.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.copyToClipboard(sDurationPill.dataset.copy, sDurationPill);
                    });
                }

                // Клик по сессии — показываем раздачи
                sessionItem.addEventListener('click', (e) => {
                    if (e.target.closest('.pill')) return;

                    document.querySelectorAll('.tree-session').forEach(el => el.classList.remove('active'));
                    sessionItem.classList.add('active');

                    const sessionDateParts = firstHand.date.split('-');
                    const sessionShortDate = `${sessionDateParts[2]}.${sessionDateParts[1]}`;
                    this.showHands(session, `Сессия ${timeStart}-${timeEnd} (${sessionShortDate})`);
                    this.selectedDay = day.date;
                    this.selectedSession = index;
                });

                sessionsDiv.appendChild(sessionItem);
            });

            // Клик по дню — раскрытие сессий
            dayHeader.addEventListener('click', (e) => {
                if (e.target.closest('.pill')) return;

                const isOpen = sessionsDiv.classList.contains('open');

                document.querySelectorAll('.tree-sessions').forEach(el => {
                    if (el !== sessionsDiv) {
                        el.classList.remove('open');
                        el.parentElement.querySelector('.toggle-icon')?.classList.remove('open');
                    }
                });

                if (isOpen) {
                    sessionsDiv.classList.remove('open');
                    dayHeader.querySelector('.toggle-icon').classList.remove('open');
                    this.showHands(day.hands, `Все раздачи ${dateRange}`);
                } else {
                    sessionsDiv.classList.add('open');
                    dayHeader.querySelector('.toggle-icon').classList.add('open');
                    document.querySelectorAll('.tree-session').forEach(el => el.classList.remove('active'));
                    this.showHands(day.hands, `Все раздачи ${dateRange}`);
                    this.selectedDay = day.date;
                    this.selectedSession = null;
                }
            });

            dayDiv.appendChild(dayHeader);
            dayDiv.appendChild(sessionsDiv);
            container.appendChild(dayDiv);
        });

        // Восстанавливаем выбранный день/сессию
        if (this.selectedDay) {
            const dayHeaders = container.querySelectorAll('.tree-day-header');
            dayHeaders.forEach((header) => {
                if (header.dataset.date === this.selectedDay) {
                    header.click();
                    if (this.selectedSession !== null) {
                        const sessions = header.parentElement.querySelectorAll('.tree-session');
                        if (sessions[this.selectedSession]) {
                            sessions[this.selectedSession].click();
                        }
                    }
                }
            });
        } else {
            const firstDay = container.querySelector('.tree-day-header');
            if (firstDay) {
                firstDay.click();
            }
        }
    },

    showHands(hands, title) {
        const tbody = document.getElementById('handsBody');
        const titleSpan = document.getElementById('handsPanelTitle');
        const countSpan = document.getElementById('handsCount');

        if (!tbody) return;

        titleSpan.textContent = `📋 ${title}`;
        countSpan.textContent = `${hands.length} раздач`;

        if (hands.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-message">Нет раздач</td></tr>';
            return;
        }

        const currency = this.getCurrency();

        const sorted = [...hands].sort((a, b) => {
            return b.startTime.localeCompare(a.startTime);
        });

        tbody.innerHTML = '';
        sorted.forEach(hand => {
            const player = hand.players.find(p => p.name === this.selectedPlayer);
            const result = player ? player.result : 0;

            const opponents = hand.players
                .filter(p => p.name !== this.selectedPlayer)
                .map(p => p.name)
                .join(', ');

            const resultClass = result > 0 ? 'positive' : (result < 0 ? 'negative' : 'zero');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td>${hand.startTime.substring(0, 5)}</td>
                    <td>${hand.limit}</td>
                    <td>${opponents || '-'}</td>
                    <td class="result ${resultClass}">${Stats.formatMoney(result, currency)}</td>
                `;
            tbody.appendChild(tr);
        });

        const wrapper = tbody.closest('.table-wrapper');
        if (wrapper) {
            wrapper.scrollTop = 0;
        }
    },

    showEmptyState(message = 'Нет данных') {
        const currency = this.getCurrency();

        document.getElementById('totalHands').textContent = '0';
        document.getElementById('totalTime').textContent = '0ч 0м';
        document.getElementById('bb100').textContent = '0.0';
        document.getElementById('totalProfit').textContent = `${currency}0.00`;

        document.getElementById('opponentsList').innerHTML = `<p class="empty-message">${message}</p>`;

        document.getElementById('daysTree').innerHTML = `<p class="empty-message">${message}</p>`;
        document.getElementById('totalDaysCount').textContent = '0 дней';

        document.getElementById('handsPanelTitle').textContent = '📋 Раздачи';
        document.getElementById('handsCount').textContent = '0 раздач';

        const tbody = document.getElementById('handsBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-message">${message}</td></tr>`;
        }

        Charts.updateCapital([], '', 'hands');
    },

    async clearAllData() {
        const confirmed = confirm(
            '⚠️ ВНИМАНИЕ!\n\n' +
            'Вы уверены, что хотите удалить ВСЕ данные?\n' +
            'Это действие НЕЛЬЗЯ отменить.\n\n' +
            `Всего раздач: ${this.allHands.length}`
        );

        if (!confirmed) return;

        try {
            await DB.clear();
            console.log('✅ База данных очищена');

            this.allHands = [];
            this.allPlayers = [];
            this.allLimits = [];
            this.selectedPlayer = '';
            this.selectedLimits = [];

            this.updatePlayerSelect();
            this.updateLimitFilter();
            this.showEmptyState('Данные очищены. Загрузите новые файлы.');

            Charts.updateCapital([], '', 'hands');

            document.getElementById('selectedFolder').style.display = 'none';

            alert('✅ Все данные успешно очищены!');

        } catch (e) {
            console.error('❌ Ошибка очистки:', e);
            alert('Ошибка при очистке данных. Проверьте консоль.');
        }
    },

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
    },

    applyTheme() {
        const themeLink = document.getElementById('theme-style');
        const toggleBtn = document.getElementById('themeToggle');

        if (this.theme === 'dark') {
            themeLink.href = 'css/dark.css';
            document.documentElement.removeAttribute('data-theme');
            if (toggleBtn) toggleBtn.textContent = '🌙';
        } else {
            themeLink.href = 'css/light.css';
            document.documentElement.setAttribute('data-theme', 'light');
            if (toggleBtn) toggleBtn.textContent = '☀️';
        }

        Charts.updateColors(this.theme === 'dark');
        localStorage.setItem('theme', this.theme);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
        App.theme = savedTheme;
    }

    await App.init();
});