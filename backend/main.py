from fastapi import FastAPI
from database import ping_db
from routes.auth import router as auth_router
from routes.tasks import router as task_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(task_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    ping_db()

app.include_router(auth_router)

@app.get("/")
def root():
    return {"status": "Task Tracker API is running 🚀"}
