// ====== CONFIGURA ESTO ======
const JSONBIN_API_KEY = "$2a$10$H00lm6NZqQ17IkrWznOoY.f41PGp.nnyv4/46AR1MQ53W3rnFoHV6";   // X-Master-Key
const BIN_ID = "690a409fae596e708f4472ea";             // el ID del bin
// ============================

// Fechas habilitadas
const PICKABLE = ["2025-12-06","2025-12-13","2025-12-20"];
const WEEKDAYS = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"]; // cabezal
const month = 11; // 0-based => 11 = Diciembre
const year  = 2025;

// --- Helpers JSONBin ---
async function loadData(){
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": JSONBIN_API_KEY }
  });
  if(!res.ok) throw new Error("No se pudo leer JSONBin");
  const j = await res.json();
  // Estructura esperada:
  // { record: { votes: { "2025-12-06":[], "2025-12-13":[], "2025-12-20":[] } } }
  return j.record?.votes ?? { "2025-12-06":[], "2025-12-13":[], "2025-12-20":[] };
}

async function saveData(votes){
  const body = { votes };
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_API_KEY
    },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error("No se pudo guardar en JSONBin");
  return (await res.json()).record.votes;
}

// --- UI render: calendario ---
function renderCalendar(){
  const $cal = document.getElementById("calendar");
  $cal.innerHTML = "";

  // Cabezal
  WEEKDAYS.forEach(d => {
    const h = document.createElement("div");
    h.className = "cal-head";
    h.textContent = d;
    $cal.appendChild(h);
  });

  // Diciembre 2025
  const first = new Date(year, month, 1);
  const last  = new Date(year, month+1, 0);
  // GitHub Pages usa domingo como 0. Queremos que el grid empiece en Lunes.
  // Transformamos: getDay() => 0..6 (Dom..Sáb). Queremos 0..6 (Lun..Dom)
  const toMonStart = (d) => (d === 0 ? 6 : d - 1);
  const offset = toMonStart(first.getDay());

  // Celdas vacías previas
  for(let i=0;i<offset;i++){
    const c = document.createElement("div");
    c.className = "cal-cell disabled";
    $cal.appendChild(c);
  }

  // Días del mes
  for(let day=1; day<=last.getDate(); day++){
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const c = document.createElement("div");
    c.className = "cal-cell";
    c.textContent = day;

    if(PICKABLE.includes(dateStr)){
      c.classList.add("selectable");
      c.addEventListener("click", () => {
        document.querySelectorAll(".cal-cell.selectable").forEach(el => el.classList.remove("chosen"));
        c.classList.add("chosen");
        document.getElementById("dateSelect").value = dateStr;
      });
    }else{
      c.classList.add("disabled");
    }
    $cal.appendChild(c);
  }
}

// --- Listados ---
function renderLists(votes){
  PICKABLE.forEach(d=>{
    const ul = document.getElementById(`l-${d}`);
    const count = document.getElementById(`c-${d}`);
    ul.innerHTML = "";
    const arr = votes[d] ?? [];
    count.textContent = arr.length;
    arr.forEach(name=>{
      const li = document.createElement("li");
      li.textContent = name;
      ul.appendChild(li);
    });
  });
}

// --- Lógica de envío ---
function normName(s){ return s.trim().replace(/\s+/g," "); }

async function main(){
  renderCalendar();
  let votes = await loadData().catch(()=>({
    "2025-12-06":[], "2025-12-13":[], "2025-12-20":[]
  }));
  renderLists(votes);

  const $form = document.getElementById("voteForm");
  const $name = document.getElementById("nameInput");
  const $date = document.getElementById("dateSelect");
  const $msg  = document.getElementById("formMsg");

  $form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name = normName($name.value);
    const date = $date.value;

    if(!name || !date){ $msg.textContent = "Completá nombre y fecha."; return; }
    if(!PICKABLE.includes(date)){ $msg.textContent = "Fecha inválida."; return; }

    // Evitar duplicados exactos en esa fecha (insensible a mayúsculas)
    const exists = (votes[date]||[]).some(n => n.toLowerCase() === name.toLowerCase());
    if(exists){ $msg.textContent = "Ese nombre ya está anotado en esa fecha."; return; }

    // Optimista en UI
    votes[date] = votes[date] || [];
    votes[date].push(name);
    renderLists(votes);
    $msg.textContent = "Guardando…";

    try{
      votes = await saveData(votes);
      renderLists(votes);
      $msg.textContent = "Listo ✅";
      $name.value = "";
    }catch(err){
      // Revertir si falló
      votes[date] = votes[date].filter(n=> n !== name);
      renderLists(votes);
      $msg.textContent = "Error al guardar. Probá de nuevo.";
      console.error(err);
    }
  });
}

main();
