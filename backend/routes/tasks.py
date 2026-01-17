from fastapi import APIRouter, Depends, HTTPException
from database import tasks_collection
from models import TaskCreate, TaskUpdate
from utils.deps import get_current_user
from bson import ObjectId
from datetime import datetime, time

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# -------------------------
# Urgency scoring
# -------------------------
def urgency_score(task):
    score = task.get("priority", 1) * 10
    due_date = task.get("due_date")

    if due_date:
        now = datetime.utcnow()
        days_left = (due_date - now).days
        score += max(0, 20 - days_left)

    return score


# -------------------------
# Create task
# -------------------------
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
        "due_date": due_date,      # always datetime or None
        "created_at": datetime.utcnow()
    })

    return {"message": "Task created"}


# -------------------------
# Get tasks
# -------------------------
@router.get("/")
def get_tasks(
    user_id=Depends(get_current_user),
    status: str | None = None,
    sort: str = "due"
):
    query = {"user_id": user_id}
    if status:
        query["status"] = status

    tasks = list(tasks_collection.find(query))
    now = datetime.utcnow()

    for task in tasks:
        task["_id"] = str(task["_id"])
        due_date = task.get("due_date")

        # urgency
        task["urgency"] = urgency_score(task)

        # overdue (datetime vs datetime)
        if due_date and task["status"] != "done":
            task["overdue"] = due_date < now
        else:
            task["overdue"] = False

    # Highest urgency first
    tasks.sort(key=lambda x: x["urgency"], reverse=True)
    return tasks


# -------------------------
# Update task
# -------------------------
@router.put("/{task_id}")
def update_task(task_id: str, task: TaskUpdate, user_id=Depends(get_current_user)):
    updates = {k: v for k, v in task.dict().items() if v is not None}

    if "due_date" in updates and updates["due_date"]:
        updates["due_date"] = datetime.combine(updates["due_date"], time.min)

    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id), "user_id": user_id},
        {"$set": updates}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"message": "Task updated"}


# -------------------------
# Delete task
# -------------------------
@router.delete("/{task_id}")
def delete_task(task_id: str, user_id=Depends(get_current_user)):
    result = tasks_collection.delete_one({
        "_id": ObjectId(task_id),
        "user_id": user_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"message": "Task deleted"}


# -------------------------
# Toggle task status
# -------------------------
@router.patch("/{task_id}/toggle")
def toggle_status(task_id: str, user_id=Depends(get_current_user)):
    task = tasks_collection.find_one({
        "_id": ObjectId(task_id),
        "user_id": user_id
    })

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    new_status = "done" if task["status"] != "done" else "todo"

    tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": new_status}}
    )

    return {"status": new_status}


# -------------------------
# Suggest best task
# -------------------------
@router.get("/suggest")
def suggest_task(user_id=Depends(get_current_user)):
    tasks = list(tasks_collection.find({
        "user_id": user_id,
        "status": {"$ne": "done"}
    }))

    if not tasks:
        return {"suggestion": "Nothing to do. Go touch grass."}

    def score(task):
        s = task.get("priority", 1) * 10
        due_date = task.get("due_date")

        if due_date:
            days_left = (due_date - datetime.utcnow()).days
            s += max(0, 20 - days_left)

        return s

    best = max(tasks, key=score)

    return {
        "suggestion": f"Work on: {best['title']}",
        "task_id": str(best["_id"])
    }
