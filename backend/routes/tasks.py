from fastapi import APIRouter, Depends, HTTPException
from database import tasks_collection
from models import TaskCreate, TaskUpdate
from utils.deps import get_current_user
from bson import ObjectId
from datetime import datetime, time

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def urgency_score(t):
    score = t.get("priority", 1) * 10

    if t.get("due_date"):
        due_date = t["due_date"]

        # Convert datetime → date if needed
        if isinstance(due_date, datetime):
            due_date = due_date.date()

        today = datetime.utcnow().date()
        days = (due_date - today).days

        score += max(0, 20 - days)

    return score

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
    sort: str = "due"  # kept for compatibility
):
    query = {"user_id": user_id}
    if status:
        query["status"] = status

    tasks = list(tasks_collection.find(query))
    now = datetime.utcnow().date()

    for t in tasks:
        t["_id"] = str(t["_id"])

        # Normalize due_date to date (IMPORTANT)
        due_date = t.get("due_date")
        if isinstance(due_date, datetime):
            due_date = due_date.date()

        # Compute urgency (uses normalized date internally)
        t["urgency"] = urgency_score(t)

        # Determine overdue status
        if due_date and t["status"] != "done":
            t["overdue"] = due_date < now
        else:
            t["overdue"] = False

    # Sort by urgency (highest first)
    tasks.sort(key=lambda x: x["urgency"], reverse=True)

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

@router.get("/suggest")
def suggest_task(user_id=Depends(get_current_user)):
    tasks = list(tasks_collection.find({
        "user_id": user_id,
        "status": {"$ne": "done"}
    }))

    if not tasks:
        return {"suggestion": "Nothing to do. Go touch grass."}

    def score(t):
        s = t.get("priority", 1) * 10

        due_date = t.get("due_date")
        if isinstance(due_date, datetime):
            due_date = due_date.date()

        if due_date:
            days = (due_date - datetime.utcnow().date()).days
            s += max(0, 20 - days)

        return s

    best = max(tasks, key=score)

    return {
        "suggestion": f"Work on: {best['title']}",
        "task_id": str(best["_id"])
    }

