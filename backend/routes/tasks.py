from fastapi import APIRouter, Depends, HTTPException
from database import tasks_collection
from models import TaskCreate, TaskUpdate
from utils.deps import get_current_user
from bson import ObjectId
from datetime import datetime, time

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/")
def create_task(task: TaskCreate, user_id=Depends(get_current_user)):
    due_date = (
        datetime.combine(task.due_date, time.min)
        if task.due_date
        else None
    )

    tasks_collection.insert_one({
        "user_id": user_id,
        "title": task.title,
        "description": task.description,
        "status": "todo",
        "priority": task.priority,
        "due_date": due_date,  # ✅ Mongo-safe
        "created_at": datetime.utcnow()
    })

    return {"message": "Task created"}

@router.get("/")
def get_tasks(user_id=Depends(get_current_user)):
    tasks = list(tasks_collection.find({"user_id": user_id}))
    for t in tasks:
        t["_id"] = str(t["_id"])
    return tasks

@router.put("/{task_id}")
def update_task(task_id: str, task: TaskUpdate, user_id=Depends(get_current_user)):
    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id), "user_id": user_id},
        {"$set": {k: v for k, v in task.dict().items() if v is not None}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"message": "Task updated"}

@router.delete("/{task_id}")
def delete_task(task_id: str, user_id=Depends(get_current_user)):
    result = tasks_collection.delete_one({"_id": ObjectId(task_id), "user_id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"message": "Task deleted"}
