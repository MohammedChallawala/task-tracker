from pymongo import MongoClient
import os

MONGO_URL = "mongodb://localhost:27017"

client = MongoClient(MONGO_URL)

db = client["tasktracker"]

users_collection = db["users"]
tasks_collection = db["tasks"]

def ping_db():
    try:
        client.admin.command("ping")
        print("✅ MongoDB connection successful")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)
