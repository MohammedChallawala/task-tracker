from fastapi import FastAPI
from database import ping_db
from routes.auth import router as auth_router

app = FastAPI()

@app.on_event("startup")
def startup_db():
    ping_db()

app.include_router(auth_router)

@app.get("/")
def root():
    return {"status": "Task Tracker API is running 🚀"}
