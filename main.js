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

function showToast(msg){
  console.log("TOAST:", msg);
}

let editingPlayer = null; // 👈 AGREGAR ESTA LÍNEA

let state = {
  user: null,
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
  initTheme();

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
function loadData(){

  loadDataFirebase((data)=>{

    if(data){
      state.data = data;
      console.log("🔥 Firebase OK");
    } else {
      state.data = {};
    }

    ensureDataStructure();
    renderMainLayout();

  });

}

function saveData(){
  localStorage.setItem("wilcoop_data", JSON.stringify(state.data));

  if(typeof database !== "undefined"){
    saveDataFirebase(state.data);
  }
}

function getLocalDateKey(date){

  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');

  return `${y}-${m}-${d}`;
}


function generateYearSessions(cat){

  if(!state.data[cat]) return;

  if(!state.data[cat].sessions){
    state.data[cat].sessions = {};
  }

  const sessions = state.data[cat].sessions;
  const year = new Date().getFullYear();

  let changed = false;
  let d = new Date(year,0,1);

  while(d.getFullYear() === year){

    const day = d.getDay();

    if(day===2 || day===4){

      const key = getLocalDateKey(d);

      if(!sessions[key]){
        sessions[key] = {
  attendance:{},
  note:"",
  title:""
};
        changed = true;
      } else if(sessions[key].note === undefined){
        sessions[key].note = "";
        changed = true;
      }
    }

    d.setDate(d.getDate()+1);
  }

  if(changed){
    saveData();
  }
}


  function openAttendance(dateKey){

  const cat = state.user.category;
  const session = state.data[cat].sessions[dateKey];
  const players = state.data[cat].players || [];

  if(!session.attendance){
    session.attendance = {};
  }

  // FIX timezone
  const [y,m,dn] = dateKey.split("-");
  const d = new Date(y, m-1, dn);

  const pretty =
    d.toLocaleDateString("es-AR",{
      weekday:"long",
      day:"numeric",
      month:"short"
    });

  document.getElementById("selected-date-label")
    .textContent = capitalize(pretty);

  const area=document.getElementById("attendance-area");

  area.innerHTML=`

    <div class="ag-player-list">
      ${players.map(p=>`

        <label class="ag-player-card">

          <div class="ag-player-info">
            <strong>${p.name}</strong>
            <small>
              ${p.position||"Pos"} · #${p.number||"-"}
            </small>
          </div>

          <input type="checkbox"
            data-id="${p.id}"
            ${session.attendance[p.id]?"checked":""}>

        </label>

      `).join("")}
    </div>

    <div style="text-align:center;margin-top:20px;">
      <button class="btn-primary"
        onclick="saveAttendanceDate('${dateKey}')">
        GUARDAR SESIÓN
      </button>
    </div>
  `;
}

function openSessionDetail(dateKey){

  const cat=state.user.category;
  const session=state.data[cat].sessions[dateKey];

  const canEdit =
    state.user.role==="admin" ||
    state.user.role==="coach" ||
    state.user.role==="prof";

  const area=document.getElementById("modal-container");

  area.innerHTML=`
    <div class="modal-overlay" onclick="closeTraining(event)">

      <div class="detail-modal slide-up">

        <div class="modal-handle"></div>

        <h3>
          Entrenamiento - ${formatDateFull(dateKey)}
        </h3>

        ${
          canEdit
          ? `
            <input
              id="session-title"
              class="training-input"
              placeholder="Título (ej: Definición, Presión alta...)"
              value="${session.title||""}"
            >

            <textarea
              id="session-note"
              class="training-textarea"
              placeholder="Descripción...">${session.note||""}</textarea>

            <button class="btn-antigravity"
              onclick="saveSessionNote('${dateKey}')">
              GUARDAR
            </button>
          `
          : `
            <h4>${session.title||""}</h4>
            <div class="training-textarea">
              ${session.note||"Sin descripción"}
            </div>
          `
        }

      </div>
    </div>
  `;
}

function saveSession(dateKey, attendance, isMatchDay=false){

  const cat = state.user.category;

  if(!state.data[cat].sessions)
    state.data[cat].sessions = {};

  state.data[cat].sessions[dateKey] = {
    attendance,
    type: isMatchDay ? "match" : "training"
  };

  saveData();
}


function saveAttendanceDate(dateKey){

  const cat = state.user.category;

  if(!state.data[cat].sessions)
    state.data[cat].sessions = {};

  if(!state.data[cat].matches)
    state.data[cat].matches = {};

  const date = new Date(dateKey + "T00:00:00");
  const day = date.getDay();

  const isTrainingDay = (day === 2 || day === 4);
  const isMatchDay = (day === 6);

  document.querySelectorAll("#attendance-area input")
    .forEach(cb=>{

      const id = cb.dataset.id;
      const val = cb.checked;

      // SOLO MARTES Y JUEVES
      if(isTrainingDay){

        if(!state.data[cat].sessions[dateKey]){
          state.data[cat].sessions[dateKey] = { attendance:{} };
        }

        const session = state.data[cat].sessions[dateKey];

        if(!session.attendance)
          session.attendance = {};

        session.attendance[id] = val;
      }

      // SOLO SABADOS
      if(isMatchDay){

        if(!state.data[cat].matches[dateKey]){
          state.data[cat].matches[dateKey] = { attendance:{} };
        }

        const match = state.data[cat].matches[dateKey];

        if(!match.attendance)
          match.attendance = {};

        match.attendance[id] = val;
      }

    });

  saveData();
  showToast("Asistencia guardada");

// 🔥 REFRESH VISUAL
renderScreen("lista");
}

function saveSessionNote(dateKey){

  const cat = state.user.category;

  if(!state.data[cat].sessions)
    state.data[cat].sessions = {};

  const session = state.data[cat].sessions[dateKey];
  if(!session) return;

  const titleInput = document.getElementById("session-title");
  const noteInput  = document.getElementById("session-note");

  if(titleInput) session.title = titleInput.value;
  if(noteInput)  session.note  = noteInput.value;

  saveData();
  showToast("Entrenamiento actualizado");

// 🔥 CERRAR MODAL
document.getElementById("modal-container").innerHTML = "";

// 🔥 REFRESH
renderScreen("agenda");

  }


function ensureDataStructure(){

  ["2018","2019","2020"].forEach(cat=>{

    if(!state.data[cat]) state.data[cat] = {};
    if(!state.data[cat].players) state.data[cat].players = [];
    if(!state.data[cat].agenda) state.data[cat].agenda = {};
    if(!state.data[cat].stats) state.data[cat].stats = {};
    if(!state.data[cat].attendance) state.data[cat].attendance = {};
    if(!state.data[cat].sessions) state.data[cat].sessions = {};

  });

  
  ["2018","2019","2020"].forEach(cat=>{
  if(!state.data[cat].matches){
    state.data[cat].matches = {};
  }
});

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
      renderListaStats(container, data);
      break;
  }
}
/**************************************************
 * SCREENS
 **************************************************/
function renderHome(container, data){

  const players = data.players || [];
  const nextBirthday = getNextBirthday(players);
  const sessions = data.sessions || {};
  const matches = state.data.globalMatches || {};

  /* ========= STATS ========= */

  let entrenamientos = 0;
  let presentes = 0;
  let ausencias = 0;

  // 🔥 Fechas que son partidos y NO deben contar como entrenamiento
  const fechasPartido = [
    "2026-01-31",
    "2026-02-07",
    "2026-02-14",
    "2026-02-21"
  ];

  Object.entries(sessions).forEach(([date, s]) => {

    // 🚫 Excluir partidos manualmente
    if(fechasPartido.includes(date)) return;

    if(!s.attendance) return;

    const day = new Date(date + "T00:00:00").getDay();
    // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab

    // Solo martes y jueves
    if(day !== 2 && day !== 4) return;

    const values = Object.values(s.attendance);
    if(values.length === 0) return;

    entrenamientos++;

    presentes += values.filter(v => v === true).length;
    ausencias += values.filter(v => v === false).length;

  });

  const asistenciaPct =
    entrenamientos
      ? Math.round((presentes / entrenamientos) * 100)
      : 0;

  const partidosJugados = Object.keys(matches).length;

  /* ========= ÚLTIMOS ========= */

  const lastMatchKey =
    Object.keys(matches).sort().slice(-1)[0];

  const lastMatch =
    lastMatchKey ? matches[lastMatchKey] : null;

  const lastTrainingKey =
    Object.keys(sessions).sort().slice(-1)[0];

  /* ========= HTML ========= */

  container.innerHTML = `
    <h2 class="section-title">Wilcoop C.D</h2>
 
${renderNextMatchCard(matches)}

    <!-- CARDS PRINCIPALES -->
    <div class="home-cards">

      <div class="home-card" onclick="navigateTo('agenda')">
        <div class="home-icon-box">
          <svg viewBox="0 0 24 24" width="24" height="24"
            fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <span>Agenda</span>
      </div>

      <div class="home-card" onclick="navigateTo('lista')">
        <div class="home-icon-box">
          <svg viewBox="0 0 24 24" width="24" height="24"
            fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M8 6h13M8 12h13M8 18h13"/>
            <circle cx="3" cy="6" r="1"/>
            <circle cx="3" cy="12" r="1"/>
            <circle cx="3" cy="18" r="1"/>
          </svg>
        </div>
        <span>Lista</span>
      </div>

      <div class="home-card" onclick="navigateTo('plantel')">
        <div class="home-icon-box">
          <svg viewBox="0 0 24 24" width="24" height="24"
            fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="9" cy="7" r="4"/>
            <path d="M17 11v6"/>
            <path d="M21 15h-8"/>
            <path d="M5 21v-2a4 4 0 0 1 8 0v2"/>
          </svg>
        </div>
        <span>Plantel</span>
      </div>

    </div>

    <!-- STATS -->
    <div class="stats-grid">

      <div class="stat-card">
        <h3>${entrenamientos}</h3>
        <span>Entrenamientos</span>
      </div>

      <div class="stat-card">
        <h3>${ausencias}</h3>
        <span>Ausencias</span>
      </div>

      <div class="stat-card">
        <h3>${asistenciaPct}%</h3>
        <span>Asistencia</span>
      </div>

      <div class="stat-card">
        <h3>${partidosJugados}</h3>
        <span>Partidos</span>
      </div>

    </div>

    <!-- ACTIVIDAD RECIENTE -->
    <h3 class="section-title">Actividad Reciente</h3>

    <div class="activity-card">

      <div class="activity-row">
        <div class="dot blue"></div>
        <div>
          ${
            lastMatch
              ? `vs ${lastMatch.rival || "-"}`
              : "Sin partidos"
          }
        </div>
      </div>

      <div class="activity-row">
        <div class="dot gray"></div>
        <div>
          ${
            lastTrainingKey
              ? `Entrenamiento ${formatDate(lastTrainingKey)}`
              : "Sin entrenamientos"
          }
        </div>
      </div>

${
  nextBirthday
    ? `
      <div class="activity-row">
        <div class="dot green"></div>
        <div>
          Próximo cumpleaños:
          ${nextBirthday.player.name}
          ${nextBirthday.date.toLocaleDateString("es-AR",{
            day:"numeric",
            month:"long"
          })}
        </div>
      </div>
    `
    : ""
}

    </div>
  `;
}

function renderNextMatchCard(matches){

  const next = getNextMatch(matches);

  if(!next){
    return `
      <div class="next-match-card empty">
        Sin próximos partidos
      </div>
    `;
  }

  const mapLink = next.location
    ? "https://www.google.com/maps/search/?api=1&query="
      + encodeURIComponent(next.location)
    : null;

  return `
    <div class="next-match-card">

      <div class="nmc-header">
        <span>PRÓXIMO PARTIDO</span>
        <span>${formatDateFull(next.date)}</span>
      </div>

      <div class="nmc-teams">
        <span class="team-name">WILCOOP</span>
        <span class="vs">vs</span>
        <span class="team-name">${next.rival || "-"}</span>
      </div>

      <div class="nmc-footer">

        <span class="loc-badge ${next.home?"local":"visitante"}">
          ${next.home?"Local":"Visitante"}
        </span>

        ${
          mapLink
          ? `<a class="map-btn"
               href="${mapLink}"
               target="_blank">
               Ver mapa
             </a>`
          : ""
        }

      </div>

    </div>
  `;
}




function getNextMatch(matches){

  const today = getLocalDateKey(new Date());

  const futureMatches = Object.keys(matches)
    .filter(d=>{
      const m = matches[d];
      return d >= today && m.status !== "cancelled";
    })
    .sort();

  if(!futureMatches.length) return null;

  const nextDate = futureMatches[0];

  return {
    date: nextDate,
    ...matches[nextDate]
  };
}




function renderDashboardStats(data){

  const sessions = data.sessions || {};
  const matches = data.matches || {};

  let totalTrain=0, present=0, absent=0;

  Object.values(sessions).forEach(s=>{
    if(s.attendance){
      Object.values(s.attendance).forEach(v=>{
        totalTrain++;
        if(v) present++;
        else absent++;
      });
    }
  });

  const pct = totalTrain ? Math.round((present/totalTrain)*100) : 0;
  const games = Object.keys(matches).length;

  return `
  <div class="stats-grid">

    <div class="stat-card">
      <h2>${totalTrain}</h2>
      <span>Entrenamientos</span>
    </div>

    <div class="stat-card">
      <h2>${absent}</h2>
      <span>Ausencias</span>
    </div>

    <div class="stat-card">
      <h2>${pct}%</h2>
      <span>Asistencia</span>
    </div>

    <div class="stat-card">
      <h2>${games}</h2>
      <span>Partidos</span>
    </div>

  </div>
  `;
}

function renderCoachDashboard(data){

  const players=data.players||[];
  const sessions=data.sessions||{};

  let total=0, present=0;

  Object.values(sessions).forEach(s=>{
    if(s.attendance){
      Object.values(s.attendance).forEach(v=>{
        total++;
        if(v) present++;
      });
    }
  });

  const percent=total?Math.round(present*100/total):0;

  return `
    <div class="card">
      <h3>Asistencia general</h3>
      <h1>${percent}%</h1>
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
   <button 
     type="button"
     class="cta-btn"
     onclick="saveTrainingText(${w},'${day}')">
     Guardar
   </button>`
: `<p>${text||"Sin descripción"}</p>`
        }

        <button 
  type="button"
  onclick="closeTraining()">
  Cerrar
</button>

      </div>
    </div>
  `;
}

function closeTraining(e){

  if(e && e.target !== e.currentTarget) return;

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
 * render / PLANTEL / STATS (BÁSICO)
 **************************************************/
function formatDate(dateKey){

  const [y,m,d] = dateKey.split("-");

  return `${d}-${m}-${y}`;
}

function formatDateFull(dateKey){

  const [y,m,d] = dateKey.split("-");
  return `${d}-${m}-${y}`;
}

function getNextBirthday(players){

  const today = new Date();

  const upcoming = players
    .filter(p=>p.birthdate)
    .map(p=>{

      const [y,m,d] = p.birthdate.split("-");
      const next = new Date(today.getFullYear(),m-1,d);

      if(next < today){
        next.setFullYear(today.getFullYear()+1);
      }

      return {player:p,date:next};
    })
    .sort((a,b)=>a.date-b.date);

  return upcoming[0] || null;
}

function getMonthLabel(year,month){
  return new Date(year,month)
    .toLocaleString("es-AR",{month:"long",year:"numeric"});
}

function renderCalendar(container, year, month){

  const monthNames=[
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const daysShort=["D","L","M","M","J","V","S"];

  const firstDay=new Date(year,month,1);
  const startDay=firstDay.getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();

  let html=`

    <div class="ag-calendar-card">

      <div class="ag-week">
        ${daysShort.map(d=>`<div>${d}</div>`).join("")}
      </div>

      <div class="ag-grid">
  `;

  // espacios vacíos
  for(let i=0;i<startDay;i++){
    html+=`<div></div>`;
  }

  for(let d=1;d<=daysInMonth;d++){

    const date=new Date(year,month,d);
    const day=date.getDay();

    // 🔵 MARTES Y JUEVES
    const isTraining=(day===2 || day===4);

    // 🔷 SABADOS
    const isSaturday=(day===6);

    const selected=
      state.selectedDate &&
      state.selectedDate.getDate()===d &&
      state.selectedDate.getMonth()===month &&
      state.selectedDate.getFullYear()===year
        ? "selected"
        : "";

    let extraClass="";

    if(isTraining){
      extraClass="training-day";
    }

    if(isSaturday){
      extraClass="match-day";
    }

    html+=`
      <div
        class="ag-day ${extraClass} ${selected}"
        onclick="selectDate(${year},${month},${d})"
      >
        ${d}
      </div>
    `;
  }

  html+=`</div></div>`;

  container.innerHTML=html;
}

function selectDate(year, month, day){

  state.selectedDate = new Date(year, month, day);

  const cal = document.getElementById("calendar");
  if(cal){
    renderCalendar(cal, year, month);
  }

  const dateKey = getLocalDateKey(state.selectedDate);

  const cat = state.user.category;

  const match = state.data[cat].matches?.[dateKey];
  const session = state.data[cat].sessions?.[dateKey];

  // 👉 PRIORIDAD: si hay partido, abrir partido
  if(match){
    openMatchAttendance(dateKey);
    return;
  }

  if(session){
    openAttendance(dateKey);
  }
}

function formatSelectedDate(){

  if(!state.selectedDate) return "";

  const days = [
    "Domingo","Lunes","Martes",
    "Miércoles","Jueves","Viernes","Sábado"
  ];

  const months = [
    "ene","feb","mar","abr","may","jun",
    "jul","ago","sep","oct","nov","dic"
  ];

  const dayName = days[state.selectedDate.getDay()];

  return `${dayName}, ${state.selectedDate.getDate()} ${months[state.selectedDate.getMonth()]}`;
}

function getPositionGradient(pos){

  const map = {
    "ARQ": "linear-gradient(135deg,#f59e0b,#d97706)",
    "DF": "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    "MC": "linear-gradient(135deg,#10b981,#047857)",
    "DEL": "linear-gradient(135deg,#ef4444,#b91c1c)"
  };

  return map[pos] || "linear-gradient(135deg,#1f2937,#111827)";
}


function renderLista(container,data){

  const tab=state.listaTab||"toma";

  container.innerHTML=`

    <h2 class="section-title">Lista</h2>

    <div class="ag-tabs">
      <button class="${tab==="toma"?"active":""}" id="tab-toma">
        TOMAR LISTA
      </button>

      <button class="${tab==="stats"?"active":""}" id="tab-stats">
        ESTADÍSTICAS
      </button>

      <button class="${tab==="matches"?"active":""}" id="tab-matches">
        PARTIDOS
      </button>
    </div>

    <div id="lista-content"></div>
  `;

  document.getElementById("tab-toma").onclick=()=>{
    state.listaTab="toma";
    renderScreen("lista");
  };

  document.getElementById("tab-stats").onclick=()=>{
    state.listaTab="stats";
    renderScreen("lista");
  };

  document.getElementById("tab-matches").onclick=()=>{
    state.listaTab="matches";
    renderScreen("lista");
  };

  const content=document.getElementById("lista-content");

  if(tab==="toma") renderListaToma(content,data);
  if(tab==="stats") renderListaStats(content,data);
  if(tab==="matches") renderListaMatches(content);
}

function renderListaToma(container,data){

  const cat = state.user.category;
  generateYearSessions(cat);

  const today=new Date();

  container.innerHTML=`
    <div class="cal-header">
      <button id="prev-month">◀</button>
      <h3 id="cal-title"></h3>
      <button id="next-month">▶</button>
    </div>

    <div id="calendar"></div>

    <div id="selected-date-label"
      style="margin-top:18px;font-weight:600;font-size:16px;">
    </div>

    <div id="attendance-area"
      style="margin-top:14px;">
    </div>

    <div id="modal-container"></div>
  `;

  let currentYear = state.calYear ?? today.getFullYear();
  let currentMonth = state.calMonth ?? today.getMonth();

  const calendarDiv=document.getElementById("calendar");
  const title=document.getElementById("cal-title");

  function draw(){
    title.textContent =
      getMonthLabel(currentYear,currentMonth);

    state.calYear = currentYear;
    state.calMonth = currentMonth;

    renderCalendar(calendarDiv,currentYear,currentMonth);
  }

  document.getElementById("prev-month").onclick=()=>{
    currentMonth--;
    if(currentMonth<0){
      currentMonth=11;
      currentYear--;
    }
    draw();
  };

  document.getElementById("next-month").onclick=()=>{
    currentMonth++;
    if(currentMonth>11){
      currentMonth=0;
      currentYear++;
    }
    draw();
  };

  draw();
}


function renderListaMatches(container){

  const cat = state.user.category;

  const global =
    state.data.globalMatches || {};

  const catMatches =
    state.data[cat].matches || {};

  let html = `
    <h3>Partidos</h3>

    <button class="btn-match"
      onclick="openCreateMatchModal()">
      + AGENDAR PARTIDO
    </button>
  `;

  const sorted = Object.keys(global).sort();

  sorted.forEach(dateKey=>{

    const g = global[dateKey];
    if(!g) return;

    const isCancelled =
      g.status === "cancelled";

    const c = catMatches[dateKey] || {};

    html += `
      <div class="match-card ${isCancelled?"cancelled":""}">

        <div class="mc-top">
          <span>${formatDateFull(dateKey)}</span>
          <span>
            ${isCancelled?"🚫 Cancelado":""}
          </span>
        </div>

        <div class="score-row">

          <span class="team">WILCOOP</span>

          <div class="score-box">
            <input type="number"
              value="${c.goalsFor??""}"
              onchange="saveGoals('${dateKey}','for',this.value)"
              ${isCancelled?"disabled":""}>

            <span>-</span>

            <input type="number"
              value="${c.goalsAgainst??""}"
              onchange="saveGoals('${dateKey}','against',this.value)"
              ${isCancelled?"disabled":""}>
          </div>

          <span class="team">${g.rival||"-"}</span>

        </div>

        <div class="mc-bottom">

          <span class="loc-badge ${g.home?"local":"visitante"}">
            ${g.home?"Local":"Visitante"}
          </span>

          <span>${g.location||""}</span>

        </div>

        <div style="text-align:center;margin-top:8px;">

          ${
            isCancelled
            ? `<button onclick="reactivateMatch('${dateKey}')">
                 🔄 Reactivar
               </button>`
            : `<button onclick="cancelMatch('${dateKey}')">
                 ❌ Cancelar
               </button>`
          }

        </div>

      </div>
    `;
  });

  html += `<div id="modal-container"></div>`;

  container.innerHTML = html;
}





function reactivateMatch(dateKey){

  if(!state.data.globalMatches) return;

  if(state.data.globalMatches[dateKey]){
    state.data.globalMatches[dateKey].status = "active";
  }

  saveData();
  renderScreen("lista");

  showToast("Partido reactivado");
}


function editMatch(date){

  const cat = state.user.category;
  const m = state.data[cat].matches[date];

  const area =
    document.getElementById("modal-container");

  area.innerHTML = `
    <div class="modal-overlay">

      <div class="detail-modal slide-up">

        <h3>Editar Partido</h3>

        <input id="edit-date"
          type="date"
          value="${date}">

        <input id="edit-rival"
          value="${m.rival||""}"
          placeholder="Rival">

        <input id="edit-location"
          value="${m.location||""}"
          placeholder="Dirección">

        <select id="edit-home">
          <option value="true"
            ${m.home?"selected":""}>Local</option>
          <option value="false"
            ${!m.home?"selected":""}>Visitante</option>
        </select>

        <button class="btn-main"
          onclick="saveEditMatch('${date}')">
          GUARDAR
        </button>

      </div>
    </div>
  `;
}

function saveEditMatch(oldDate){

  const cat = state.user.category;

  const newDate =
    document.getElementById("edit-date").value;

  const rival =
    document.getElementById("edit-rival").value;

  const location =
    document.getElementById("edit-location").value;

  const home =
    document.getElementById("edit-home").value==="true";

  if(!newDate || !rival){
    alert("Completar datos");
    return;
  }

  const oldData =
    state.data[cat].matches[oldDate];

  delete state.data[cat].matches[oldDate];

  state.data[cat].matches[newDate] = {
    ...oldData,
    rival,
    location,
    home
  };

  saveData();
  closeTraining();
  renderScreen("lista");
}



function saveGoals(date,type,value){

  const cat = state.user.category;

  if(!state.data[cat].matches){
    state.data[cat].matches = {};
  }

  if(!state.data[cat].matches[date]){
    state.data[cat].matches[date] = {};
  }

  if(type==="for"){
    state.data[cat].matches[date].goalsFor =
      value===""?null:Number(value);
  }else{
    state.data[cat].matches[date].goalsAgainst =
      value===""?null:Number(value);
  }

  saveData();
}



function openCreateMatchModal(){

  const area = document.getElementById("modal-container");

  area.innerHTML = `
    <div class="modal-overlay" onclick="closeTraining(event)">

      <div class="detail-modal slide-up">

        <h3>Nuevo Partido</h3>

        <input id="match-date" type="date">

        <input id="match-rival"
          placeholder="Rival">

        <input id="match-location"
          placeholder="Dirección / Sede">

        <select id="match-home">
          <option value="true">Local</option>
          <option value="false">Visitante</option>
        </select>

        <button class="btn-main"
          onclick="saveNewMatch()">
          GUARDAR
        </button>

      </div>
    </div>
  `;
}


function saveNewMatch(){

  const date =
    document.getElementById("match-date").value;

  const rival =
    document.getElementById("match-rival").value;

  const location =
    document.getElementById("match-location").value;

  const home =
    document.getElementById("match-home").value==="true";

  if(!date || !rival){
    alert("Completar datos");
    return;
  }

  // 👉 GLOBAL MATCHES
  if(!state.data.globalMatches){
    state.data.globalMatches = {};
  }

  state.data.globalMatches[date] = {
    rival,
    location,
    home,
    status:"active"
  };

  saveData();
  closeTraining();
  renderScreen("lista");
}





function createMatch(){

  const date = prompt("Fecha (YYYY-MM-DD)");
  if(!date) return;

  const rival = prompt("Rival");
  if(!rival) return;

  const cat = state.user.category;

  if(!state.data[cat].matches){
    state.data[cat].matches = {};
  }

  state.data[cat].matches[date] = {
    rival,
    result:""
  };

  saveData();
  renderScreen("lista");
}

function updateMatchField(date,field,value){
  const cat = state.user.category;
  state.data[cat].matches[date][field]=value;
  saveData();
}

function saveResult(key,val){

  const cat = state.user.category;

  if(!state.data[cat].matches[key]){
    state.data[cat].matches[key]={};
  }

  state.data[cat].matches[key].result = val;

  saveData();

  showToast("Resultado guardado");
}

function cancelMatch(dateKey){

  if(!confirm("¿Cancelar partido?")) return;

  if(!state.data.globalMatches) return;

  if(state.data.globalMatches[dateKey]){
    state.data.globalMatches[dateKey].status = "cancelled";
  }

  saveData();
  renderScreen("lista");

  showToast("Partido cancelado");
}



function renderListaStats(container){

  const cat = state.user.category;
  const players = state.data[cat].players || {};
  const sessions = state.data[cat].sessions || {};
  const matches = state.data[cat].matches || {};

  container.innerHTML = "";

  const playerList = Object.values(players);

  // ==============================
  // ENTRENAMIENTOS VALIDOS
  // ==============================

 const fechasPartido = [
  "2026-01-31",
  "2026-02-07",
  "2026-02-14",
  "2026-02-21"
];

const validTrainings = Object.entries(sessions)
  .filter(([date,v]) => {

    if(fechasPartido.includes(date)) return false;

    if(!v.attendance) return false;

    if(Object.keys(v.attendance).length === 0) return false;

    const day = new Date(date + "T00:00:00").getDay();

    // Solo martes y jueves
    if(day !== 2 && day !== 4) return false;

    return true;
  });

  const totalTrainingDays = validTrainings.length;

  // ==============================
  // PARTIDOS VALIDOS
  // ==============================

  const validMatches = Object.entries(matches)
  .filter(([k,v]) =>
    v.attendance &&
    Object.keys(v.attendance).length > 0
  );

  const totalMatchDays = validMatches.length;

  // ==============================
  // RESUMEN GLOBAL
  // ==============================

  let totalTrainChecks = 0;
  validTrainings.forEach(([k,v])=>{
    totalTrainChecks += Object.values(v.attendance)
      .filter(x=>x===true).length;
  });

  let totalMatchChecks = 0;
  validMatches.forEach(([k,v])=>{
    totalMatchChecks += Object.values(v.attendance)
      .filter(x=>x===true).length;
  });

  const totalTrainPossible =
    totalTrainingDays * playerList.length;

  const totalMatchPossible =
    totalMatchDays * playerList.length;

  const trainingPercent =
    totalTrainPossible
      ? Math.round((totalTrainChecks/totalTrainPossible)*100)
      : 0;

  const matchPercent =
    totalMatchPossible
      ? Math.round((totalMatchChecks/totalMatchPossible)*100)
      : 0;

  // ==============================
  // CARD RESUMEN
  // ==============================

  container.innerHTML += `
    <div class="stats-summary">

      <div class="summary-top">
        <h3>Resumen Categoría</h3>
        <div class="summary-numbers">
          ${totalTrainingDays} entrenamientos<br>
          ${totalMatchDays} partidos<br>
          ${playerList.length} jugadores
        </div>
      </div>

      <div class="summary-title">
        Asistencia a Entrenamientos ${trainingPercent}%
      </div>

      <div class="progress-bar big">
        <div class="progress-fill global-bar"
             style="width:${trainingPercent}%"></div>
      </div>

      <div class="summary-title small">
        Asistencia a Partidos ${matchPercent}%
      </div>

      <div class="progress-bar">
        <div class="progress-fill player-bar"
             style="width:${matchPercent}%"></div>
      </div>

    </div>
  `;

  // ==============================
  // JUGADORES
  // ==============================

  let ranking = [];

  playerList.forEach(p=>{

    let trainAsist = 0;
    validTrainings.forEach(([k,v])=>{
      if(v.attendance[p.id] === true){
        trainAsist++;
      }
    });

    let matchAsist = 0;
    validMatches.forEach(([k,v])=>{
      if(v.attendance[p.id] === true){
        matchAsist++;
      }
    });

    const trainAus = totalTrainingDays - trainAsist;
    const matchAus = totalMatchDays - matchAsist;

    const trainPercentPlayer =
      totalTrainingDays
        ? Math.round((trainAsist/totalTrainingDays)*100)
        : 0;

    const matchPercentPlayer =
      totalMatchDays
        ? Math.round((matchAsist/totalMatchDays)*100)
        : 0;

    const totalPossible =
      totalTrainingDays + totalMatchDays;

    const totalAsist =
      trainAsist + matchAsist;

    const globalPercent =
      totalPossible
        ? Math.round((totalAsist/totalPossible)*100)
        : 0;

    ranking.push({
      name:p.name,
      percent:globalPercent
    });

    container.innerHTML += `
      <div class="player-stat-card">

        <div class="player-header">
          <div class="player-name">${p.name}</div>
          <div class="assist-numbers">
            Entr: ${trainAsist}/${totalTrainingDays}
            | Part: ${matchAsist}/${totalMatchDays}
          </div>
        </div>

        <div class="stat-section">
          <small>Entrenamientos ${trainPercentPlayer}%</small>
          <div class="progress-bar">
            <div class="progress-fill global-bar"
                 style="width:${trainPercentPlayer}%"></div>
          </div>
        </div>

        <div class="stat-section">
          <small>Partidos ${matchPercentPlayer}%</small>
          <div class="progress-bar">
            <div class="progress-fill player-bar"
                 style="width:${matchPercentPlayer}%"></div>
          </div>
        </div>

      </div>
    `;
  });

  // ==============================
  // RANKING COMPLETO EN UNA CARD
  // ==============================

  ranking.sort((a,b)=>b.percent-a.percent);

  container.innerHTML += `
    <div class="ranking-card">
      <h3>Ranking de Asistencia</h3>
      <div class="ranking-content">
  `;

  ranking.forEach((r,i)=>{

    const bgColor =
      i===0 ? "#facc15" : "#e5e7eb";

    container.innerHTML += `
      <div class="ranking-row">
        <div class="rank-left">
          <div class="rank-circle"
               style="background:${bgColor}">
            ${i+1}
          </div>
          <span>${r.name}</span>
        </div>
        <span class="rank-percent">${r.percent}%</span>
      </div>
    `;
  });

  container.innerHTML += `
      </div>
    </div>

    <div class="pdf-card">
      <button 
        type="button"
        class="cta-btn"
        onclick="exportStatsPDF()">
        Descargar Estadísticas en PDF
      </button>
    </div>
  `;
}


function renderAgenda(){

  const monthNames = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const currentMonth = new Date().getMonth();

  document.getElementById("content-area").innerHTML = `
    <div class="agenda-screen">

      <h2 class="section-title">Agenda Mensual</h2>

      <select id="monthSelect" class="month-select">
        ${monthNames.map((m,i)=>
          `<option value="${i}" ${i===currentMonth?"selected":""}>${m}</option>`
        ).join("")}
      </select>

      <div id="agendaList"></div>

      <!-- 👇 IMPORTANTE -->
      <div id="modal-container"></div>

    </div>
  `;

  document.getElementById("monthSelect")
    .addEventListener("change", e=>{
      drawMonth(parseInt(e.target.value));
    });

  drawMonth(currentMonth);
}

function drawMonth(monthIndex){

  const monthNames=[
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const agendaList=document.getElementById("agendaList");
  if(!agendaList) return;

  const cat=state.user.category;
  const sessions=state.data[cat].sessions||{};

  const today=new Date();
  const todayKey=getLocalDateKey(today);

  function capitalize(str){
    return str.charAt(0).toUpperCase()+str.slice(1);
  }

  // 👉 SOLO martes y jueves del mes
  const filtered=Object.keys(sessions).filter(dateKey=>{
    const d=new Date(dateKey+"T00:00:00");
    const day=d.getDay(); // 2=martes,4=jueves
    return d.getMonth()===monthIndex && (day===2||day===4);
  });

  if(filtered.length===0){
    agendaList.innerHTML=`<div class="empty">Sin entrenamientos este mes</div>`;
    return;
  }

  agendaList.innerHTML=filtered.map(dateKey=>{

    const d=new Date(dateKey+"T00:00:00");

    let weekday=d.toLocaleDateString("es-AR",{weekday:"long"});
    weekday=capitalize(weekday); // ✅ mayúscula

    const dayNum=String(d.getDate()).padStart(2,"0");
    const month=monthNames[d.getMonth()].slice(0,3);

    const s=sessions[dateKey]||{};

    const isToday=dateKey===todayKey;
    const isPast=d < today && !isToday;

    return `
      <div class="agenda-card ${isPast?"disabled":""}"
        onclick="openSessionDetail('${dateKey}')">

        <div>

          <div class="agenda-title">
            ${weekday} ${dayNum} ${month}
          </div>

          <div class="agenda-sub">
            ${s.title || "Sin título"}
          </div>

          ${isToday?`
            <small style="color:#22c55e;font-weight:600">
              Sesión activa
            </small>
          `:""}

        </div>

        ${isToday?`<span class="session-dot"></span>`:""}

      </div>
    `;
  }).join("");
}

function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}
 
function openMatchDetail(dateKey){

  const isAdmin = state.user.role==="admin";
  const match =
  state.data[state.user.category].matches[dateKey] || {};

  const area=document.getElementById("modal-container");

  area.innerHTML=`
    <div class="modal-overlay">
      <div class="detail-modal">

        <h3>Partido ${formatDateFull(dateKey)}</h3>

        ${
          isAdmin ? `
            <input id="m-rival" placeholder="Rival"
              value="${match.rival||""}">

            <input id="m-location" placeholder="Dirección"
              value="${match.location||""}">

            <select id="m-home">
              <option value="true" ${match.home?"selected":""}>Local</option>
              <option value="false" ${match.home===false?"selected":""}>Visitante</option>
            </select>

            <button onclick="saveMatch('${dateKey}')">
              Guardar partido
            </button>
          `
          :
          `
            <p><strong>${match.rival||"Sin rival"}</strong></p>
            <p>${match.home?"Local":"Visitante"}</p>
            <p>${match.location||""}</p>
          `
        }

        <button onclick="openMatchAttendance('${dateKey}')">
          Tomar lista
        </button>

        <button onclick="closeTraining()">Cerrar</button>

      </div>
    </div>
  `;
}

function saveMatch(date, rival, goalsFor, goalsAgainst){

  const cat = state.user.category;

  if(!state.data[cat]){
    state.data[cat] = {};
  }

  if(!state.data[cat].matches){
    state.data[cat].matches = {};
  }

  // Si ya existe el partido, mantener attendance
  const existingMatch = state.data[cat].matches[date];

  state.data[cat].matches[date] = {
    rival: rival,
    goalsFor: goalsFor,
    goalsAgainst: goalsAgainst,
    attendance: existingMatch?.attendance || {}
  };

 saveData();

  showToast("Partido guardado ✅");
}


function openMatchAttendance(dateKey){

  const cat = state.user.category;

  if(!state.data[cat].matches){
    state.data[cat].matches = {};
  }

  if(!state.data[cat].matches[dateKey]){
    state.data[cat].matches[dateKey] = {
      attendance:{}
    };
  }

  const match = state.data[cat].matches[dateKey];
  const players = state.data[cat].players || [];

  const area = document.getElementById("attendance-area");

  area.innerHTML = `
    <h3>Asistencia partido</h3>

    ${players.map(p=>{

      const checked =
        match.attendance &&
        match.attendance[p.id] === true
          ? "checked"
          : "";

      return `
        <div class="attendance-card">
          <label>
            <input type="checkbox"
              data-id="${p.id}"
              ${checked}>
            <span>${p.name}</span>
          </label>
        </div>
      `;
    }).join("")}

    <button class="btn-confirm"
      onclick="saveMatchAttendance('${dateKey}')">
      Confirmar
    </button>
  `;
}

function toggleMatchPlayer(dateKey, playerId, el){

  const cat = state.user.category;
  const match = state.data[cat].matches[dateKey];

  const current = match.attendance[playerId] || false;
  match.attendance[playerId] = !current;

  el.classList.toggle("checked");
}

function saveMatchAttendance(id){

  const cat = state.user.category;
  const match = state.data[cat].matches[id];

  match.attendance = {};

  document.querySelectorAll("#attendance-area input[type='checkbox']")
    .forEach(cb=>{
      match.attendance[cb.dataset.id] = cb.checked;
    });

  saveData();
  showToast("Partido actualizado");

// 🔥 REFRESH
renderScreen("lista");
}

function drawCalendar(container,data){

  const sessions=data.sessions||{};
  const matches=
  state.data[state.user.category].matches || {};
  const todayKey=getLocalDateKey(new Date());

  const now=new Date();
  const year=now.getFullYear();
  const month=now.getMonth();

  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();

  let html=`<div class="calendar-grid">`;

  // espacios vacíos inicio
  for(let i=0;i<firstDay;i++){
    html+=`<div></div>`;
  }

  for(let day=1;day<=daysInMonth;day++){

    const date=new Date(year,month,day);
    const dateKey=getLocalDateKey(date);

    const s=sessions[dateKey];
    const m=matches[dateKey];

    let className="cal-cell";

    // hoy
    if(dateKey===todayKey){
      className+=" today";
    }

    // entrenamiento
    if(s){
      className+=" training";
    }

    // partido
    if(m){
      className+=" match";
    }

    // 👉 puntitos asistencia
    let dots="";
    if(s?.attendance){
      const vals=Object.values(s.attendance);
      if(vals.some(v=>v===true)) dots+="🟢";
      if(vals.some(v=>v===false)) dots+="🔴";
    }

    html+=`
      <div class="${className}"
        onclick="selectCalendarDate('${dateKey}')">

        <div>${day}</div>
        <small>${dots}</small>

      </div>
    `;
  }

  html+=`</div>`;

  container.innerHTML+=html;
}

function selectCalendarDate(dateKey){

  const match =
  state.data[state.user.category].matches?.[dateKey];
  const session=state.data[state.user.category]
    .sessions?.[dateKey];

  if(match){
    openMatchDetail(dateKey);
    return;
  }

  if(session){
    openSessionDetail(dateKey);
  }
}

/**************************************************
 * PLANTEL
 **************************************************/
function getPositionColor(pos){

  const map = {
    "PO": "#374151",      // gris oscuro
    "DFC": "#38bdf8",     // celeste
    "MC": "#1d4ed8",      // azul oscuro
    "DC": "#2dd4bf"       // celeste verdoso
  };

  return map[pos] || "#64748b";
}


function renderPlantel(container,data){

  const cat = state.user.category;
  const order = { PO:1, DFC:2, MC:3, DC:4 };

const players = (state.data[cat].players || [])
  .slice()
  .sort((a,b)=>{
    return (order[a.position] || 99) - (order[b.position] || 99);
  });

  let html = `
    <div class="plantel-scope">

      <div class="plantel-header">
        <h2>PLANTEL</h2>
        <button class="btn-add-player" onclick="addPlayer()">
          + AGREGAR
        </button>
      </div>

      <div class="plantel-list">
  `;

  players.forEach(p=>{

    html+=`
      <div class="player-card" onclick="openPlayerCard('${p.id}')">

        <div class="player-left">

          <div class="player-avatar">
            ${
              p.photo
              ? `<img src="${p.photo}">`
              : `<span>${p.name?.charAt(0) || "?"}</span>`
            }
          </div>

          <div class="player-info">
  <div class="player-name">${p.name || "Sin nombre"}</div>
  <div class="player-position">${p.position || "-"}</div>
</div>

        </div>

        <div class="player-right">
  <div class="player-number-label">NÚMERO</div>
  <div class="number-row">
    <span class="position-dot pos-${p.position}"></span>
    <span class="player-number">
      ${p.number ? String(p.number).padStart(2, '0') : "--"}
    </span>
  </div>
</div>

      </div>
    `;
  });

  html+=`
      </div>
    </div>
  `;

  container.innerHTML = html;
}


function openPlayerCard(id){

  const cat = state.user.category;

  // Seguridad extra por si la categoría no tiene players
  if(!state.data[cat] || !Array.isArray(state.data[cat].players)){
    console.warn("No hay players en esta categoría");
    return;
  }

  const p = state.data[cat].players.find(x => x.id == id);
  if(!p) return;

  // Evitar modales duplicados
  const existing = document.querySelector(".player-modal");
  if(existing) existing.remove();

  const modal = document.createElement("div");
  modal.className = "player-modal";

  modal.innerHTML = `
  <div class="player-sheet">

    <button class="close-x">✕</button>

    <h3 class="sheet-title">Ficha del Jugador</h3>

    <div class="sheet-card">

      <div class="sheet-photo-wrapper">
        ${
          p.photo
          ? `<img src="${p.photo}">`
          : `<div class="sheet-photo-empty">
              ${p.name?.charAt(0) || "?"}
            </div>`
        }

        <input 
          type="file" 
          accept="image/*"
          class="photo-input"
        >
      </div>

      <div class="sheet-info-box">
        <div><strong>Nombre:</strong> ${p.name || "-"}</div>
        <div><strong>Puesto:</strong> ${p.position || "-"}</div>
        <div><strong>Fecha:</strong> ${p.birthdate || "-"}</div>
        <div><strong>Número:</strong> ${
          p.number ? String(p.number).padStart(2,'0') : "--"
        }</div>
      </div>

    </div>

    <div class="sheet-actions">
      <button class="btn-edit">EDITAR</button>
      <button class="btn-delete">ELIMINAR</button>
    </div>

  </div>
  `;

  document.body.appendChild(modal);

  // 🔹 Cerrar modal
  modal.querySelector(".close-x").onclick = () => modal.remove();
  modal.onclick = () => modal.remove();
  modal.querySelector(".player-sheet").onclick = e => e.stopPropagation();

  // 🔹 Upload foto
  const fileInput = modal.querySelector(".photo-input");
  fileInput.onchange = (e) => handlePhotoUpload(e, p.id);

  // 🔹 Editar
  modal.querySelector(".btn-edit").onclick = (e) => {
    e.stopPropagation();
    editPlayer(p.id);
  };

  // 🔹 Eliminar
  modal.querySelector(".btn-delete").onclick = (e) => {
    e.stopPropagation();
    confirmDeletePlayer(p.id);
  };
}


function handlePhotoUpload(event, id){
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = function(e){

    const cat = state.user.category;
    const player = state.data[cat].players.find(p=>p.id==id);
    if(!player) return;

    player.photo = e.target.result;

    saveData();

    document.querySelector(".player-modal")?.remove();
    openPlayerCard(id);
  };

  reader.readAsDataURL(file);
}

function confirmDeletePlayer(id){

  if(!confirm("¿Eliminar jugador definitivamente?"))
    return;

  const cat = state.user.category;

  state.data[cat].players =
    state.data[cat].players.filter(p=>p.id!=id);

  saveData();

  document.querySelector(".player-modal")?.remove();

  renderScreen("plantel");

  showToast("Jugador eliminado");
}


function openPlayerModal(id){

  const players = state.data[state.user.category].players;
  const p = players.find(pl=>pl.id==id);
  if(!p) return;

  const area = document.getElementById("modal-container");

  area.innerHTML = `
    <div class="modal-overlay"
      onclick="closeTraining(event)">

      <div class="detail-modal slide-up">

        <h3>${p.name}</h3>

        ${
          p.photo
            ? `<img src="${p.photo}" class="modal-photo">`
            : `<div class="avatar-big">${p.name[0]}</div>`
        }

        <p>#${p.number || "-"}</p>
        <p>${p.position || ""}</p>

        <button onclick="editPlayer('${id}')">
          Editar
        </button>

        <button onclick="deletePlayer('${id}')">
          Eliminar
        </button>

      </div>
    </div>
  `;
}





function changePlayerPhoto(playerId){

  const input = document.getElementById("photo-input");

  input.onchange = function(){

    const file = this.files[0];
    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(e){

      const players =
        state.data[state.user.category].players;

      const p = players.find(pl=>pl.id==playerId);

      if(!p) return;

      p.photo = e.target.result;

      saveData();
      renderScreen("plantel");

      showToast("Foto actualizada 📸");
    };

    reader.readAsDataURL(file);
  };

  input.click();
}

function addPlayer(){

  const name = prompt("Nombre y apellido");
  if(!name) return;

  const number = prompt("Número camiseta");
  const position = prompt("Posición (ARQ / DF / MC / DEL)");

  state.data[state.user.category].players.push({
    id: Date.now(),
    name,
    number,
    position,
    photo: null
  });

  saveData();
  renderScreen("plantel");
}



function editPlayer(id){

  const cat = state.user.category;
  const original = state.data[cat].players.find(p=>p.id===id);
  if(!original) return;

  editingPlayer = {...original};

  const modal = document.createElement("div");
  modal.className="player-modal";

  modal.innerHTML=`
    <div class="player-sheet" onclick="event.stopPropagation()">

      <h3 class="sheet-title">Editar Jugador</h3>

      <div class="sheet-info-box">

        <label>Nombre y Apellido</label>
        <input id="ep-name" value="${editingPlayer.name||""}">

        <label>Puesto</label>
        <select id="ep-pos">
          <option value="PO" ${editingPlayer.position==="PO"?"selected":""}>PO</option>
          <option value="DFC" ${editingPlayer.position==="DFC"?"selected":""}>DFC</option>
          <option value="MC" ${editingPlayer.position==="MC"?"selected":""}>MC</option>
          <option value="DC" ${editingPlayer.position==="DC"?"selected":""}>DC</option>
        </select>

        <label>Fecha</label>
        <input type="date" id="ep-date"
          value="${editingPlayer.birthdate||""}">

        <label>Número</label>
        <input type="number" id="ep-number"
          value="${editingPlayer.number||""}">

      </div>

      <div class="sheet-actions">
        <button class="btn-edit"
          onclick="savePlayer('${id}')">
          GUARDAR
        </button>

        <button class="btn-delete"
          onclick="closeEditModal()">
          CANCELAR
        </button>
      </div>

    </div>
  `;

  modal.onclick = ()=> modal.remove();

  document.body.appendChild(modal);
}

function savePlayer(id){

  const cat = state.user.category;

  id = Number(id); // 👈 AGREGAR ESTA LÍNEA

  const player = state.data[cat].players.find(p=>p.id===id);
  if(!player) return;

  player.name = document.getElementById("ep-name").value;
  player.position = document.getElementById("ep-pos").value;
  player.birthdate = document.getElementById("ep-date").value;
  player.number = document.getElementById("ep-number").value;

  saveData();

  document.querySelector(".player-modal")?.remove();

  renderScreen("plantel");

  showToast("Jugador actualizado");
}


function closeEditModal(){
  editingPlayer = null;

  const m=document.querySelector(".player-modal");
  if(m) m.remove();
}

async function exportStatsPDF(){

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cat = state.user.category;
  const players = state.data[cat].players || [];
  const sessions = state.data[cat].sessions || {};

  doc.setFontSize(18);
  doc.text(`Estadísticas Categoría ${cat}`, 20, 20);

  /* ========= FILTRAR SESIONES REALES ========= */

  const validTrainings = Object.values(sessions).filter(s =>
    s.type !== "match" &&
    s.attendance &&
    Object.keys(s.attendance).length > 0
  );

  const validMatches = Object.values(sessions).filter(s =>
    s.type === "match" &&
    s.attendance &&
    Object.keys(s.attendance).length > 0
  );

  const totalTrainings = validTrainings.length;
  const totalMatches = validMatches.length;

  let y = 35;

  /* ========= CALCULAR STATS POR JUGADOR ========= */

  const ranking = players.map(player => {

    let trainPresent = 0;
    let matchPresent = 0;

    validTrainings.forEach(s=>{
      if(s.attendance[player.id]) trainPresent++;
    });

    validMatches.forEach(s=>{
      if(s.attendance[player.id]) matchPresent++;
    });

    const pct = totalTrainings
      ? Math.round((trainPresent / totalTrainings) * 100)
      : 0;

    return {
      name: player.name,
      trainPresent,
      matchPresent,
      pct
    };

  }).sort((a,b)=> b.pct - a.pct);

  /* ========= IMPRIMIR ========= */

  doc.setFontSize(12);

  ranking.forEach((p, index)=>{

    const line = `${index+1}. ${p.name}
Entrenamientos: ${p.trainPresent}/${totalTrainings}
Partidos: ${p.matchPresent}/${totalMatches}
Asistencia: ${p.pct}%`;

    doc.text(line, 20, y);

    y += 22;

    if(y > 270){
      doc.addPage();
      y = 20;
    }

  });

  doc.save(`Estadisticas_${cat}.pdf`);
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

function initTheme(){

  const btn = document.getElementById("theme-toggle");
  if(!btn) return;

  const savedTheme = localStorage.getItem("theme") || "light";

  if(savedTheme === "dark"){
    document.body.classList.add("dark");
    btn.textContent = "☀️";
  }

  btn.onclick = () => {

    
    const isDark = document.body.classList.contains("dark");

    localStorage.setItem("theme", isDark ? "dark" : "light");

    btn.textContent = isDark ? "☀️" : "🌙";
  };
}
/**************************************************
 * FIREBASE
 **************************************************/
function saveDataFirebase(data) {
  database.ref("clubData").update(data);
}

function loadDataFirebase(cb) {

  if(typeof database === "undefined"){
    console.warn("Firebase no disponible, usando localStorage");
    cb(JSON.parse(localStorage.getItem("wilcoop_data")) || {});
    return;
  }

  database.ref("clubData")
    .once("value")
    .then(snap => cb(snap.val()));
}

/**************************************************
 * START
 **************************************************/

window.addEventListener("beforeunload", () => {
  saveData();
});


init();

// ===== BACKUP FUNCTION =====

function backupData(){
  const blob = new Blob(
    [JSON.stringify(state.data,null,2)],
    {type:"application/json"}
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup_wilcoop.json";
  a.click();
}