/**************************************************
 * CONFIG & STATE
 **************************************************/
const CONFIG = {
  ADMIN_PIN: "1331",
  PASSWORDS: {
    "2018": "Losleones",
    "2019": "Losdragones",
    "2020": "Topojavipocho"
  }
};

let state = {
  user: null,              // { category, role }
  currentScreen: "home",
  agendaTab: "cronograma",
  listaTab: "toma",
  selectedWeek: 1,

  selectedDate: null,

  data: {}
};

/**************************************************
 * INIT
 **************************************************/
function init() {
  setupEventListeners();
  checkSession();
}

function checkSession() {
  const session = sessionStorage.getItem("wilcoop_session");
  if (session) {
    state.user = JSON.parse(session);
    window.currentCategory = state.user.category;
    loadData();
  } else {
    showLogin();
  }
}

/**************************************************
 * LOGIN
 **************************************************/
function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("main-layout").classList.add("hidden");
}

function renderMainLayout() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-layout").classList.remove("hidden");

  document.getElementById("display-category").textContent =
    `Categoría ${state.user.category}`;

  document.getElementById("display-role").textContent =
    state.user.role === "admin" ? "Modo Administrador" : "Modo Profesor";

  // SIEMPRE arrancar en INICIO
  state.currentScreen = "home";
  navigateTo("home");
}
/**************************************************
 * DATA
 **************************************************/
function loadData() {
  loadDataFirebase((data) => {
    state.data = data || {};
    ensureDataStructure();
    ensureAgendaTemplate();
    renderMainLayout();
  });
}

function saveData() {
  localStorage.setItem("wilcoop_data", JSON.stringify(state.data));
  saveDataFirebase(state.data);
}

function ensureDataStructure() {
  ["2018", "2019", "2020"].forEach(cat => {
    if (!state.data[cat]) {
      state.data[cat] = {};
    }

    if (!state.data[cat].players) {
      state.data[cat].players = [];
    }

    if (!state.data[cat].agenda) {
      state.data[cat].agenda = {};
    }

    if (!state.data[cat].attendance) {
      state.data[cat].attendance = {}; 
      // formato: { "2026-01-27": { playerId: true } }
    }

    if (!state.data[cat].matches) {
      state.data[cat].matches = [];
      // { date, rival, goals: { playerId: number } }
    }

    if (!state.data[cat].stats) {
      state.data[cat].stats = {};
    }
  });
}

function getAttendanceForDay(date) {
  const cat = state.user.category;

  if (!state.data[cat].attendance[date]) {
    state.data[cat].attendance[date] = {};
  }

  return state.data[cat].attendance[date];
}

/**************************************************
 * AGENDA BASE (UNA SOLA VEZ)
 **************************************************/
function ensureAgendaTemplate() {
  const templateAgenda = {
    1: { title: "Adaptación", dates: "27, 29 Ene", day1: "", day2: "" },
    2: { title: "Coordinación", dates: "3, 5 Feb", day1: "", day2: "" },
    3: { title: "Agilidad", dates: "10, 12 Feb", day1: "", day2: "" },
    4: { title: "Técnica", dates: "19 Feb", day1: "", day2: "" }
  };

  ["2018", "2019", "2020"].forEach(cat => {
    if (!state.data[cat].agenda || Object.keys(state.data[cat].agenda).length === 0) {
      state.data[cat].agenda = JSON.parse(JSON.stringify(templateAgenda));
    }
  });

  saveData();
}

/**************************************************
 * NAVIGATION
 **************************************************/
function navigateTo(screen) {
  state.currentScreen = screen;

  // activar botón correcto
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });

  // LIMPIAR CONTENIDO ANTERIOR (CLAVE)
  const container = document.getElementById("content-area");
  container.innerHTML = "";

  // renderizar pantalla
  renderScreen(screen);
}

function renderScreen(screen) {
  const container = document.getElementById("content-area");
  const data = state.data[state.user.category];

 
  container.innerHTML = "";

  switch (screen) {
    case "home":
      renderHome(container, data);
      break;
    case "agenda":
      renderAgenda(container, data);
      break;
    case "lista":
      renderLista(container, data);
      break;
    case "plantel":
      renderPlantel(container, data);
      break;
    case "stats":
      renderStats(container, data);
      break;
  }
}
/**************************************************
 * SCREENS
 **************************************************/
function renderHome(container, data) {
  const isAdmin = state.user.role === "admin";

  // Próximo partido (si existe)
  const nextMatch = (data.matches || [])[0];

  container.innerHTML = `
    <section class="section">
      <h2>Inicio</h2>

      <div class="card">
        <h3>Categoría ${state.user.category}</h3>
        <p>${isAdmin ? "Modo Administrador" : "Modo Profesor"}</p>
      </div>

      <div class="quick-actions">
        <button class="btn-primary" onclick="navigateTo('agenda')">
          📅 Ver Agenda
        </button>

        <button class="btn-primary" onclick="navigateTo('lista')">
          📋 Tomar Asistencia
        </button>

        <button class="btn-primary" onclick="navigateTo('plantel')">
          👥 Plantel
        </button>

        ${isAdmin ? `
          <button class="btn-primary" onclick="navigateTo('partidos')">
            ⚽ Partidos
          </button>
        ` : ""}
      </div>

      <div class="card">
        <h3>Próximo partido</h3>

        ${nextMatch ? `
          <p><strong>Fecha:</strong> ${nextMatch.date}</p>
          <p><strong>Rival:</strong> ${nextMatch.rival}</p>
          <p><strong>Condición:</strong> ${nextMatch.home ? "Local" : "Visitante"}</p>

          ${isAdmin ? `
            <button class="btn-outline" onclick="navigateTo('partidos')">
              Cargar resultado
            </button>
          ` : ""}
        ` : `
          <p>No hay partidos cargados</p>
          ${isAdmin ? `
            <button class="btn-outline" onclick="navigateTo('partidos')">
              Cargar partido
            </button>
          ` : ""}
        `}
      </div>
    </section>
  `;
}
function renderAgenda(container, data) {
  container.innerHTML = `
    <h1>Cronograma</h1>
    <div class="annual-grid">
      ${Object.keys(data.agenda).map(w => `
        <div class="annual-card" onclick="openWeekDetail(${w})">
          <strong>W${w}</strong>
          <div>${data.agenda[w].title}</div>
          <small>${data.agenda[w].dates}</small>
        </div>
      `).join("")}
    </div>
    <div id="modal-container"></div>
  `;
}

function openWeekDetail(w) {
  const week = state.data[state.user.category].agenda[w];
  const isAdmin = state.user.role === "admin";

  if (week.locked && !isAdmin) {
    alert("Esta semana está cerrada");
    return;
  }

  if (!week.attendance) {
    week.attendance = { tuesday: {}, thursday: {} };
  }

  const players = state.data[state.user.category].players || [];

  document.getElementById("modal-container").innerHTML = `
    <div class="modal-overlay">
      <div class="detail-modal">
        <h2>Semana ${w}</h2>

        ${isAdmin ? `
          <input id="edit-title" value="${week.title}">
          <input id="edit-dates" value="${week.dates}">
        ` : `
          <p><strong>${week.title}</strong></p>
          <small>${week.dates}</small>
        `}

        <h3>Martes</h3>
        ${players.map(p => `
          <label>
            <input type="checkbox"
              data-day="tuesday"
              data-id="${p.id}"
              ${week.attendance.tuesday[p.id] ? "checked" : ""}>
            ${p.name}
          </label>
        `).join("")}

        <h3>Jueves</h3>
        ${players.map(p => `
          <label>
            <input type="checkbox"
              data-day="thursday"
              data-id="${p.id}"
              ${week.attendance.thursday[p.id] ? "checked" : ""}>
            ${p.name}
          </label>
        `).join("")}

        <button onclick="saveAttendance(${w})">Guardar asistencia</button>

        ${isAdmin ? `
          <button onclick="lockWeek(${w})">Bloquear semana</button>
        ` : ""}

        <button onclick="closeWeek()">Cerrar</button>
      </div>
    </div>
  `;
}

function closeWeek() {
  document.getElementById("modal-container").innerHTML = "";
}

function saveWeek(w) {
  const week = state.data[state.user.category].agenda[w];
  week.title = document.getElementById("edit-title").value;
  week.dates = document.getElementById("edit-dates").value;
  week.day1 = document.getElementById("edit-day1").value;
  week.day2 = document.getElementById("edit-day2").value;
  saveData();
  closeWeek();
  renderScreen("agenda");
}

function saveAttendance(w) {
  const week = state.data[state.user.category].agenda[w];

  document.querySelectorAll(".detail-modal input[type='checkbox']")
    .forEach(cb => {
      const day = cb.dataset.day;
      const id = cb.dataset.id;
      week.attendance[day][id] = cb.checked;
    });

  saveData();
  showToast("Asistencia guardada");
}

function lockWeek(w) {
  state.data[state.user.category].agenda[w].locked = true;
  saveData();
  showToast("Semana bloqueada");
}

/**************************************************
 * LISTA / PLANTEL / STATS (BÁSICO)
 **************************************************/
function renderLista(container, data) {
  const today = new Date().toISOString().split("T")[0];

  // asegurar estructura de asistencia
  if (!data.attendance) {
    data.attendance = {};
  }
  if (!data.attendance[today]) {
    data.attendance[today] = {};
  }

  const attendance = data.attendance[today];
  const players = data.players || [];

  container.innerHTML = `
    <h2>Asistencia – ${today}</h2>

    <div class="attendance-list">
      ${players.map(p => `
        <label class="attendance-item">
          <input 
            type="checkbox" 
            data-id="${p.id}" 
            ${attendance[p.id] ? "checked" : ""}
          >
          <span>${p.name}</span>
        </label>
      `).join("")}
    </div>

    <button id="save-attendance" class="btn-primary">
      Confirmar asistencia
    </button>
  `;

  const saveBtn = document.getElementById("save-attendance");
  saveBtn.onclick = () => {
    document.querySelectorAll(".attendance-item input").forEach(cb => {
      data.attendance[today][cb.dataset.id] = cb.checked;
    });

    saveData();
    showToast("Asistencia guardada");
  };
}

/**************************************************
 * PLANTEL
 **************************************************/
function renderPlantel(container, data) {
  if (!data.players) data.players = [];

  const canEdit = state.user.role === "admin" || state.user.role === "parent";

  container.innerHTML = `
    <section class="section">
      <h3>Plantel</h3>

      ${canEdit ? `
        <button id="add-player-btn" class="btn-primary">
          ➕ Agregar jugador
        </button>
      ` : ""}

      <div class="player-list">
        ${data.players.length === 0
          ? "<p>No hay jugadores cargados.</p>"
          : data.players.map(player => `
              <div class="player-card">
                <span>${player.name}</span>
                ${canEdit ? `
                  <button class="btn-text delete-player" data-id="${player.id}">
                    ❌
                  </button>
                ` : ""}
              </div>
            `).join("")}
      </div>
    </section>
  `;

    if (canEdit) {
    document.getElementById("add-player-btn")
      ?.addEventListener("click", () => {
        const name = prompt("Nombre del jugador");
        if (!name) return;

        data.players.push({
          id: Date.now().toString(),
          name
        });

        saveData();
        renderScreen("plantel");
      });
  }

  
  container.querySelectorAll(".delete-player").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("¿Eliminar jugador?")) return;
      data.players = data.players.filter(p => p.id !== btn.dataset.id);
      saveData();
      renderScreen("plantel");
    });
  });
}

/**************************************************
 * EVENTS
 **************************************************/
function setupEventListeners() {
  document.getElementById("login-form").addEventListener("submit", e => {
    e.preventDefault();
    const cat = document.getElementById("category").value;
    const pass = document.getElementById("password").value;

    if (CONFIG.PASSWORDS[cat] === pass) {
      state.user = { category: cat, role: "parent" };
      sessionStorage.setItem("wilcoop_session", JSON.stringify(state.user));
      window.currentCategory = cat;
      loadData();
    } else {
      alert("Contraseña incorrecta");
    }
  });

  document.getElementById("confirm-admin").addEventListener("click", () => {
  const pin = document.getElementById("admin-pin").value;
  const catSelect = document.getElementById("category");
  const cat = catSelect ? catSelect.value : null;

  if (!cat) {
    alert("Seleccioná una categoría primero");
    return;
  }

  if (pin === CONFIG.ADMIN_PIN) {
    state.user = { category: cat, role: "admin" };
    sessionStorage.setItem("wilcoop_session", JSON.stringify(state.user));
    window.currentCategory = cat;

    document.getElementById("admin-modal").classList.add("hidden");
    document.getElementById("admin-pin").value = "";

    loadData();
  } else {
    alert("PIN incorrecto");
  }
});

  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("wilcoop_session");
    state.user = null;
    showLogin();
  });

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.screen));
  });


  document.getElementById("btn-admin-login").addEventListener("click", () => {
    document.getElementById("admin-modal").classList.remove("hidden");
    document.getElementById("admin-pin").value = "";
  });

  
  document.getElementById("cancel-admin").addEventListener("click", () => {
    document.getElementById("admin-modal").classList.add("hidden");
  });
}

/**************************************************
 * FIREBASE
 **************************************************/
function saveDataFirebase(data) {
  database.ref("clubData").set(data);
}

function loadDataFirebase(cb) {
  database.ref("clubData").once("value").then(snap => cb(snap.val()));
}

/**************************************************
 * START
 **************************************************/
init();