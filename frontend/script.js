const API = "http://127.0.0.1:8000";

// Save token
function saveToken(token){
    localStorage.setItem("token", token);
    window.location = "dashboard.html";
}

// REGISTER
async function register(){
    const email = regEmail.value;
    const password = regPassword.value;

    const res = await fetch(API + "/auth/register", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({email, password})
    });

    alert((await res.json()).message);
}

// LOGIN
async function login(){
    const email = loginEmail.value;
    const password = loginPassword.value;

    const res = await fetch(API + "/auth/login", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({email, password})
    });

    const data = await res.json();
    saveToken(data.access_token);
}

let allTasks = [];

async function loadTasks(status = null, sort = "due") {
    const token = localStorage.getItem("token");
    let url = API + "/tasks?sort=" + sort;
    if (status) url += "&status=" + status;

    const res = await fetch(url, {
        headers: { "Authorization": "Bearer " + token }
    });

    allTasks = await res.json();
    renderTasks();
}

function getTimeLeft(dueDate) {
    if (!dueDate) return "No deadline";

    const now = new Date();
    const diff = new Date(dueDate) - now;

    if (diff <= 0) return "OVERDUE";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}

function renderTasks() {
    taskList.innerHTML = "";

    allTasks.forEach((t, index) => {
        const li = document.createElement("li");

        // Drag & drop setup
        li.draggable = true;
        li.dataset.index = index;

        if (t.overdue) li.classList.add("overdue");

        const timeLeftText = getTimeLeft(t.due_date);
        const due = t.due_date
            ? new Date(t.due_date).toDateString()
            : "No deadline";

        // Priority text
        let pText = "Low";
        if (t.priority == 2) pText = "Medium";
        if (t.priority == 3) pText = "High";

        li.innerHTML = `
            <b>${t.title}</b> (${t.status})
            <br>${timeLeftText}
            <br>${due}
            <br>${pText}
            ${t.overdue ? "<br><b>OVERDUE</b>" : ""}
            <br>
            <button onclick="toggle('${t._id}')">Toggle</button>
            <button onclick="editTask(${index})">Edit</button>
            <button onclick="deleteTask('${t._id}')">Delete</button>
        `;

        // Drag & drop handlers
        li.addEventListener("dragstart", dragStart);
        li.addEventListener("dragover", dragOver);
        li.addEventListener("drop", drop);

        taskList.appendChild(li);
    });
}

let draggedIndex = null;

function dragStart(e){
    draggedIndex = e.target.dataset.index;
}

function dragOver(e){
    e.preventDefault();
}

function drop(e){
    const targetIndex = e.target.closest("li").dataset.index;
    const temp = allTasks[draggedIndex];
    allTasks.splice(draggedIndex,1);
    allTasks.splice(targetIndex,0,temp);
    renderTasks();
}

// auto-refresh countdown every minute
setInterval(() => {
    if (allTasks.length) renderTasks();
}, 60000);

async function createTask(){
    const token = localStorage.getItem("token");

    await fetch(API + "/tasks", {
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":"Bearer " + token
        },
        body: JSON.stringify({
            title: title.value,
            description: desc.value,
            due_date: due.value,
            priority: priority.value
        })
    });

    // RESET FIELDS
    title.value = "";
    desc.value = "";
    due.value = "";
    priority.value = "1";

    loadTasks();
}

async function toggle(id){
    const token = localStorage.getItem("token");
    await fetch(API + "/tasks/" + id + "/toggle", {
        method:"PATCH",
        headers:{ "Authorization":"Bearer " + token }
    });
    loadTasks();
}

// DELETE
async function deleteTask(id){
    const token = localStorage.getItem("token");

    await fetch(API + "/tasks/" + id, {
        method:"DELETE",
        headers:{ "Authorization":"Bearer " + token }
    });

    loadTasks();
}

// Auto-load on dashboard
if (window.location.pathname.includes("dashboard")){
    loadTasks();
}

async function getSuggestion(){
    const token = localStorage.getItem("token");
    const res = await fetch(API + "/tasks/suggest", {
        headers:{ "Authorization":"Bearer " + token }
    });
    const data = await res.json();
    ai.innerText = data.suggestion;
}

function focus(){
    if(allTasks.length == 0) return;

    const best = allTasks[0]; // highest urgency
    focusBox.innerHTML = `
        <h3>FOCUS</h3>
        <b>${best.title}</b>
        <p>${best.description}</p>
        <p>${getTimeLeft(best.due_date)}</p>
        <button onclick="toggle('${best._id}')">Mark Done</button>
    `;
}

let lastReminder = "";

setInterval(() => {
    if(allTasks.length == 0) return;

    const urgent = allTasks[0];

    const time = getTimeLeft(urgent.due_date);

    let message = "";
    if(urgent.overdue) {
        message = `You missed "${urgent.title}". Fix it.`;
    }
    else if(time.includes("m")) {
        message = `"${urgent.title}" is due in ${time}`;
    }
    else if(urgent.priority >= 3) {
        message = `High priority: ${urgent.title}`;
    }

    if(message && message !== lastReminder){
        alert(message);
        lastReminder = message;
    }
}, 60000);

let editingTask = null;

function editTask(index){
    const t = allTasks[index];
    editingTask = t;

    eTitle.value = t.title;
    eDesc.value = t.description || "";
    eDue.value = t.due_date || "";
    ePriority.value = t.priority;

    editBox.style.display = "block";
}

async function saveEdit(){
    const token = localStorage.getItem("token");

    await fetch(API + "/tasks/" + editingTask._id, {
        method:"PUT",
        headers:{
            "Content-Type":"application/json",
            "Authorization":"Bearer " + token
        },
        body: JSON.stringify({
            title: eTitle.value,
            description: eDesc.value,
            due_date: eDue.value,
            priority: ePriority.value
        })
    });

    editBox.style.display = "none";
    loadTasks();
}
