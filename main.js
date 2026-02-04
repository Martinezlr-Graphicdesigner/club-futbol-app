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

  
  if(!state.data.shared){
    state.data.shared = {};
  }

  if(!state.data.shared.matches){
    state.data.shared.matches = {};
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
      renderListaStats(container, data);
      break;
  }
}
/**************************************************
 * SCREENS
 **************************************************/
function renderHome(container, data) {

  const isAdmin = state.user.role === "admin";

  const todayKey = getLocalDateKey(new Date());

  const nextMatchKey = Object.keys(state.data.shared.matches)
    .sort()
    .find(k => k >= todayKey);

  const nextMatch = nextMatchKey
    ? state.data.shared.matches[nextMatchKey]
    : null;

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
      </div>

      <div class="card">
        <h3>Próximo partido</h3>

        ${
          nextMatch
            ? `
              <p><strong>Fecha:</strong> ${formatDateFull(nextMatchKey)}</p>
              <p><strong>Rival:</strong> ${nextMatch.rival}</p>
              <p><strong>Condición:</strong> ${nextMatch.home ? "Local" : "Visitante"}</p>
              <p><strong>Lugar:</strong> ${nextMatch.location}</p>
            `
            : `<p>No hay partidos cargados</p>`
        }

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
    const match = state.data.shared.matches?.[dateKey];
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

  const matches=state.data.shared.matches||{};

  let html="<h3>Resultados</h3>";

  Object.keys(matches).sort().forEach(k=>{

    const m=matches[k];

    html+=`
      <div class="player-card">
        <strong>${formatDateFull(k)}</strong>
        <div>${m.rival||""}</div>

        <input placeholder="Resultado (x-x)"
          value="${m.result||""}"
          onchange="saveResult('${k}',this.value)">
      </div>
    `;
  });

  container.innerHTML=html;
}

function saveResult(key,val){
  state.data.shared.matches[key].result=val;
  saveData();
}

function renderListaStats(container,data){

  const players=data.players||[];
  const sessions=data.sessions||{};
  const matches=state.data.shared.matches||{};

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

  let cards="";

  Object.keys(sessions)
    .sort()
    .forEach(dateKey=>{

      const s=sessions[dateKey];
      const date=formatDate(dateKey);

      let status="";

      if(dateKey===todayKey){
        status=`<span style="color:green;">🟢 Sesión activa</span>`;
      }
      else if(dateKey<todayKey){
        status=`<span style="color:gray;">Sesión pasada</span>`;
      }

      cards+=`
        <div class="annual-card"
          onclick="openSessionDetail('${dateKey}')">

          <strong>${date}</strong>
          <div>Entrenamiento</div>
          <small>${status}</small>

        </div>
      `;
    });

  container.innerHTML=`
    <h2>Agenda</h2>
    <div class="annual-grid">
      ${cards}
    </div>
    <div id="modal-container"></div>
  `;
}

function openMatchDetail(dateKey){

  const isAdmin = state.user.role==="admin";
  const match = state.data.shared.matches[dateKey] || {};

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

function saveMatch(dateKey){

  if(!state.data.shared){
    state.data.shared = {};
  }

  if(!state.data.shared.matches){
    state.data.shared.matches = {};
  }

  state.data.shared.matches[dateKey] = {
    rival: document.getElementById("m-rival").value,
    location: document.getElementById("m-location").value,
    home: document.getElementById("m-home").value === "true",
    result: "",
    attendance: {}
  };

  saveData();
  closeTraining();
  alert("Partido guardado correctamente");
}


function openMatchAttendance(dateKey){

  const cat = state.user.category;
  const players = state.data[cat].players || [];
  const isAdmin = state.user.role === "admin";

  const match = state.data.shared.matches[dateKey];

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

  const match = state.data.shared.matches[dateKey];

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
  const matches=state.data.shared?.matches||{};
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

  const match=state.data.shared.matches?.[dateKey];
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
function renderPlantel(container,data){

  const cat = state.user.category;
  const isAdmin = state.user.role==="admin";

  let players=data.players||[];

  let html=`<h3>Plantel</h3>`;

  // 👉 FORM ALTA JUGADOR
  if(isAdmin){
    html+=`
      <div class="card">
        <input id="p-name" placeholder="Nombre y Apellido">
        <input id="p-birth" type="date">
        <input id="p-number" placeholder="Número camiseta" type="number">
        <button onclick="addPlayer()">Agregar jugador</button>
      </div>
    `;
  }

  // 👉 LISTA
  players.forEach(p=>{

    html+=`
      <div class="player-card">

        ${
          isAdmin
          ? `
            <input value="${p.name||""}" 
              onchange="editPlayer('${p.id}','name',this.value)">

            <input type="date" value="${p.birth||""}" 
              onchange="editPlayer('${p.id}','birth',this.value)">

            <input type="number" value="${p.number||""}" 
              onchange="editPlayer('${p.id}','number',this.value)">

            <button onclick="deletePlayer('${p.id}')">
              Eliminar
            </button>
          `
          : `
            <strong>${p.name}</strong>
            <div>Nacimiento: ${p.birth||"-"}</div>
            <div>Camiseta: ${p.number||"-"}</div>
          `
        }

      </div>
    `;
  });

  container.innerHTML=html;
}

function addPlayer(){

  const cat=state.user.category;

  const name=document.getElementById("p-name").value;
  const birth=document.getElementById("p-birth").value;
  const number=document.getElementById("p-number").value;

  if(!name) return alert("Nombre requerido");

  const id=Date.now().toString();

  state.data[cat].players.push({
    id,
    name,
    birth,
    number
  });

  saveData();
  renderScreen("plantel");
}

function editPlayer(id,field,value){

  const cat=state.user.category;

  const p=state.data[cat].players.find(x=>x.id==id);
  if(!p) return;

  p[field]=value;

  saveData();
}

function deletePlayer(id){

  const cat=state.user.category;

  state.data[cat].players=
    state.data[cat].players.filter(p=>p.id!=id);

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