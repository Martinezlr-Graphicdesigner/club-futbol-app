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

function getLocalDateKey(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");

  return `${y}-${m}-${d}`;
}

function generateYearSessions(cat){

  const sessions = state.data[cat].sessions;
  const year = new Date().getFullYear();

  let d=new Date(year,0,1);

  while(d.getFullYear()===year){

    const day=d.getDay();
    const key=getLocalDateKey(d);

    // Martes/Jueves entrenamiento
    if(day===2||day===4){
      if(!sessions[key]){
        sessions[key]={
          type:"training",
          closed:false,
          attendance:{}
        };
      }
    }

    // Sábado partido
    if(day===6){
      if(!sessions[key]){
        sessions[key]={
          type:"match",
          closed:false,
          attendance:{},
          goals:{}
        };
      }
    }

    d.setDate(d.getDate()+1);
  }

  saveData();
}

function openAttendance(date){

  const cat = state.user.category;
  const sessions = state.data[cat].sessions;

  // crear si no existe
  if(!sessions[date]){
    sessions[date] = {
      type:"training",
      closed:false,
      attendance:{}
    };
  }

  const session = sessions[date];
  const players = state.data[cat].players || [];

  const area = document.getElementById("attendance-area");

  area.innerHTML = `
    <h3>${formatDate(date)}</h3>

    ${players.map(p=>`
      <label style="display:block;margin:6px 0;">
        <input type="checkbox"
          data-id="${p.id}"
          ${session.attendance[p.id]?"checked":""}>
        ${p.number ? p.number+" - " : ""}${p.name}
      </label>
    `).join("")}

    <button id="confirm-att">Confirmar asistencia</button>
  `;

  document
    .getElementById("confirm-att")
    .addEventListener("click",()=>saveAttendanceDate(date));
}

function saveAttendanceDate(date){

  const cat = state.user.category;
  const session = state.data[cat].sessions[date];

  document
    .querySelectorAll("#attendance-area input")
    .forEach(cb=>{
      session.attendance[cb.dataset.id] = cb.checked;
    });

  session.closed = true;

  saveData();
  showToast("Asistencia guardada ✅");

  document.getElementById("attendance-area").innerHTML="";
  renderScreen("lista");
}

function ensureDataStructure(){

  ["2018","2019","2020"].forEach(cat=>{

    if(!state.data[cat]) state.data[cat]={};
    if(!state.data[cat].players) state.data[cat].players=[];
    if(!state.data[cat].agenda) state.data[cat].agenda={};
    if(!state.data[cat].stats) state.data[cat].stats={};
    if(!state.data[cat].attendance) state.data[cat].attendance={};
    if(!state.data[cat].sessions) state.data[cat].sessions={};

  });

  if(!state.data.shared){
    state.data.shared={matches:[]};
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
  const agenda = data.agenda || {};

  let cards = "";

  Object.keys(agenda).forEach(w => {
    const week = agenda[w];

    // Día 1 (Martes)
    cards += `
      <div class="annual-card" onclick="openWeekDetail(${w})">
        <strong>W${w} · Mar</strong>
        <div>${week.title}</div>
        <small>${week.dates.split(",")[0]}</small>
      </div>
    `;

    // Día 2 (Jueves)
    if (week.dates.includes(",")) {
      cards += `
        <div class="annual-card" onclick="openWeekDetail(${w})">
          <strong>W${w} · Jue</strong>
          <div>${week.title}</div>
          <small>${week.dates.split(",")[1]}</small>
        </div>
      `;
    }
  });

  container.innerHTML = `
    <h1>Cronograma</h1>
    <div class="annual-grid">
      ${cards}
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

        ${
          isAdmin
          ? `
            <input id="edit-title" value="${week.title || ""}">
            <input id="edit-dates" value="${week.dates || ""}">
          `
          : `
            <p><strong>${week.title || ""}</strong></p>
            <small>${week.dates || ""}</small>
          `
        }

        <h3>Martes</h3>
        ${
          isAdmin
          ? `<textarea id="edit-tue">${week.tue || ""}</textarea>`
          : `<p>${week.tue || "—"}</p>`
        }

        <h3>Jueves</h3>
        ${
          isAdmin
          ? `<textarea id="edit-thu">${week.thu || ""}</textarea>`
          : `<p>${week.thu || "—"}</p>`
        }

        ${
          isAdmin
          ? `<button onclick="saveWeek(${w})">Guardar</button>`
          : ""
        }

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
  week.tue = document.getElementById("edit-tue").value;
  week.thu = document.getElementById("edit-thu").value;

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

  closeWeek();
}

function lockWeek(w) {
  state.data[state.user.category].agenda[w].locked = true;
  saveData();
  showToast("Semana bloqueada");
}

/**************************************************
 * LISTA / PLANTEL / STATS (BÁSICO)
 **************************************************/
function formatDate(dateStr){
  const d = new Date(dateStr + "T00:00:00");

  const day = String(d.getDate()).padStart(2,"0");
  const month = String(d.getMonth()+1).padStart(2,"0");
  const year = String(d.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

function getMonthLabel(year,month){
  return new Date(year,month)
    .toLocaleString("es-AR",{month:"long",year:"numeric"});
}

function renderCalendar(container, year, month){

  container.innerHTML = "";

  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const grid = document.createElement("div");
  grid.className = "cal-grid";

  // Espacios vacíos
  for(let i=0;i<startWeekDay;i++){
    const empty=document.createElement("div");
    empty.className="cal-cell empty";
    grid.appendChild(empty);
  }

  const cat = state.user.category;

  for(let day=1; day<=totalDays; day++){

    const dateObj = new Date(year,month,day);
    const dayOfWeek = dateObj.getDay();
    const dateKey = getLocalDateKey(dateObj);

    const cell=document.createElement("div");
    let className="cal-cell";

    const isTuesday = dayOfWeek===2;
    const isThursday = dayOfWeek===4;
    const isSaturday = dayOfWeek===6;

    // 👉 Tipos de día
    if(isTuesday||isThursday) className+=" training";
    if(isSaturday) className+=" match";

    // Hoy
    if(
      day===today.getDate() &&
      month===today.getMonth() &&
      year===today.getFullYear()
    ){
      className+=" today";
    }

    // Cerrado
    const session = state.data[cat].sessions?.[dateKey];
    if(session?.closed){
      className+=" closed";
    }

    cell.className=className;
    cell.innerHTML=`<div class="day-number">${day}</div>`;

    // 👉 Click abrir asistencia
    if(isTuesday||isThursday||isSaturday){
      cell.onclick=()=>{
        openAttendance(dateKey);
      };
    }

    grid.appendChild(cell);
  }

  container.appendChild(grid);
}


function renderLista(container,data){

  const cat = state.user.category;

  generateYearSessions(cat);

  const today = new Date();

  // Header con mes y año
  container.innerHTML = `
    <div class="cal-header">
      <button id="prev-month">◀</button>
      <h3 id="cal-title"></h3>
      <button id="next-month">▶</button>
    </div>

    <div id="calendar"></div>
    <div id="attendance-area"></div>
  `;

  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  const calendarDiv = document.getElementById("calendar");
  const title = document.getElementById("cal-title");

  function draw(){
    title.textContent = getMonthLabel(currentYear,currentMonth);
    renderCalendar(calendarDiv,currentYear,currentMonth);
  }

  draw();

  document.getElementById("prev-month").onclick = ()=>{
    currentMonth--;
    if(currentMonth<0){
      currentMonth=11;
      currentYear--;
    }
    draw();
  };

  document.getElementById("next-month").onclick = ()=>{
    currentMonth++;
    if(currentMonth>11){
      currentMonth=0;
      currentYear++;
    }
    draw();
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