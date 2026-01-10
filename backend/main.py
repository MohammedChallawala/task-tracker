from fastapi import FastAPI
from database import ping_db
from routes.auth import router as auth_router
from routes.tasks import router as task_router

app = FastAPI()
app.include_router(task_router)

@app.on_event("startup")
def startup_db():
    ping_db()

app.include_router(auth_router)

@app.get("/")
def root():
    return {"status": "Task Tracker API is running 🚀"}
