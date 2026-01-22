from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("uri")

client = MongoClient(MONGO_URL)

db = client["tasktracker"]

users_collection = db["users"]
tasks_collection = db["tasks"]
deleted_tasks_collection = db["deleted_tasks"]


def ping_db():
    try:
        client.admin.command("ping")
        print("MongoDB connection successful")
    except Exception as e:
        print("MongoDB connection failed:", e)
