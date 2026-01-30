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
      state.data[cat] = {
        players: [],
        agenda: {},
        stats: {}
      };
    }
  });

  if (!state.data.shared) {
    state.data.shared = { matches: [] };
  }
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

  switch (screen) {
    case "home": renderHome(container, data); break;
    case "agenda": renderAgenda(container, data); break;
    case "lista": renderLista(container, data); break;
    case "plantel": renderPlantel(container, data); break;
    case "stats": renderStats(container, data); break;
  }
}

/**************************************************
 * SCREENS
 **************************************************/
function renderHome(container, data) {
  container.innerHTML = `
    <div class="card">
      <h1>Bienvenido</h1>
      <p>Categoría ${state.user.category}</p>
    </div>
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

  document.getElementById("modal-container").innerHTML = `
    <div class="modal-overlay">
      <div class="detail-modal">
        <h2>Semana ${w}</h2>
        ${isAdmin ? `
          <input id="edit-title" value="${week.title}">
          <input id="edit-dates" value="${week.dates}">
          <textarea id="edit-day1">${week.day1}</textarea>
          <textarea id="edit-day2">${week.day2}</textarea>
          <button onclick="saveWeek(${w})">Guardar</button>
        ` : `
          <p>${week.day1}</p>
          <p>${week.day2}</p>
        `}
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

/**************************************************
 * LISTA / PLANTEL / STATS (BÁSICO)
 **************************************************/
function renderLista(container) {
  container.innerHTML = `<h1>Lista (base)</h1>`;
}

function renderPlantel(container, data) {
  container.innerHTML = `
    <h1>Plantel</h1>
    ${data.players.map(p => `<div>${p.name} ${p.lastName}</div>`).join("")}
  `;
}

function renderStats(container) {
  container.innerHTML = `<h1>Stats</h1>`;
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
  const cat = document.getElementById("category").value;

  if (pin === CONFIG.ADMIN_PIN) {
    closeAdminModal();

    state.user = { category: cat, role: "admin" };
    sessionStorage.setItem("wilcoop_session", JSON.stringify(state.user));
    window.currentCategory = cat;
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