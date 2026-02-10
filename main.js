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

    if(day===2 || day===4 || day===6){

      const key = getLocalDateKey(d);

      if(!sessions[key]){
        sessions[key] = {
          closed:false,
          attendance:{},
          note:""
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

  const area=document.getElementById("attendance-area");

  area.innerHTML=`
    <h3>${formatDate(dateKey)}</h3>

    <div class="players-grid">
      ${players.map(p=>`

        <div class="player-card">
          <label>

            <input type="checkbox"
              data-id="${p.id}"
              ${session.attendance[p.id]?"checked":""}
            >

            <span>${p.name}</span>

          </label>
        </div>

      `).join("")}
    </div>

    <button class="btn-main"
      onclick="saveAttendanceDate('${dateKey}')">
      Guardar asistencia
    </button>
  `;
}

function openSessionDetail(dateKey){

  const cat = state.user.category;
  const session = state.data[cat].sessions[dateKey];
  const isAdmin = state.user.role==="admin";

  const area = document.getElementById("modal-container");

  area.innerHTML = `
    <div class="modal-overlay">
      <div class="detail-modal">

        <h3>${formatDate(dateKey)}</h3>

        ${
          isAdmin
          ? `
            <textarea id="session-note"
              placeholder="Descripción del entrenamiento..."
              style="width:100%;height:120px;">${session.note || ""}</textarea>

            <button onclick="saveSessionNote('${dateKey}')">
              Guardar
            </button>
          `
          : `
            <p>${session.note || "Sin descripción"}</p>
          `
        }

        <button onclick="closeTraining()">Cerrar</button>

      </div>
    </div>
  `;
}

function saveSessionNote(dateKey){

  const cat = state.user.category;
  const val = document.getElementById("session-note").value;

  state.data[cat].sessions[dateKey].note = val;

  saveData();
  closeTraining();

  showToast("Descripción guardada");
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

  const cat = state.user.category;
  const matches = data.matches || {};
  const sessions = data.sessions || {};
  const players = data.players || [];

  /* =============================
     📌 PRÓXIMO PARTIDO
  ============================= */

  let nextMatch = null;

  Object.keys(matches)
    .sort()
    .forEach(k=>{
      if(!nextMatch) nextMatch = {date:k, ...matches[k]};
    });

  let matchCard = "";

  if(nextMatch){
    matchCard = `
      <div class="next-match-card">
        <div class="nm-title">PRÓXIMO PARTIDO</div>

        <div class="nm-row">
          <div class="nm-team">
            <div class="nm-logo">⚽</div>
            <div>WILCOOP</div>
          </div>

          <div class="nm-vs">VS</div>

          <div class="nm-team">
            <div class="nm-logo">🏆</div>
            <div>${nextMatch.rival || "-"}</div>
          </div>
        </div>

        <div class="nm-info">
          📅 ${formatDateFull(nextMatch.date)}
          ${nextMatch.location ? " • 📍 "+nextMatch.location : ""}
        </div>
      </div>
    `;
  }

  /* =============================
     📌 STATS
  ============================= */

  let totalTrain=0, abs=0, pres=0;

  Object.values(sessions).forEach(s=>{
    if(s.attendance){
      Object.values(s.attendance).forEach(v=>{
        totalTrain++;
        if(v) pres++; else abs++;
      });
    }
  });

  const pct = totalTrain?Math.round((pres*100)/totalTrain):0;

  const stats = `
    <div class="stats-grid">
      <div class="stat-card"><h3>${totalTrain}</h3><p>Entrenamientos</p></div>
      <div class="stat-card"><h3>${abs}</h3><p>Ausencias</p></div>
      <div class="stat-card"><h3>${pct}%</h3><p>Asistencia</p></div>
      <div class="stat-card"><h3>${Object.keys(matches).length}</h3><p>Partidos</p></div>
    </div>
  `;

  /* =============================
     📌 ÚLTIMA ACTIVIDAD
  ============================= */

  const lastTrain = Object.keys(sessions).sort().pop();
  const lastMatch = Object.keys(matches).sort().pop();

  container.innerHTML = `
    <h2 class="section-title">Dashboard</h2>

    ${matchCard}

    <div class="home-cards">

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

    ${stats}

    <h3 class="section-title">Actividad Reciente</h3>

<div class="activity-card">

  <div class="activity-row">
    <div class="dot blue"></div>
    <div>
      ${lastMatch
        ? `Resultado vs ${lastMatch.rival || "-"}`
        : "Sin partidos"}
    </div>
  </div>

  <div class="activity-row">
    <div class="dot gray"></div>
    <div>
      ${lastTraining
        ? `Entrenamiento ${lastTraining.date}`
        : "Sin entrenamientos"}
    </div>
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
 * LISTA / PLANTEL / STATS (BÁSICO)
 **************************************************/
function formatDate(dateKey){

  const [y,m,d] = dateKey.split("-");
  return `${d}/${m}/${y.slice(2)}`;
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

  container.innerHTML = "";

  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const grid = document.createElement("div");
  grid.className = "cal-grid";

  const cat = state.user.category;

  // espacios vacíos
  for(let i=0;i<startWeekDay;i++){
    const empty=document.createElement("div");
    empty.className="cal-cell empty";
    grid.appendChild(empty);
  }

  for(let day=1; day<=totalDays; day++){

    const dateObj = new Date(year,month,day);
    const dayOfWeek = dateObj.getDay();
    const dateKey = getLocalDateKey(dateObj);

    const cell=document.createElement("div");
    let className="cal-cell";

    const isTuesday = dayOfWeek===2;
    const isThursday = dayOfWeek===4;
    const isSaturday = dayOfWeek===6;

    // ENTRENAMIENTO
    if(isTuesday||isThursday){
      className+=" training";
      cell.onclick=()=>{
        state.selectedDate=dateKey;
        openAttendance(dateKey);
      };
    }

    // PARTIDO
    if(isSaturday){
      className+=" match";
      cell.onclick=()=>{
        state.selectedDate=dateKey;
        openMatchDetail(dateKey);
      };
    }

    // hoy o seleccionado
    if(
      state.selectedDate===dateKey ||
      (day===today.getDate() &&
       month===today.getMonth() &&
       year===today.getFullYear())
    ){
      className+=" today";
    }

    // sesión cerrada
    const session = state.data[cat].sessions?.[dateKey];
    if(session?.closed){
      className+=" closed";
    }

    // partido cargado
    const match =
  state.data[state.user.category].matches?.[dateKey];
    if(match){
      className+=" has-match";
    }

    cell.className=className;
    cell.innerHTML=`<div class="day-number">${day}</div>`;

    grid.appendChild(cell);
  }

  container.appendChild(grid);
}


function renderLista(container,data){

  const tab = state.listaTab || "toma";

  container.innerHTML=`
  <h1>Lista</h1>

  <div class="subnav">
    <button id="tab-toma" class="${tab==="toma"?"active":""}">
      Tomar lista
    </button>

    <button id="tab-stats" class="${tab==="stats"?"active":""}">
      Estadísticas
    </button>

    <button id="tab-matches" class="${tab==="matches"?"active":""}">
      Partidos
    </button>
  </div>

  <div id="lista-content"></div>
`;

  document.getElementById("tab-matches").onclick=()=>{
  state.listaTab="matches";
  renderScreen("lista");
 };

  document.getElementById("tab-toma").onclick=()=>{
    state.listaTab="toma";
    renderScreen("lista");
  };

  document.getElementById("tab-stats").onclick=()=>{
    state.listaTab="stats";
    renderScreen("lista");
  };

  const content=document.getElementById("lista-content");

  if(tab==="toma"){
  renderListaToma(content,data);
}
else if(tab==="stats"){
  renderListaStats(content,data);
}
else{
  renderListaMatches(content);
}


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

    <div id="attendance-area"></div>

    <div id="modal-container"></div>
  `;

  let currentYear = state.calYear ?? today.getFullYear();
  let currentMonth = state.calMonth ?? today.getMonth();

  const calendarDiv=document.getElementById("calendar");
  const title=document.getElementById("cal-title");

  function draw(){
    title.textContent = getMonthLabel(currentYear,currentMonth);

    // guardar estado mes/año
    state.calYear = currentYear;
    state.calMonth = currentMonth;

    renderCalendar(calendarDiv,currentYear,currentMonth);
  }

  // navegación meses
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

  // dibujar inicial
  draw();
}


function renderListaMatches(container){

  const cat = state.user.category;
  const matches = state.data[cat].matches || {};

  let html = `
    <h3>Partidos</h3>

    <button class="btn-primary" onclick="createMatch()">
      + Nuevo partido
    </button>
  `;

  Object.keys(matches).sort().forEach(k=>{
    const m = matches[k];

    html+=`
      <div class="player-card">
        <strong>${formatDateFull(k)}</strong>

        <input placeholder="Rival"
          value="${m.rival||""}"
          onchange="updateMatchField('${k}','rival',this.value)">

        <input placeholder="Resultado (x-x)"
          value="${m.result||""}"
          onchange="updateMatchField('${k}','result',this.value)">
      </div>
    `;
  });

  container.innerHTML = html;
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
  state.data[cat].matches[key].result = val;
  saveData();
}

function renderListaStats(container,data){

  const players=data.players||[];
  const sessions=data.sessions||{};
  const matches =
  state.data[state.user.category].matches || {};

  let html=`<h3>Estadísticas</h3>`;

  let ranking=[];

  players.forEach(p=>{

    let presTrain=0;
    let absTrain=0;

    let presMatch=0;
    let absMatch=0;

    // entrenamientos
    Object.values(sessions).forEach(s=>{
      if(s.attendance?.[p.id]===true) presTrain++;
      if(s.attendance?.[p.id]===false) absTrain++;
    });

    // partidos
    Object.values(matches).forEach(m=>{
      if(m.attendance?.[p.id]===true) presMatch++;
      if(m.attendance?.[p.id]===false) absMatch++;
    });

    const totalTrain=presTrain+absTrain;
    const totalMatch=presMatch+absMatch;

    const pctTrain=
      totalTrain?Math.round((presTrain/totalTrain)*100):0;

    const pctMatch=
      totalMatch?Math.round((presMatch/totalMatch)*100):0;

    html+=`
      <div class="card">
        <strong>${p.name}</strong><br>

        Entrenamientos:
        ${presTrain}/${totalTrain} (${pctTrain}%)<br>

        Partidos:
        ${presMatch}/${totalMatch} (${pctMatch}%)
      </div>
    `;

    ranking.push({
      name:p.name,
      pres:presTrain+presMatch
    });
  });

  // 👉 ranking
  ranking.sort((a,b)=>b.pres-a.pres);

  html+=`<h3>Ranking asistencia</h3>`;

  ranking.forEach((r,i)=>{
    html+=`
      <div>
        ${i+1}° ${r.name} — ${r.pres} presencias
      </div>
    `;
  });

  container.innerHTML=html;
}

function renderAgenda(container,data){

  const sessions=data.sessions||{};
  const todayKey=getLocalDateKey(new Date());

  // agrupar por mes
  const months={};

  Object.keys(sessions).forEach(dateKey=>{
    const d=new Date(dateKey);
    const m=d.getMonth();
    const y=d.getFullYear();
    const label=`${y}-${m}`;

    if(!months[label]) months[label]=[];
    months[label].push(dateKey);
  });

  // selector de mes
  let monthOptions="";
  Object.keys(months).sort().forEach(label=>{
    const [y,m]=label.split("-");
    const name=new Date(y,m)
      .toLocaleString("es",{month:"long",year:"numeric"});
    monthOptions+=`<option value="${label}">${name}</option>`;
  });

  let html=`
    <h2>Agenda</h2>

    <select id="monthFilter">
      ${monthOptions}
    </select>

    <div id="agendaList"></div>
    <div id="modal-container"></div>
  `;

  container.innerHTML=html;

  const select=document.getElementById("monthFilter");
  const list=document.getElementById("agendaList");

  function drawMonth(label){

    if(!months[label]) return;

    let grid=`<div class="annual-grid">`;

    months[label]
      .sort()
      .forEach(dateKey=>{

        const date=formatDate(dateKey);

        let status="";
        let bg="white";

        if(dateKey===todayKey){
          status="🟢 Sesión activa";
          bg="#E8F5E9";
        }
        else if(dateKey<todayKey){
          status="Sesión pasada";
          bg="#f2f2f2";
        }

        grid+=`
          <div class="annual-card"
            onclick="openSessionDetail('${dateKey}')"
            style="background:${bg};">

            <strong>${date}</strong>
            <div>Entrenamiento</div>
            <small>${status}</small>

          </div>
        `;
      });

    grid+="</div>";
    list.innerHTML=grid;
  }

  select.onchange=()=>drawMonth(select.value);

  // mes actual por defecto
  const now=new Date();
  const current=`${now.getFullYear()}-${now.getMonth()}`;
  select.value=current;
  drawMonth(current);
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

function editPlayer(i){

  const p=state.data[state.user.category].players[i];

  p.name=prompt("Nombre",p.name);
  p.birth=prompt("Nacimiento",p.birth);
  p.number=prompt("Número",p.number);

  saveData();
  renderScreen("plantel");
}

function deletePlayer(i){

  state.data[state.user.category].players.splice(i,1);
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