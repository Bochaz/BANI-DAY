// ====== CONFIGURA ESTO ======
const JSONBIN_API_KEY = "$2a$10$H00lm6NZqQ17IkrWznOoY.f41PGp.nnyv4/46AR1MQ53W3rnFoHV6";   // X-Master-Key
const BIN_ID = "690a409fae596e708f4472ea";             // el ID del bin
// ============================

// Fechas habilitadas
const PICKABLE = ["2025-12-06","2025-12-13","2025-12-20"];
const WEEKDAYS = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
const month = 11;
const year  = 2025;

// --- JSONBin ---
async function loadData(){
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": JSONBIN_API_KEY }
  });
  if(!res.ok) throw new Error("Error al leer JSONBin");
  const j = await res.json();
  return j.record?.votes ?? {
    "2025-12-06":[],
    "2025-12-13":[],
    "2025-12-20":[]
  };
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
  if(!res.ok) throw new Error("Error al guardar JSONBin");
  return (await res.json()).record.votes;
}

// --- Render calendario ---
function renderCalendar(){
  const $cal = document.getElementById("calendar");
  $cal.innerHTML = "";

  WEEKDAYS.forEach(d=>{
    const h = document.createElement("div");
    h.className = "cal-head";
    h.textContent = d;
    $cal.appendChild(h);
  });

  const first = new Date(year, month, 1);
  const last = new Date(year, month+1, 0);
  const toMonStart = d => (d===0?6:d-1);
  const offset = toMonStart(first.getDay());

  for(let i=0;i<offset;i++){
    const c = document.createElement("div");
    c.className = "cal-cell disabled";
    $cal.appendChild(c);
  }

  for(let day=1; day<=last.getDate(); day++){
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const c = document.createElement("div");
    c.className = "cal-cell";
    c.textContent = day;

    if(PICKABLE.includes(dateStr)){
      c.classList.add("selectable");
      c.addEventListener("click",()=>{
        document.querySelectorAll(".cal-cell.selectable").forEach(el=>el.classList.remove("chosen"));
        c.classList.add("chosen");
        document.getElementById("dateSelect").value = dateStr;
      });
    }else c.classList.add("disabled");
    $cal.appendChild(c);
  }
}

// --- Render listas ---
function renderLists(votes){
  PICKABLE.forEach(date=>{
    const ul = document.getElementById(`l-${date}`);
    const count = document.getElementById(`c-${date}`);
    ul.innerHTML = "";
    const arr = votes[date] ?? [];
    count.textContent = arr.length;

    arr.forEach(name=>{
      const li = document.createElement("li");
      li.textContent = name;

      const del = document.createElement("button");
      del.textContent = "✖";
      del.className = "del-btn";
      del.addEventListener("click", async ()=>{
        if(!confirm(`¿Eliminar a "${name}" de ${date}?`)) return;
        votes[date] = votes[date].filter(n=>n!==name);
        renderLists(votes);
        await saveData(votes).catch(()=>alert("Error al guardar en JSONBin"));
      });

      li.appendChild(del);
      ul.appendChild(li);
    });
  });
}

// --- Principal ---
function norm(s){ return s.trim().replace(/\s+/g," "); }

async function main(){
  renderCalendar();
  let votes = await loadData();
  renderLists(votes);

  const $form = document.getElementById("voteForm");
  const $name = document.getElementById("nameInput");
  const $date = document.getElementById("dateSelect");
  const $msg  = document.getElementById("formMsg");

  // Recuperar nombre almacenado
  const storedName = localStorage.getItem("bani_name");
  if(storedName) $name.value = storedName;

  $form.addEventListener("submit", async e=>{
    e.preventDefault();
    const name = norm($name.value);
    const date = $date.value;

    if(!name || !date){ $msg.textContent="Completá ambos campos."; return; }
    if(!PICKABLE.includes(date)){ $msg.textContent="Fecha inválida."; return; }

    // Guarda el nombre para reutilizar
    localStorage.setItem("bani_name", name);

    // Evita duplicados (case-insensitive)
    votes[date] = votes[date] || [];
    const dup = votes[date].some(n=>n.toLowerCase()===name.toLowerCase());
    if(dup){ $msg.textContent="Ese nombre ya está anotado para esa fecha."; return; }

    votes[date].push(name);
    renderLists(votes);
    $msg.textContent="Guardando…";

    try{
      votes = await saveData(votes);
      renderLists(votes);
      $msg.textContent="Anotado ✅";
      // No limpiamos el nombre, queda en el input
    }catch(err){
      votes[date] = votes[date].filter(n=>n!==name);
      renderLists(votes);
      $msg.textContent="Error al guardar.";
      console.error(err);
    }
  });
}

main();