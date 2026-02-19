from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import os

from .db import DBManager
from .kg import KnowledgeGraphManager
from .rag import TutorManager

# -----------------------------
# DATABASE MANAGER
# -----------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///test.db"
db_manager = DBManager(SQLALCHEMY_DATABASE_URL)


# ------------------------------
# NEO4J KNOWLEDGE GRAPH MANAGER
# ------------------------------
URI = os.environ["NEO4J_URI"]
AUTH = (os.environ["NEO4J_AUTH_USER"], os.environ["NEO4J_AUTH_PASS"])
kg_manager = KnowledgeGraphManager(URI, AUTH)


# ------------------------------
# LLM + GraphRAG MANAGER
# ------------------------------
tutor_manager = TutorManager(kg_manager, os.environ["OPENAI_API_KEY"])


# ------------------------------
# API datatypes
# ------------------------------
class Message(BaseModel):
    message: str


class AuthRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


# ------------------------------
# FastAPI app
# ------------------------------
app = FastAPI()


@app.post("/generate_response")
def generate_response(request: Message) -> Message:
    response = tutor_manager.query(request.message)
    return Message(message=response)


@app.post("/signup")
def signup(auth_request: AuthRequest):
    role = auth_request.role if auth_request.role else "Student"

    success = db_manager.user_signup(auth_request.username, auth_request.password, role)

    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")

    return {
        "message": "User signed up successfully",
        "role": role
    }

@app.post("/signin")
def signin(auth_request: AuthRequest):
    role = db_manager.user_signin(auth_request.username, auth_request.password)

    if not role:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "message": "Signed in successfully",
        "role": role
    }

@app.get("/get-graph-info")
def get_graph_info():
    return kg_manager.get_full_graph()