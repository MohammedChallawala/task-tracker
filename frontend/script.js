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

// LOAD TASKS
async function loadTasks(){
    const token = localStorage.getItem("token");

    const res = await fetch(API + "/tasks", {
        headers:{ "Authorization":"Bearer " + token }
    });

    const tasks = await res.json();
    taskList.innerHTML = "";

    tasks.forEach(t => {
        const li = document.createElement("li");
        li.innerHTML = `${t.title} - ${t.status}
            <button onclick="deleteTask('${t._id}')">❌</button>`;
        taskList.appendChild(li);
    });
}

// CREATE TASK
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
            description: desc.value
        })
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
