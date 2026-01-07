from fastapi import FastAPI
from database import ping_db

app = FastAPI()

@app.on_event("startup")
def startup_db():
    ping_db()

@app.get("/")
def root():
    return {"status": "Task Tracker API is running 🚀"}
