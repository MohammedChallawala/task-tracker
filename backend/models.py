from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[datetime] = None
    priority: int = 1

class TaskUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    status: Optional[str]
    priority: Optional[int]
    due_date: Optional[datetime]
    status: str