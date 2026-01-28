// --- INITIAL DATA & STATE ---
const CONFIG = {
    ADMIN_PIN: "1331",
    PASSWORDS: {
        "2018": "Losleones",
        "2019": "Losdragones",
        "2020": "Topojavipocho"
    },
    ROADMAP_2019: {
        "1-2": "Coordinación motriz, agilidad, traslado de pelota.",
        "3-4": "Control de pelota, salida desde abajo, toco y voy.",
        "5-6": "Uso del espacio, roles, juego en equipo, rondo, definición.",
        "8-9": "Transiciones, 2 vs 1, pase filtrado, laterales, centro atrás.",
        "10-12": "Juego aéreo, segunda pelota."
    }
};

let state = {
    user: null, // { category: '2019', role: 'parent/admin' }
    currentScreen: 'home',
    agendaTab: 'cronograma', // 'cronograma' or 'partidos'
    data: {
        "2018": { players: [], agenda: {}, stats: {} },
        "2019": { players: [], agenda: {}, stats: {} },
        "2020": { players: [], agenda: {}, stats: {} },
        "shared": { matches: [] }
    },
    selectedWeek: 1,
    listaTab: 'toma', // 'toma' or 'stats'
    currentSession: 1 // Stores the week number for attendance
};

// --- CORE UTILS ---

function getCurrentWeek() {
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function getMonthFromWeek(week) {
    // Rough estimate for month
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthIdx = Math.floor((week - 1) / 4.3);
    return months[Math.min(monthIdx, 11)];
}

function getRoadmapForWeek(category, week) {
    if (category !== '2019') return "Agenda vacía";
    const month = Math.floor((week - 1) / 4.3) + 1;
    if (month <= 2) return CONFIG.ROADMAP_2019["1-2"];
    if (month <= 4) return CONFIG.ROADMAP_2019["3-4"];
    if (month <= 6) return CONFIG.ROADMAP_2019["5-6"];
    if (month <= 7) return "Receso / Entrenamiento libre";
    if (month <= 9) return CONFIG.ROADMAP_2019["8-9"];
    return CONFIG.ROADMAP_2019["10-12"];
}

function saveData() {
    // backup local (por ahora no lo sacamos)
    localStorage.setItem('wilcoop_data', JSON.stringify(state.data));

    // guardado en Firebase
    if (window.currentCategory) {
        saveDataFirebase(window.currentCategory, state.data);
    }
}

function loadData() {
    if (window.currentCategory) {
        loadDataFirebase(window.currentCategory, (data) => {
            if (data) {
                state.data = data;
            } else {
                const saved = localStorage.getItem('wilcoop_data');
                if (saved) {
                    state.data = JSON.parse(saved);
                }
            }
            renderAll();
        });
    }
}
        // Ensure structure for categories and shared data
        ["2018", "2019", "2020"].forEach(cat => {
            if (!state.data[cat]) state.data[cat] = { players: [], agenda: {}, stats: {} };
        });
        if (!state.data.shared) state.data.shared = { matches: [] };
    } else {
        state.data.shared = { matches: [] };
        // Template Agenda from images (W1 - W44)
        const templateAgenda = {
            1: { title: "Adaptación", dates: "27, 29 Ene", day1: "Circuito Coordinación + Traslado (Colores)", day2: "1 VS 1" },
            2: { title: "Coordinación Motriz", dates: "3, 5 Feb", day1: "Circuito Coordinación + Traslado (Conos)", day2: "1 VS 1" },
            3: { title: "Agilidad y Reacción", dates: "10, 12 Feb", day1: "Circuito Coordinación + Traslado (Colores)", day2: "1 VS 1" },
            4: { title: "Coordinación avanzada", dates: "19 Feb*", day1: "Circuito + Traslado (Conos) (*17/02 Feriado)", day2: "1 VS 1" },
            5: { title: "Iniciación a la Pisada", dates: "24, 26 Feb", day1: "Circuito Coordinación + Pivotear", day2: "1 VS 1 -> 3 VS 2" },
            6: { title: "Técnica de Pisada", dates: "3, 5 Mar", day1: "Pivotear + Toco y Voy", day2: "3 VS 2" },
            7: { title: "Control y Pase", dates: "10, 12 Mar", day1: "Pivotear + Toco y Voy", day2: "3 VS 2" },
            8: { title: "Perfilación", dates: "17, 19 Mar", day1: "Pivotear + Pase filtrado (inic.)", day2: "3 VS 2" },
            9: { title: "Control en movimiento", dates: "26 Mar*", day1: "Pivotear + Traslado Conos (*24/03 Feriado)", day2: "3 VS 2" },
            10: { title: "Salida desde fondo", dates: "31, 2 Abr*", day1: "Pivotear + Toco y Voy (*02/04 Feriado)", day2: "3 VS 2" },
            11: { title: "Definición Técnica", dates: "7, 9 Abr", day1: "Definición Cara Interna + Toco y Voy", day2: "3 VS 2 -> 5 VS 4" },
            12: { title: "Precisión de Remate", dates: "14, 16 Abr", day1: "Definición Cara Interna + Pase filtrado", day2: "5 VS 4 (Libre)" },
            13: { title: "Salida y Traslado", dates: "21, 23 Abr", day1: "Traslado Conos + Pivotear", day2: "5 VS 4 (Libre)" },
            14: { title: "Control Orientado", dates: "28, 30 Abr", day1: "Toco y Voy + Definición Cara Interna", day2: "5 VS 4 (Libre)" },
            15: { title: "Juego en Equipo", dates: "5, 7 May", day1: "Pase y Recepción Grupal (1 bola) + Rondo", day2: "5 VS 4 (Libre)" },
            16: { title: "Reacción Grupal", dates: "12, 14 May", day1: "Pase Grupal (2 bolas) + Rondo (2 toques)", day2: "5 VS 4 (Libre)" },
            17: { title: "Posesión", dates: "19, 21 May", day1: "Rondo (1 toque) + Definición Cara Interna", day2: "5 VS 4 (Libre)" },
            18: { title: "Roles y Espacio", dates: "26, 28 May", day1: "Pase Grupal (3 bolas) + Rondo", day2: "5 VS 4 (Libre)" },
            19: { title: "Visión Periférica", dates: "2, 4 Jun", day1: "Rondo (pierna cambiada) + Pivotear", day2: "5 VS 4 (Libre)" },
            20: { title: "Ocupación de Espacio", dates: "9, 11 Jun", day1: "Pase Grupal + Definición Cara Interna", day2: "5 VS 4 (Libre)" },
            21: { title: "Marcaje", dates: "16, 18 Jun", day1: "Rondo + Traslado (Colores)", day2: "5 VS 4 (Libre)" },
            22: { title: "Técnica de Salida", dates: "23, 25 Jun", day1: "Toco y Voy + Pivotear", day2: "5 VS 4 (Libre)" },
            23: { title: "Repaso Etapa 1", dates: "30, 2 Jul", day1: "Circuito Integrado (Todos los ejercicios)", day2: "5 VS 4 (Libre)" },
            24: { title: "Juegos Recreativos", dates: "7 Jul*", day1: "Jornada de partidos reducidos (*09/07 Feriado)", day2: "5 VS 4 (Libre)" },
            25: { title: "Cierre Pre-Receso", dates: "14, 16 Jul", day1: "Definición Cara Interna + Partidos", day2: "5 VS 4 (Libre)" },
            26: { title: "Cambio de Chip", dates: "4, 6 Ago", day1: "2 VS 1 (Obligatorio pase) + Toco y voy", day2: "1 VS 1 -> 3 VS 2" },
            27: { title: "Transición Rápida", dates: "11, 13 Ago", day1: "2 VS 1 + Pase Filtrado", day2: "3 VS 2" },
            28: { title: "Contraataque", dates: "18, 20 Ago", day1: "Pase Filtrado + Definición Cara Interna", day2: "5 VS 4 (Libre)" },
            29: { title: "Resolución 2v1", dates: "25, 27 Ago", day1: "2 VS 1 + Traslado Conos", day2: "5 VS 4 (Libre)" },
            30: { title: "Saque Lateral", dates: "1, 3 Sep", day1: "Laterales con Compañero + Centro Atrás", day2: "5 VS 4 (Libre)" },
            31: { title: "Laterales y Centro", dates: "8, 10 Sep", day1: "Laterales con Compañero + Centro Atrás", day2: "5 VS 4 (Libre)" },
            32: { title: "Estrategia de Banda", dates: "15, 17 Sep", day1: "Centro Atrás + Rondo", day2: "5 VS 4 (Libre)" },
            33: { title: "Definición por Banda", dates: "22, 24 Sep", day1: "Centro Atrás + 2 VS 1", day2: "5 VS 4 (Libre)" },
            34: { title: "Repaso Estrategia", dates: "29, 1 Oct*", day1: "Laterales + Centro Atrás", day2: "5 VS 4 (Libre)" },
            35: { title: "Iniciación Aérea", dates: "6, 8 Oct", day1: "Iniciación con Globos + Traslado Colores", day2: "1 VS 1" },
            36: { title: "Salto y Cabeceo", dates: "13, 15 Oct", day1: "Rechazo de Frente (Postes) + Toco y voy", day2: "3 VS 2" },
            37: { title: "Rechazo", dates: "20, 22 Oct", day1: "Rechazo de Frente + Toco y voy", day2: "5 VS 4 (Libre)" },
            38: { title: "Perfiles (Frontal)", dates: "27, 29 Oct", day1: "Rechazo de Frente + Definición Cara Interna", day2: "5 VS 4 (Libre)" },
            39: { title: "Segunda Pelota", dates: "3, 5 Nov", day1: "Disputa de Rebote + Rondo", day2: "5 VS 4 (Libre)" },
            40: { title: "Anticipación", dates: "10, 12 Nov", day1: "Disputa de Rebote + Pase filtrado", day2: "5 VS 4 (Libre)" },
            41: { title: "Salida con Cabeceo", dates: "17, 19 Nov", day1: "Rechazo de Frente + Traslado Conos", day2: "5 VS 4 (Libre)" },
            42: { title: "Recobro Post-Saque", dates: "24, 26 Nov", day1: "Disputa de Rebote + Pivotear", day2: "5 VS 4 (Libre)" },
            43: { title: "Repaso General", dates: "1, 3 Dic", day1: "Circuito + 2 vs 1 + Centro Atrás", day2: "5 VS 4 (Libre)" },
            44: { title: "Cierre y Fiesta", dates: "10 Dic*", day1: "Jornada de recreación y premios (*08/12 Feriado)", day2: "5 VS 4 (Libre)" }
        };

        // Apply template to ALL categories
        Object.keys(CONFIG.PASSWORDS).forEach(cat => {
            state.data[cat] = {
                players: cat === "2019" ? [
                    { id: 1, name: "Mateo", lastName: "García", category: "2019", dob: "15/05/2019" },
                    { id: 2, name: "Thiago", lastName: "López", category: "2019", dob: "02/08/2019" },
                    { id: 3, name: "Benjamín", lastName: "Sosa", category: "2019", dob: "21/01/2019" }
                ] : [],
                agenda: JSON.parse(JSON.stringify(templateAgenda)), // Deep clone template
                stats: {}
            };
        });

        saveData();
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- APP LOGIC ---

function init() {
    loadData();
    setupEventListeners();
    checkSession();
}

function checkSession() {
    const session = sessionStorage.getItem('wilcoop_session');
    if (session) {
        state.user = JSON.parse(session);
        renderMainLayout();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-layout').classList.add('hidden');
}

function renderMainLayout() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-layout').classList.remove('hidden');
    document.getElementById('display-category').textContent = `Categoría ${state.user.category}`;
    document.getElementById('display-role').textContent = state.user.role === 'admin' ? 'Modo Administrador' : 'Modo Visualización';

    navigateTo(state.currentScreen);
}

function navigateTo(screenId) {
    state.currentScreen = screenId;
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screenId);
    });

    renderScreen(screenId);
}

function renderScreen(screenId) {
    const container = document.getElementById('content-area');
    const categoryData = state.data[state.user.category];

    switch (screenId) {
        case 'home':
            renderHome(container, categoryData);
            break;
        case 'agenda':
            renderAgenda(container, categoryData);
            break;
        case 'lista':
            renderLista(container, categoryData);
            break;
        case 'plantel':
            renderPlantel(container, categoryData);
            break;
        case 'stats':
            renderStats(container, categoryData);
            break;
    }
}

// --- SCREEN RENDERS ---

function renderHome(container, data) {
    container.innerHTML = `
        <div class="card">
            <h1 style="color:var(--primary); margin-bottom: 5px;">HOLA!</h1>
            <p style="color:var(--grey)">Bienvenido al panel del <span style="font-weight:bold; color:var(--primary)">WILCOOP</span>.</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-value">${data.players.length}</span>
                <span class="stat-label">Jugadores</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${Object.keys(data.agenda).length}</span>
                <span class="stat-label">Eventos</span>
            </div>
        </div>

        <h3 class="section-title">Accesos Rápidos</h3>
        <div class="quick-actions">
            <button class="action-btn" onclick="navigateTo('agenda')">
                <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5v-5z"/></svg>
                Agenda
            </button>
            <button class="action-btn" onclick="navigateTo('plantel')">
                <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                Plantel
            </button>
            <button class="action-btn" onclick="navigateTo('lista')">
                <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                Lista
            </button>
        </div>

        ${renderNextMatchWidget()}
    `;
}

function renderNextMatchWidget() {
    const matches = state.data.shared.matches || [];
    if (matches.length === 0) return '';

    // Sort logic: Get the latest one added as "Next Match" for the demo
    const nextMatch = matches[matches.length - 1];

    return `
        <h3 class="section-title" style="margin-top: 25px;">Próximo Partido</h3>
        <div class="team-stats-card" style="padding: 30px; margin-bottom: 10px; text-align: left; background: linear-gradient(135deg, var(--primary) 0%, #001f3d 100%);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 0.7rem; font-weight: 800; letter-spacing: 2px; opacity: 0.7;">${nextMatch.round || 'FECHA N° -'}</span>
                <span class="pill pill-green" style="font-size: 0.6rem; background: rgba(72, 187, 120, 0.2); color: #fff;">CONFIRMADO</span>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 15px 0;">
                <div style="text-align: center; flex: 1;">
                    <div style="font-weight: 800; font-size: 1.2rem;">WILCOOP</div>
                </div>
                <div style="font-family: 'Bebas Neue'; font-size: 1.5rem; opacity: 0.5;">VS</div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-weight: 800; font-size: 1.2rem;">${nextMatch.rival.toUpperCase()}</div>
                </div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; opacity: 0.8;">
                <span style="display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    ${nextMatch.date}
                </span>
                <span style="display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    ${nextMatch.location}
                </span>
            </div>
        </div>
    `;
}

function renderAgenda(container, data) {
    container.innerHTML = `
        <div class="lista-tabs">
            <button class="tab-btn ${state.agendaTab === 'cronograma' ? 'active' : ''}" onclick="setAgendaTab('cronograma')">Cronograma Anual</button>
            <button class="tab-btn ${state.agendaTab === 'partidos' ? 'active' : ''}" onclick="setAgendaTab('partidos')">Partidos</button>
        </div>

        <div id="agenda-content">
            ${state.agendaTab === 'cronograma' ? renderCronogramaContent(data) : renderPartidosContent()}
        </div>

        <div id="modal-container"></div>
    `;
}

function setAgendaTab(tab) {
    state.agendaTab = tab;
    renderScreen('agenda');
}

function renderCronogramaContent(data) {
    return `
        <div class="section-title">
            <h1 style="font-size: 2.22rem; margin-bottom: 20px; font-weight: 800; color: var(--primary);">Cronograma Anual</h1>
        </div>
        
        <div class="annual-grid">
            ${Array.from({ length: 52 }, (_, i) => i + 1).map(w => {
        const weekData = data.agenda[w] || {};
        return `
                    <div class="annual-card" onclick="openWeekDetail(${w})">
                        <span class="week-tag">W${w}</span>
                        <h4>${weekData.title || "Sin Título"}</h4>
                        <div class="date-pill">${weekData.dates || "Sin Fecha"}</div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function renderPartidosContent() {
    const isAdmin = state.user.role === 'admin';
    const matches = state.data.shared.matches || [];

    return `
        <div class="section-title">
            <h1 style="font-size: 2.22rem; margin-bottom: 20px; font-weight: 800; color: var(--primary);">Partidos</h1>
            ${isAdmin ? `<button onclick="showMatchForm()" class="btn-primary" style="padding: 10px 20px; font-size:0.8rem; width: auto; border-radius: 30px;">+ CARGAR PARTIDO</button>` : ''}
        </div>

        <div id="match-form-container" class="card hidden" style="background:#F1F4F9; border-radius: 30px; padding: 25px; margin-bottom: 20px;">
            <h3 style="margin-bottom: 20px; color: var(--primary);">Programar Partido</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div class="app-form-group">
                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">N° Fecha</label>
                    <input type="text" id="m-round" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;" placeholder="Ej: Fecha 1">
                </div>
                <div class="app-form-group">
                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">Rival</label>
                    <input type="text" id="m-rival" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;" placeholder="Nombre...">
                </div>
            </div>
            <div class="app-form-group" style="margin-bottom: 15px;">
                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">Fecha / Hora</label>
                <input type="text" id="m-date" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;" placeholder="Ej: Sáb 20/05 - 10:00hs">
            </div>
            <div class="app-form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">Cancha / Dirección</label>
                <input type="text" id="m-location" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;" placeholder="Ej: Local o Dirección...">
            </div>
            <div id="m-edit-id" style="display:none"></div>
            <div class="modal-btns">
                <button onclick="hideMatchForm()" class="btn-outline" style="border-radius: 20px;">Cancelar</button>
                <button onclick="saveMatch()" class="btn-primary" style="border-radius: 20px;">Guardar Partido</button>
            </div>
        </div>

        <div class="matches-list">
            ${matches.length === 0 ? '<p style="text-align:center; color:var(--grey); padding:40px;">No hay partidos programados.</p>' : ''}
            ${matches.slice().sort((a, b) => b.id - a.id).map(m => `
                <div class="attendance-card" style="padding: 20px 25px; align-items: flex-start; flex-direction: column; gap:10px;">
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                        <span class="pill pill-green" style="font-size: 0.65rem;">${m.round || 'PRÓXIMO PARTIDO'}</span>
                        ${isAdmin ? `
                            <div style="display:flex; gap:8px;">
                                <button onclick="editMatch(${m.id})" class="btn-icon" style="color:var(--primary); background:#F1F4F9; transform: scale(0.8); width:32px; height:32px;">✎</button>
                                <button onclick="deleteMatch(${m.id})" class="btn-icon" style="color:var(--highlight); background:#FFF5F7; transform: scale(0.8); width:32px; height:32px;">✕</button>
                            </div>
                        ` : ''}
                    </div>
                    <div style="font-weight: 800; font-size: 1.4rem; color: var(--primary);">${m.rival}</div>
                    <div style="display:flex; gap:15px; color: var(--grey); font-weight: 600; font-size: 0.9rem;">
                        <span style="display:flex; align-items:center; gap:5px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${m.date}
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px; color: var(--grey); font-weight: 600; font-size: 0.9rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${m.location}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showMatchForm() {
    document.getElementById('match-form-container').classList.remove('hidden');
    document.getElementById('m-rival').value = '';
    document.getElementById('m-date').value = '';
    document.getElementById('m-round').value = '';
    document.getElementById('m-location').value = '';
    document.getElementById('m-edit-id').innerText = '';
}

function hideMatchForm() {
    document.getElementById('match-form-container').classList.add('hidden');
}

function saveMatch() {
    const rival = document.getElementById('m-rival').value;
    const date = document.getElementById('m-date').value;
    const round = document.getElementById('m-round').value;
    const location = document.getElementById('m-location').value;
    const editId = document.getElementById('m-edit-id').innerText;

    if (!rival) return showToast("El nombre del rival es obligatorio");

    const matches = state.data.shared.matches;

    if (editId) {
        const idx = matches.findIndex(m => m.id == editId);
        matches[idx] = { ...matches[idx], rival, date, round, location };
    } else {
        matches.push({ id: Date.now(), rival, date, round, location });
    }

    saveData();
    hideMatchForm();
    renderScreen('agenda');
    showToast("Partido guardado");
}

function editMatch(id) {
    const m = state.data.shared.matches.find(x => x.id == id);
    showMatchForm();
    document.getElementById('m-rival').value = m.rival;
    document.getElementById('m-date').value = m.date;
    document.getElementById('m-round').value = m.round || '';
    document.getElementById('m-location').value = m.location;
    document.getElementById('m-edit-id').innerText = id;
}

function deleteMatch(id) {
    if (!confirm("¿Eliminar partido?")) return;
    state.data.shared.matches = state.data.shared.matches.filter(m => m.id !== id);
    saveData();
    renderScreen('agenda');
}

function openWeekDetail(w) {
    const data = state.data[state.user.category];
    const weekData = data.agenda[w] || { title: "", dates: "", day1: "", day2: "" };
    const isAdmin = state.user.role === 'admin';
    const container = document.getElementById('modal-container');

    container.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target === this) closeWeekDetail()">
            <div class="detail-modal">
                <button class="modal-close" onclick="closeWeekDetail()">✕</button>
                
                <div class="detail-header">
                    <div class="week-info">
                        W${w} • ${weekData.dates || "SIN FECHA"}
                    </div>
                    ${isAdmin ?
            `<input type="text" id="edit-title" class="block-input" style="font-size: 2rem; border-bottom: 1px solid #eee; margin-bottom: 5px;" value="${weekData.title || ""}" placeholder="Título (Ej: Adaptación)">` :
            `<h2 style="font-size: 2rem; font-weight: 800;">${weekData.title || "Sin Título"}</h2>`
        }
                    ${isAdmin ?
            `<input type="text" id="edit-dates" class="btn-text" style="text-decoration:none; margin-top:10px; color: var(--grey); font-weight: 700;" value="${weekData.dates || ""}" placeholder="Fechas (Ej: 27, 29 Ene)">` :
            ''
        }
                </div>

                <div class="training-blocks">
                    <div class="training-block block-blue">
                        <div class="block-tag">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                            TÉCNICA
                        </div>
                        <div class="block-content">
                            ${isAdmin ?
            `<textarea id="edit-day1" class="block-input" rows="2" placeholder="Detalle técnica...">${weekData.day1 || ""}</textarea>` :
            weekData.day1 || "No asignado"
        }
                        </div>
                    </div>

                    <div class="training-block block-orange">
                        <div class="block-tag">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                            BLOQUE FINAL
                        </div>
                        <div class="block-content">
                             ${isAdmin ?
            `<textarea id="edit-day2" class="block-input" rows="2" placeholder="Detalle bloque final...">${weekData.day2 || ""}</textarea>` :
            weekData.day2 || "No asignado"
        }
                        </div>
                    </div>
                </div>

                ${isAdmin ? `
                    <button onclick="saveAnnualAgenda(${w})" class="btn-primary" style="margin-top:20px; border-radius: 30px; padding: 18px;">Actualizar Semana ${w}</button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.style.overflow = 'hidden';
}

function closeWeekDetail() {
    document.getElementById('modal-container').innerHTML = '';
    document.body.style.overflow = 'auto';
}

function saveAnnualAgenda(w) {
    const categoryData = state.data[state.user.category];
    if (!categoryData.agenda[w]) categoryData.agenda[w] = {};

    categoryData.agenda[w].title = document.getElementById('edit-title').value;
    categoryData.agenda[w].dates = document.getElementById('edit-dates').value;
    categoryData.agenda[w].day1 = document.getElementById('edit-day1').value;
    categoryData.agenda[w].day2 = document.getElementById('edit-day2').value;

    saveData();
    closeWeekDetail();
    showToast(`Semana ${w} actualizada`);
    renderScreen('agenda');
}

function renderLista(container, data) {
    container.innerHTML = `
        <div class="lista-tabs">
            <button class="tab-btn ${state.listaTab === 'toma' ? 'active' : ''}" onclick="setListaTab('toma')">Toma de Lista</button>
            <button class="tab-btn ${state.listaTab === 'stats' ? 'active' : ''}" onclick="setListaTab('stats')">Estadísticas</button>
        </div>

        <div id="lista-content">
            ${state.listaTab === 'toma' ? renderTomaDeLista(data) : renderEstadisticasContainer(data)}
        </div>

        <div id="picker-container"></div>
    `;
}

function setListaTab(tab) {
    state.listaTab = tab;
    renderScreen('lista');
}

function renderTomaDeLista(data) {
    const week = state.selectedWeek;
    const weekData = data.agenda[week] || { title: "Sin título", dates: "" };
    const listData = data.agenda[week]?.attendance || {};

    return `
        <div class="session-selector" onclick="openSessionPicker()">
            <span>W${week} - ${weekData.dates || "Sin fecha"}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div id="attendance-list">
            ${data.players.length === 0 ? '<p style="text-align:center; color:var(--grey); padding:20px;">No hay jugadores cargados.</p>' : ''}
            ${data.players.map(p => `
                <div class="attendance-card">
                    <div class="player-avatar">${p.name.charAt(0)}</div>
                    <div class="player-name-attendance">${p.name} ${p.lastName}</div>
                    <div class="check-circle ${listData[p.id] ? 'checked' : ''}" 
                         onclick="toggleAttendance(${p.id})">
                    </div>
                </div>
            `).join('')}
        </div>

        ${state.user.role === 'admin' && data.players.length > 0 ? `
            <button onclick="saveAttendance(${week})" class="btn-primary" style="margin-top:20px; border-radius: 30px; padding: 18px;">Confirmar Lista</button>
        ` : ''}
    `;
}

function renderEstadisticasContainer(data) {
    // Team stats calculation
    const totalTrainings = Object.values(data.agenda).filter(a => a.attendance).length || 1;
    const totalPlayers = data.players.length || 1;
    let totalPresences = 0;

    Object.values(data.agenda).forEach(a => {
        if (a.attendance) {
            Object.values(a.attendance).forEach(val => { if (val) totalPresences++; });
        }
    });

    const teamAttendancePercent = Math.round((totalPresences / (totalPlayers * totalTrainings)) * 100) || 0;
    const teamAbsencePercent = 100 - teamAttendancePercent;

    return `
        <div class="team-stats-card">
            <div class="stats-header">Rendimiento General del Equipo</div>
            <div class="stats-main">
                <div class="stat-big-box">
                    <div class="stat-big-val">${teamAttendancePercent}%</div>
                    <div class="stat-big-label">Asistencia Total</div>
                </div>
                <div class="stat-big-box" style="text-align: right;">
                    <div class="stat-big-val" style="color: var(--highlight)">${teamAbsencePercent}%</div>
                    <div class="stat-big-label">Faltas</div>
                </div>
            </div>
            <div class="stat-progress-bar">
                <div class="stat-progress-fill" style="width: ${teamAttendancePercent}%"></div>
            </div>
            <div class="stats-footer">Basado en ${totalTrainings} entrenamientos</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="font-size: 0.8rem; color: #CBD5E0; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Estadísticas por Niño</h3>
            <span style="font-size: 0.65rem; color: #CBD5E0; font-weight: 800; letter-spacing: 1px;">ASIS  /  FALT  /  TOT</span>
        </div>
        
        <div class="individual-stats">
            ${data.players.map(p => {
        let presences = 0;
        let sessionsWithRecord = 0;
        Object.values(data.agenda).forEach(a => {
            if (a.attendance) {
                sessionsWithRecord++;
                if (a.attendance[p.id]) presences++;
            }
        });
        const total = sessionsWithRecord || 0;
        const absences = total - presences;
        const asisPercent = total > 0 ? Math.round((presences / total) * 100) : 0;
        const faltPercent = 100 - asisPercent;

        return `
                    <div class="player-stat-card">
                        <div class="player-stat-top">
                            <div class="player-avatar">${p.name.charAt(0)}</div>
                            <div class="player-stat-info">
                                <span class="player-stat-name">${p.name}</span>
                                <span class="player-stat-name" style="font-size: 1rem; color: var(--grey);">${p.lastName}</span>
                            </div>
                            <div class="stat-pills">
                                <span class="pill pill-green">${asisPercent}%</span>
                                <span class="pill pill-orange">${faltPercent}%</span>
                            </div>
                        </div>
                        <div class="stat-grid-3">
                            <div class="stat-mini-box">
                                <span class="stat-mini-label">Presentes</span>
                                <span class="stat-mini-val">${presences}</span>
                            </div>
                            <div class="stat-mini-box">
                                <span class="stat-mini-label">Ausentes</span>
                                <span class="stat-mini-val" style="color: var(--highlight)">${absences}</span>
                            </div>
                            <div class="stat-mini-box">
                                <span class="stat-mini-label">Total</span>
                                <span class="stat-mini-val">${total}</span>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function openSessionPicker() {
    const data = state.data[state.user.category];
    const container = document.getElementById('picker-container');

    container.innerHTML = `
        <div class="picker-overlay" onclick="if(event.target === this) closePicker()">
            <div class="picker-modal">
                <div style="padding: 25px; border-bottom: 1px solid #F1F4F9; font-weight: 800; color: var(--primary); text-align: center;">Seleccionar Sesión</div>
                ${Object.keys(data.agenda).sort((a, b) => a - b).map(w => {
        const weekData = data.agenda[w];
        return `
                        <div class="picker-option" onclick="selectSession(${w})">
                            <span>W${w} - ${weekData.dates || "Sin fecha"}</span>
                            <div class="radio-circle ${state.selectedWeek == w ? 'selected' : ''}"></div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

function closePicker() {
    document.getElementById('picker-container').innerHTML = '';
}

function selectSession(w) {
    state.selectedWeek = w;
    closePicker();
    renderScreen('lista');
}

function renderPlantel(container, data) {
    container.innerHTML = `
        <div class="section-title">
            <h1 style="font-size: 2.22rem; margin-bottom: 20px; font-weight: 800; color: var(--primary);">Plantel</h1>
            <button onclick="showPlayerForm()" class="btn-primary" style="padding: 10px 20px; font-size:0.8rem; width: auto; border-radius: 30px;">+ AGREGAR</button>
        </div>

        <div id="player-form-container" class="card hidden" style="background:#F1F4F9; border-radius: 30px; padding: 25px;">
            <h3 style="margin-bottom: 20px; color: var(--primary);">Ficha de Jugador</h3>
            <div class="app-form-group" style="margin-bottom: 15px;">
                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">Nombre</label>
                <input type="text" id="p-name" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;">
            </div>
            <div class="app-form-group" style="margin-bottom: 15px;">
                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">Apellido</label>
                <input type="text" id="p-lastname" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;">
            </div>
            <div class="app-form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--grey); text-transform: uppercase; margin-bottom: 5px;">F. Nacimiento</label>
                <input type="date" id="p-dob" class="app-input" style="background: white; border: 1px solid #E2E8F0; border-radius: 15px; padding: 12px; width: 100%;">
            </div>
            <div id="p-edit-id" style="display:none"></div>
            <div class="modal-btns">
                <button onclick="hidePlayerForm()" class="btn-outline" style="border-radius: 20px;">Cancelar</button>
                <button onclick="savePlayer()" class="btn-primary" style="border-radius: 20px;">Guardar Jugador</button>
            </div>
        </div>

        <div id="players-list">
            ${data.players.map(p => `
                <div class="attendance-card" style="padding: 15px 25px;">
                    <div class="player-avatar">${p.name.charAt(0)}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">${p.name} ${p.lastName}</div>
                        <div style="font-size: 0.75rem; color: var(--grey); font-weight: 600;">${p.dob || 'Sin fecha'}</div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="editPlayer(${p.id})" class="btn-icon" style="color:var(--primary); background:#F1F4F9; transform: scale(0.9);">✎</button>
                        <button onclick="deletePlayer(${p.id})" class="btn-icon" style="color:var(--highlight); background:#FFF5F7; transform: scale(0.9);">✕</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderStats(container, data) {
    // Basic calculation
    const totalWeeksWithAttendance = Object.values(data.agenda).filter(a => a.attendance).length;
    const playerStats = data.players.map(p => {
        let presences = 0;
        let totalMinutes = 0;
        let matches = 0;

        Object.values(data.agenda).forEach(a => {
            if (a.attendance && a.attendance[p.id]) presences++;
            if (a.matchStats && a.matchStats[p.id]) {
                totalMinutes += parseInt(a.matchStats[p.id]);
                matches++;
            }
        });

        return { ...p, presences, totalMinutes, matches };
    });

    container.innerHTML = `
        <h3>Estadísticas Generales</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-value">${totalWeeksWithAttendance}</span>
                <span class="stat-label">Sem. Registradas</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${playerStats.reduce((sum, p) => sum + p.matches, 0)}</span>
                <span class="stat-label">Partidos Totales</span>
            </div>
        </div>

        <h3 style="margin-top:20px; margin-bottom:15px;">Estadísticas por Jugador</h3>
        <div class="card" style="padding:10px;">
            <table style="width:100%; font-size:0.8rem; border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:1px solid #eee; text-align:left;">
                        <th style="padding:10px;">Jugador</th>
                        <th style="text-align:center;">Asist.</th>
                        <th style="text-align:center;">Part.</th>
                        <th style="text-align:center;">Min.</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerStats.map(p => `
                        <tr style="border-bottom:1px solid #f9f9f9;">
                            <td style="padding:10px;">${p.name}</td>
                            <td style="text-align:center;">${p.presences}</td>
                            <td style="text-align:center;">${p.matches}</td>
                            <td style="text-align:center;">${p.totalMinutes}'</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// --- ACTIONS & HANDLERS ---

function setupEventListeners() {
    // Login Form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const cat = document.getElementById('category').value;
        const pass = document.getElementById('password').value;

    alert("Categoria seleccionada: [" + cat + "]");
    alert("Password ingresado: [" + pass + "]");

        if (validateLogin(cat, pass)) {
    state.user = { category: cat, role: 'parent' };
    sessionStorage.setItem('wilcoop_session', JSON.stringify(state.user));
    window.currentCategory = cat;
    loadData();
    renderMainLayout();
} else {
    showToast("Contraseña incorrecta");
}
    });

    // Admin Access
    document.getElementById('btn-admin-login').addEventListener('click', () => {
        document.getElementById('admin-modal').classList.remove('hidden');
    });

    document.getElementById('cancel-admin').addEventListener('click', () => {
        document.getElementById('admin-modal').classList.add('hidden');
    });

    document.getElementById('confirm-admin').addEventListener('click', () => {
        const pin = document.getElementById('admin-pin').value;
        const cat = document.getElementById('category').value;

        if (pin === CONFIG.ADMIN_PIN) {
            if (!cat) {
                showToast("Seleccione una categoría primero");
                return;
            }
            state.user = { category: cat, role: 'admin' };
            sessionStorage.setItem('wilcoop_session', JSON.stringify(state.user));
            document.getElementById('admin-modal').classList.add('hidden');
            renderMainLayout();
        } else {
            showToast("PIN Incorrecto");
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('wilcoop_session');
        state.user = null;
        showLogin();
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.screen);
        });
    });
}

function changeWeek(offset) {
    state.selectedWeek += offset;
    if (state.selectedWeek < 1) state.selectedWeek = 52;
    if (state.selectedWeek > 52) state.selectedWeek = 1;
    renderScreen(state.currentScreen);
}

// Attendance Manipulation (Temporary until saved)
const tempAttendance = {};
const tempMatchMinutes = {};

function toggleAttendance(playerId) {
    if (state.user.role !== 'admin') return;
    const week = state.selectedWeek;
    if (!state.data[state.user.category].agenda[week]) {
        state.data[state.user.category].agenda[week] = { attendance: {}, matchStats: {} };
    }
    const current = state.data[state.user.category].agenda[week].attendance[playerId];
    state.data[state.user.category].agenda[week].attendance[playerId] = !current;

    renderScreen('lista');
}

function toggleMatchMinute(playerId, mins) {
    if (state.user.role !== 'admin') return;
    const week = state.selectedWeek;
    if (!state.data[state.user.category].agenda[week]) {
        state.data[state.user.category].agenda[week] = { attendance: {}, matchStats: {} };
    }
    const current = state.data[state.user.category].agenda[week].matchStats[playerId];
    state.data[state.user.category].agenda[week].matchStats[playerId] = (current == mins) ? 0 : mins;

    renderScreen('lista');
}

function saveAttendance(week) {
    saveData();
    showToast("Asistencia guardada");
}

function saveAgenda(week) {
    const categoryData = state.data[state.user.category];
    if (!categoryData.agenda[week]) {
        categoryData.agenda[week] = { attendance: {}, matchStats: {} };
    }
    categoryData.agenda[week].practiceInfo = document.getElementById('practice-info').value;
    categoryData.agenda[week].training = document.getElementById('had-training').checked;
    categoryData.agenda[week].matchNote = document.getElementById('match-note').value;

    saveData();
    showToast("Agenda actualizada");
}

// Player Roster Actions
function showPlayerForm() {
    document.getElementById('player-form-container').classList.remove('hidden');
    document.getElementById('p-name').value = '';
    document.getElementById('p-lastname').value = '';
    document.getElementById('p-dob').value = '';
    document.getElementById('p-edit-id').innerText = '';
}

function hidePlayerForm() {
    document.getElementById('player-form-container').classList.add('hidden');
}

function savePlayer() {
    const name = document.getElementById('p-name').value;
    const lastName = document.getElementById('p-lastname').value;
    const dob = document.getElementById('p-dob').value;
    const editId = document.getElementById('p-edit-id').innerText;

    if (!name || !lastName) return showToast("Faltan datos");

    const players = state.data[state.user.category].players;

    if (editId) {
        const idx = players.findIndex(p => p.id == editId);
        players[idx] = { ...players[idx], name, lastName, dob };
    } else {
        const newPlayer = {
            id: Date.now(),
            name,
            lastName,
            dob,
            category: state.user.category
        };
        players.push(newPlayer);
    }

    saveData();
    hidePlayerForm();
    renderScreen('plantel');
    showToast("Jugador guardado");
}

function editPlayer(id) {
    const p = state.data[state.user.category].players.find(x => x.id == id);
    showPlayerForm();
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-lastname').value = p.lastName;
    document.getElementById('p-dob').value = p.dob;
    document.getElementById('p-edit-id').innerText = id;
}

function deletePlayer(id) {
    if (!confirm("¿Eliminar jugador?")) return;
    state.data[state.user.category].players = state.data[state.user.category].players.filter(p => p.id !== id);
    saveData();
    renderScreen('plantel');
}

// Start App
init();

// ==========================
// FIREBASE HELPERS
// ==========================

function saveDataFirebase(category, data) {
  return database
    .ref(`clubData/${category}`)
    .set(data);
}

function loadDataFirebase(category, callback) {
  database
    .ref(`clubData/${category}`)
    .once("value")
    .then(snapshot => {
      callback(snapshot.val());
    });
}

function validateLogin(category, password) {
    const passwords = {
        "2018": "Losleones",
        "2019": "Losdragones",
        "2020": "Topojavipocho"
    };
    return passwords[category] === password;
}