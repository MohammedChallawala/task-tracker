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
def get_tasks(
    user_id=Depends(get_current_user),
    status: str = None,
    sort: str = "due"
):
    query = {"user_id": user_id}
    if status:
        query["status"] = status

    sort_field = "due_date" if sort == "due" else "priority"

    tasks = list(tasks_collection.find(query).sort(sort_field, 1))

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

@router.patch("/{task_id}/toggle")
def toggle_status(task_id: str, user_id=Depends(get_current_user)):
    task = tasks_collection.find_one({"_id": ObjectId(task_id), "user_id": user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    new_status = "done" if task["status"] != "done" else "todo"

    tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": new_status}}
    )

    return {"status": new_status}
