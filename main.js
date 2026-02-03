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

  generateYearSessions(state.user.category);

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

  return `${y}-${m}-${d}`; // formato ISO
}

function generateYearSessions(cat){

  const sessions = state.data[cat].sessions;
  const year = new Date().getFullYear();

  let d = new Date(year,0,1);

  while(d.getFullYear() === year){

    const day = d.getDay();

    if(day === 2 || day === 4 || day === 6){
      const key = getLocalDateKey(d);

      if(!sessions[key]){
        sessions[key]={
          closed:false,
          attendance:{}
        };
      }
    }

    d.setDate(d.getDate()+1);
  }

  saveData();
}

;
  function openAttendance(dateKey){

  const cat = state.user.category;
  const session = state.data[cat].sessions[dateKey];
  const players = state.data[cat].players || [];

  if(!session.attendance){
    session.attendance={};
  }

  const area = document.getElementById("attendance-area");

  area.innerHTML=`
    <h3>${formatDate(dateKey)}</h3>

    ${players.map(p=>`
      <label style="display:block;margin:6px 0;">
        <input type="checkbox"
          data-id="${p.id}"
          ${session.attendance[p.id]?"checked":""}>
        ${p.name}
      </label>
    `).join("")}

    <button id="confirm-att">Confirmar asistencia</button>
  `;

  document.getElementById("confirm-att").onclick=()=>{
    saveAttendanceDate(dateKey);
  };
}

function saveAttendanceDate(dateKey){

  const cat = state.user.category;
  const session = state.data[cat].sessions[dateKey];

  document.querySelectorAll("#attendance-area input")
    .forEach(cb=>{
      session.attendance[cb.dataset.id]=cb.checked;
    });

  session.closed=true;

  saveData();
  showToast("Asistencia guardada");

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

  generateYearSessions(state.user.category);

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

  return `${y}-${m}-${d}`; // formato ISO
}

function generateYearSessions(cat){

  const sessions = state.data[cat].sessions;
  const year = new Date().getFullYear();

  let d = new Date(year,0,1);

  while(d.getFullYear() === year){

    const day = d.getDay();

    // martes o jueves
    if(day===2 || day===4){

      const key = getLocalDateKey(d);

      if(!sessions[key]){
        sessions[key]={
          closed:false,
          attendance:{}
        };
      }
    }

    d.setDate(d.getDate()+1);
  }

  saveData();
}

;
  function openAttendance(dateKey){

  const cat = state.user.category;
  const session = state.data[cat].sessions[dateKey];
  const players = state.data[cat].players || [];

  if(!session.attendance){
    session.attendance={};
  }

  const area = document.getElementById("attendance-area");

  area.innerHTML=`
    <h3>${formatDate(dateKey)}</h3>

    ${players.map(p=>`
      <label style="display:block;margin:6px 0;">
        <input type="checkbox"
          data-id="${p.id}"
          ${session.attendance[p.id]?"checked":""}>
        ${p.name}
      </label>
    `).join("")}

    <button id="confirm-att">Confirmar asistencia</button>
  `;

  document.getElementById("confirm-att").onclick=()=>{
    saveAttendanceDate(dateKey);
  };
}

function saveAttendanceDate(dateKey){

  const cat = state.user.category;
  const session = state.data[cat].sessions[dateKey];

  document.querySelectorAll("#attendance-area input")
    .forEach(cb=>{
      session.attendance[cb.dataset.id]=cb.checked;
    });

  session.closed=true;

  saveData();
  showToast("Asistencia guardada");

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

function openTrainingDetail(w,day){

  const week = state.data[state.user.category].agenda[w];
  const isAdmin = state.user.role==="admin";

  const text = day==="tue" ? week.tue : week.thu;

  document.getElementById("modal-container").innerHTML=`
    <div class="modal-overlay">
      <div class="detail-modal">

        <h3>${day==="tue"?"Martes":"Jueves"}</h3>
        <p><strong>${week.title}</strong></p>

        ${
          isAdmin
          ? `<textarea id="edit-text">${text||""}</textarea>
             <button onclick="saveTrainingText(${w},'${day}')">
               Guardar
             </button>`
          : `<p>${text||"Sin descripción"}</p>`
        }

        <button onclick="closeTraining()">Cerrar</button>

      </div>
    </div>
  `;
}

function openTrainingDetail(w,day){

  const week = state.data[state.user.category].agenda[w];
  const isAdmin = state.user.role==="admin";

  const text = day==="tue" ? week.tue : week.thu;

  document.getElementById("modal-container").innerHTML=`
    <div class="modal-overlay">
      <div class="detail-modal">

        <h3>${day==="tue"?"Martes":"Jueves"}</h3>
        <p><strong>${week.title}</strong></p>

        ${
          isAdmin
          ? `<textarea id="edit-text">${text||""}</textarea>
             <button onclick="saveTrainingText(${w},'${day}')">
               Guardar
             </button>`
          : `<p>${text||"Sin descripción"}</p>`
        }

        <button onclick="closeTraining()">Cerrar</button>

      </div>
    </div>
  `;
}

function closeTraining(){
  document.getElementById("modal-container").innerHTML="";
}

function saveTrainingText(w,day){

  const val = document.getElementById("edit-text").value;
  const week = state.data[state.user.category].agenda[w];

  if(day==="tue") week.tue = val;
  if(day==="thu") week.thu = val;

  saveData();
  closeTraining();
  renderScreen("agenda");
}


/**************************************************
 * LISTA / PLANTEL / STATS (BÁSICO)
 **************************************************/
function formatDate(dateKey){

  const [y,m,d] = dateKey.split("-");
  return `${d}/${m}/${y.slice(2)}`;
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

    // 👉 ENTRENAMIENTOS
    if(isTuesday||isThursday){
      className+=" training";
    }

    // 👉 PARTIDOS SABADO (ROJO)
    if(isSaturday){
      className+=" match";
    }

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

    // Click asistencia
    if(isTuesday||isThursday){
      cell.onclick=()=> openAttendance(dateKey);
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

function openTrainingDetail(w,day){

  const week = state.data[state.user.category].agenda[w];
  const isAdmin = state.user.role==="admin";

  const text = day==="tue" ? week.tue : week.thu;

  document.getElementById("modal-container").innerHTML=`
    <div class="modal-overlay">
      <div class="detail-modal">

        <h3>${day==="tue"?"Martes":"Jueves"}</h3>
        <p><strong>${week.title}</strong></p>

        ${
          isAdmin
          ? `<textarea id="edit-text">${text||""}</textarea>
             <button onclick="saveTrainingText(${w},'${day}')">
               Guardar
             </button>`
          : `<p>${text||"Sin descripción"}</p>`
        }

        <button onclick="closeTraining()">Cerrar</button>

      </div>
    </div>
  `;
}

function closeTraining(){
  document.getElementById("modal-container").innerHTML="";
}

function saveTrainingText(w,day){

  const val = document.getElementById("edit-text").value;
  const week = state.data[state.user.category].agenda[w];

  if(day==="tue") week.tue = val;
  if(day==="thu") week.thu = val;

  saveData();
  closeTraining();
  renderScreen("agenda");
}


/**************************************************
 * LISTA / PLANTEL / STATS (BÁSICO)
 **************************************************/
function formatDate(dateKey){

  const [y,m,d] = dateKey.split("-");
  return `${d}/${m}/${y.slice(2)}`;
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

    // 👉 ENTRENAMIENTOS
    if(isTuesday||isThursday){
      className+=" training";
    }

    // 👉 PARTIDOS SABADO (ROJO)
    if(isSaturday){
      className+=" match";
    }

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

    // Click asistencia
    if(isTuesday||isThursday){
      cell.onclick=()=> openAttendance(dateKey);
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

function renderAgenda(container, data){

  const cat = state.user.category;
  generateYearSessions(cat);

  const sessions = state.data[cat].sessions || {};

  let cards = "";

  Object.keys(sessions)
    .sort()
    .forEach(dateKey => {

      const session = sessions[dateKey];
      const d = new Date(dateKey);
      const day = d.getDay();

      // Solo martes y jueves
      if(day !== 2 && day !== 4) return;

      const dayName = day === 2 ? "Martes" : "Jueves";

      cards += `
        <div class="annual-card" onclick="openAttendance('${dateKey}')">
          <strong>${dayName}</strong>
          <div>${formatDate(dateKey)}</div>
          <small>${session.closed ? "✔ Cerrado" : "Abierto"}</small>
        </div>
      `;
    });

  container.innerHTML = `
    <h1>Agenda anual</h1>

    <div class="annual-grid">
      ${cards}
    </div>

    <div id="attendance-area"></div>
  `;
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