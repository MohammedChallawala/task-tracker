const API = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      login();
    });
  }
});

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

let isFocused = false;
let focusedTaskId = null;

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

function getTimeLeft(due){
    if(!due) return "No deadline";

    const now = new Date();
    const end = new Date(due);
    const diff = end - now;

    if(diff <= 0) return "OVERDUE";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if(days > 0) return `${days}d ${hours % 24}h`;
    if(hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}

async function loadDeletedTasks(){
    const token = localStorage.getItem("token");

    const res = await fetch(API + "/tasks/deleted", {
        headers: { "Authorization": "Bearer " + token }
    });

    const deletedTasks = await res.json();

    const container = document.getElementById("deletedTasksContainer");
    const list = document.getElementById("deletedTaskList");
    list.innerHTML = "";

    deletedTasks.forEach(t => {
        const li = document.createElement("li");
        li.innerHTML = `
            <b>${t.title}</b>
            <br>Deleted at: ${new Date(t.deleted_at).toLocaleString()}
            <br>Original due: ${t.due_date ? new Date(t.due_date).toLocaleString() : "None"}
            <br>Priority: ${t.priority}
        `;
        list.appendChild(li);
    });

    container.style.display = "block";
}

function renderTasks() {
    taskList.innerHTML = "";

    const tasksToRender = isFocused
        ? allTasks.filter(t => t._id === focusedTaskId)
        : allTasks;

    tasksToRender.forEach((t, index) => {
        const li = document.createElement("li");

        // Drag & drop setup (only when not focused)
        if (!isFocused) {
            li.draggable = true;
            li.dataset.index = index;

            li.addEventListener("dragstart", dragStart);
            li.addEventListener("dragover", dragOver);
            li.addEventListener("drop", drop);
        }

        if (t.overdue) li.classList.add("overdue");
        if (isFocused) li.classList.add("focused");

        const timeLeftText = getTimeLeft(t.due_date);
        const due = t.due_date
            ? new Date(t.due_date).toDateString()
            : "No deadline";

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
    delete reminderState[id];
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

function focusTask() {
    if (!isFocused) {
        if (allTasks.length === 0) return;

        const best = allTasks[0]; // highest urgency
        focusedTaskId = best._id;
        isFocused = true;

        focusBox.innerHTML = `
            <h3>FOCUS</h3>
            <b>${best.title}</b>
            <p>${best.description}</p>
            <p>${getTimeLeft(best.due_date)}</p>
            <button onclick="toggle('${best._id}')">Mark Done</button>
        `;

        document.getElementById("focusBtn").innerText = "Unfocus";
    } else {
        // UNFOCUS
        isFocused = false;
        focusedTaskId = null;

        focusBox.innerHTML = "";
        document.getElementById("focusBtn").innerText = "Focus";
    }

    renderTasks();
}

const REMINDER_POINTS = [
    { label: "1 day", minutes: 1440 },
    { label: "12 hours", minutes: 720 },
    { label: "1 hour", minutes: 60 },
    { label: "5 minutes", minutes: 5 }
];

// GLOBAL reminder memory (must survive reloads of tasks)
const reminderState = {};

function minutesLeft(due) {
    if (!due) return null;
    return Math.floor((new Date(due) - new Date()) / 60000);
}

function startReminderLoop() {
    setInterval(() => {
        allTasks.forEach(task => {

            if (task.status === "done" || !task.due_date) return;

            if (!reminderState[task._id]) {
                reminderState[task._id] = new Set();
            }

            const mins = minutesLeft(task.due_date);
            if (mins === null) return;

            // OVERDUE — ONCE ONLY
            if (mins < 0) {
                if (!reminderState[task._id].has("overdue")) {
                    alert(`OVERDUE: "${task.title}"`);
                    reminderState[task._id].add("overdue");
                }
                return;
            }

            // THRESHOLD REMINDERS
            REMINDER_POINTS.forEach(r => {
                if (
                    mins <= r.minutes &&
                    mins > r.minutes - 2 &&
                    !reminderState[task._id].has(r.label)
                ) {
                    alert(`${r.label} left for "${task.title}"`);
                    reminderState[task._id].add(r.label);
                }
            });

        });
    }, 60000);
}

// ENSURE THIS RUNS ONLY ONCE
if (!window.__reminderIntervalStarted) {
    window.__reminderIntervalStarted = true;
    startReminderLoop();
}

let editingTask = null;

function editTask(index){
    const t = allTasks[index];
    editingTask = t;

    eTitle.value = t.title;
    eDesc.value = t.description || "";
    eDue.value = t.due_date
    ? new Date(t.due_date).toISOString().slice(0,16)
    : "";
    ePriority.value = t.priority;

    editBox.style.display = "block";
}

async function saveEdit() {
    const token = localStorage.getItem("token");

    const res = await fetch(API + "/tasks/" + editingTask._id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            title: eTitle.value,
            description: eDesc.value,
            due_date: eDue.value,
            priority: ePriority.value,
            status: editingTask.status
        })
    });

    const data = await res.json();
if (!res.ok) {
    const err = await res.json();
    console.error("Failed to update task:", err);
    alert("Could not update task");
    return;
    }
    delete reminderState[editingTask._id];
    editBox.style.display = "none";
    loadTasks();
}

