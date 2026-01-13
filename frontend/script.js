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

async function loadTasks(status=null, sort="due"){
    const token = localStorage.getItem("token");
    let url = API + "/tasks?sort=" + sort;
    if(status) url += "&status=" + status;

    const res = await fetch(url, {
        headers:{ "Authorization":"Bearer " + token }
    });

    const tasks = await res.json();
    taskList.innerHTML = "";

    tasks.forEach(t => {
        const li = document.createElement("li");
        if(t.overdue) li.classList.add("overdue");

        li.innerHTML = `
            <b>${t.title}</b> (${t.status})
            ${t.overdue ? "🔥 OVERDUE" : ""}
            <button onclick="toggle('${t._id}')">Toggle</button>
            <button onclick="deleteTask('${t._id}')">❌</button>
        `;
    taskList.appendChild(li);
    });
}

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
