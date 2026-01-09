from fastapi import APIRouter, HTTPException
from models import UserRegister, UserLogin
from database import users_collection
from utils.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserRegister):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    users_collection.insert_one({
        "email": user.email,
        "password": hash_password(user.password)
    })

    return {"message": "User registered successfully"}

@router.post("/login")
def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": str(db_user["_id"])})
    return {"access_token": token}
