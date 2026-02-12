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
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");

  return `${y}-${m}-${d}`; // formato ISO
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
  closed:false,
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

  const cat=state.user.category;
  const session=state.data[cat].sessions[dateKey];
  const players=state.data[cat].players||[];

  if(!session.attendance){
    session.attendance={};
  }

  const d = new Date(dateKey);

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
      <button class="btn-main"
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

function saveSessionNote(dateKey){

  const cat=state.user.category;

  const note =
    document.getElementById("session-note").value;

  const title =
    document.getElementById("session-title").value;

  const session =
    state.data[cat].sessions[dateKey];

  session.note = note;
  session.title = title;

  saveData();
  closeTraining();

  showToast("Guardado ✅");
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
  const sessions = data.sessions || {};
  const matches = data.matches || {};

  /* ========= STATS ========= */

  let entrenamientos = 0;
  let presentes = 0;
  let ausencias = 0;

  Object.values(sessions).forEach(s=>{
    if(s.attendance){
      Object.values(s.attendance).forEach(v=>{
        entrenamientos++;
        if(v) presentes++;
        else ausencias++;
      });
    }
  });

  const asistenciaPct =
    entrenamientos
      ? Math.round((presentes/entrenamientos)*100)
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

    </div>
  `;
}

function renderNextMatchCard(matches){

  if(!matches || !Object.keys(matches).length){
    return "";
  }

  const nextKey = Object.keys(matches).sort()[0];
  const m = matches[nextKey];

  if(!m) return "";

  return `
    <div class="next-match-card">

      <div class="nm-title">PRÓXIMO PARTIDO</div>

      <div class="nm-teams">
        <div>WILCOOP</div>
        <div>VS</div>
        <div>${m.rival || "-"}</div>
      </div>

      <div class="nm-info">
        <span>${formatDate(nextKey)}</span>
        <span>${m.sede || ""}</span>
      </div>

    </div>
  `;
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

    const isTraining=(day===2 || day===4);

    const selected=
      state.selectedDate &&
      state.selectedDate.getDate()===d &&
      state.selectedDate.getMonth()===month &&
      state.selectedDate.getFullYear()===year
        ? "selected"
        : "";

    const blue=isTraining?"training-day":"";

    html+=`
      <div
        class="ag-day ${blue} ${selected}"
        onclick="selectDate(${year},${month},${d})"
      >
        ${d}
      </div>
    `;
  }

  html+=`</div></div>`;

  container.innerHTML=html;
}

function selectDate(year,month,day){

  state.selectedDate = new Date(year,month,day);

  const cal = document.getElementById("calendar");
  if(cal){
    renderCalendar(cal,year,month);
  }

  const dateKey = getLocalDateKey(state.selectedDate);

  // 👉 ESTA LÍNEA ES LA CLAVE
  openAttendance(dateKey);
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
  const matches = state.data[cat].matches || {};

  let html=`
    <h3>Partidos</h3>

    <button class="btn-main"
      onclick="openCreateMatchModal()">
      + Agendar partido
    </button>
  `;

  Object.keys(matches).sort().forEach(k=>{
    const m=matches[k];

    html+=`
      <div class="ag-match-card">

        <div class="ag-match-top">
          <strong>${formatDateFull(k)}</strong>
          <span>${m.home?"Local":"Visitante"}</span>
        </div>

        <h3>vs ${m.rival}</h3>

        <input 
          placeholder="Resultado"
          value="${m.result||""}"
          onchange="saveResult('${k}',this.value)">

      </div>
    `;
  });

  container.innerHTML=html+`<div id="modal-container"></div>`;
}

function openCreateMatchModal(){

  const area =
    document.getElementById("modal-container");

  area.innerHTML=`
    <div class="modal-overlay"
         onclick="closeTraining(event)">

      <div class="detail-modal slide-up">

        <h3>Nuevo Partido</h3>

        <input id="match-date"
          type="date">

        <input id="match-rival"
          placeholder="Rival">

        <select id="match-home">
          <option value="true">Local</option>
          <option value="false">Visitante</option>
        </select>

        <button class="btn-main"
          onclick="saveNewMatch()">
          GUARDAR PARTIDO
        </button>

        <button onclick="closeTraining()">
          Cancelar
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
  const home =
    document.getElementById("match-home").value==="true";

  if(!date || !rival){
    alert("Completar datos");
    return;
  }

  const cat = state.user.category;

  if(!state.data[cat].matches){
    state.data[cat].matches={};
  }

  state.data[cat].matches[date]={
    rival,
    home,
    result:""
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

function deleteMatch(dateKey){

  if(!confirm("¿Eliminar partido?")) return;

  const cat = state.user.category;

  delete state.data[cat].matches[dateKey];

  saveData();

  renderScreen("lista");

  showToast("Partido eliminado");
}

function renderListaStats(container,data){

  const players=data.players||[];
  const sessions=data.sessions||{};
  const matches=state.data[state.user.category].matches||{};

  let html="";

  let ranking=[];
  let globalTotal=0;
  let globalPresent=0;

  players.forEach(p=>{

    let presTrain=0, absTrain=0;
    let presMatch=0, absMatch=0;

    Object.values(sessions).forEach(s=>{
      if(s.attendance?.[p.id]===true) presTrain++;
      if(s.attendance?.[p.id]===false) absTrain++;
    });

    Object.values(matches).forEach(m=>{
      if(m.attendance?.[p.id]===true) presMatch++;
      if(m.attendance?.[p.id]===false) absMatch++;
    });

    const total=presTrain+absTrain+presMatch+absMatch;
    const present=presTrain+presMatch;

    const pct = total?Math.round(present*100/total):0;

    globalTotal+=total;
    globalPresent+=present;

    html+=`
      <div class="ag-stat-card">

        <div class="ag-stat-top">
          <strong>${p.name}</strong>
          <span>${pct}%</span>
        </div>

        <div class="stat-bar">
          <div style="width:${pct}%"></div>
        </div>

        <small>
          Entrenamientos ${presTrain} · 
          Partidos ${presMatch}
        </small>

      </div>
    `;

    ranking.push({name:p.name,pos:p.position,pct});
  });

  const globalPct =
    globalTotal?Math.round(globalPresent*100/globalTotal):0;

  html=`
    <div class="ag-summary-card">
      <h3>Asistencia global</h3>
      <h1>${globalPct}%</h1>
    </div>
  `+html;

  ranking.sort((a,b)=>b.pct-a.pct);

  html+=`<div class="ag-ranking-card"><h3>Ranking</h3>`;

  ranking.forEach((r,i)=>{
    html+=`
      <div class="ag-rank-row">

        <div class="rank-pos ${i===0?"gold":""}">
          ${i+1}
        </div>

        <div class="rank-player">
          <div class="avatar">
            ${r.name.charAt(0)}
          </div>
          <div>
            <strong>${r.name}</strong>
            <small>${r.pos||""}</small>
          </div>
        </div>

        <strong>${r.pct}%</strong>

      </div>
    `;
  });

  html+=`</div>`;

  container.innerHTML=html;
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

  state.data[cat].matches[date] = {
    rival: rival,
    goalsFor: goalsFor,
    goalsAgainst: goalsAgainst
  };

  database.ref("data/" + cat + "/matches")
    .set(state.data[cat].matches);

  showToast("Partido guardado ✅");
}


function openMatchAttendance(dateKey){

  const cat = state.user.category;
  const players = state.data[cat].players || [];
  const isAdmin = state.user.role === "admin";

  const match =
  state.data[state.user.category].matches[dateKey];

  if(!match.attendance){
    match.attendance = {};
  }

  const locked = match.closed === true;

  const area = document.getElementById("attendance-area");

  area.innerHTML = `
    <h3>Asistencia partido</h3>

    ${players.map(p=>`
      <label style="display:block;margin:6px 0;">
        <input type="checkbox"
          data-id="${p.id}"
          ${match.attendance[p.id]?"checked":""}
          ${(locked && !isAdmin) ? "disabled":""}>
        ${p.name}
      </label>
    `).join("")}

    ${(!locked || isAdmin) ? `
      <button onclick="saveMatchAttendance('${dateKey}')">
        Confirmar
      </button>
    `:"<p>Partido cerrado</p>"}
  `;
}

function saveMatchAttendance(dateKey){

  const match =
  state.data[state.user.category].matches[dateKey];

  document.querySelectorAll("#attendance-area input")
    .forEach(cb=>{
      match.attendance[cb.dataset.id] = cb.checked;
    });

  match.closed = true; // 🔒 bloquea partido

  saveData();
  showToast("Asistencia guardada");

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
function renderPlantel(container, data){

  const players = data.players || [];

  container.innerHTML = `
    <div class="screen-header">
      <h2>Plantel</h2>
      <button class="btn-primary" onclick="addPlayer()">
        + Jugador
      </button>
    </div>

    <div class="players-grid">
      ${players.map(p=>`

        <div class="player-card-ui">

          <div class="player-avatar">
            ${p.name.charAt(0)}
          </div>

          <div class="player-info">
            <div class="player-name">${p.name}</div>
            <div class="player-meta">
              #${p.number || "-"}
            </div>
          </div>

          <div class="player-actions">
            <button onclick="editPlayer('${p.id}')">✏️</button>
            <button onclick="deletePlayer('${p.id}')">🗑️</button>
          </div>

        </div>

      `).join("")}
    </div>
  `;
}

function addPlayer(){

  const name=prompt("Nombre y apellido");
  const birth=prompt("Fecha nacimiento (YYYY-MM-DD)");
  const number=prompt("Número camiseta");

  if(!name) return;

  state.data[state.user.category].players.push({
    id:Date.now(),
    name,
    birth,
    number
  });

  saveData();
  renderScreen("plantel");
}

function editPlayer(id){

  const players = state.data[state.user.category].players;
  const p = players.find(pl=>pl.id==id);

  if(!p) return;

  p.name=prompt("Nombre",p.name);
  p.birth=prompt("Nacimiento",p.birth);
  p.number=prompt("Número",p.number);

  saveData();
  renderScreen("plantel");
}

function deletePlayer(id){

  const players = state.data[state.user.category].players;

  state.data[state.user.category].players =
    players.filter(p=>p.id!=id);

  saveData();
  renderScreen("plantel");
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