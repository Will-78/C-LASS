from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

from .db import DBManager, ChatRecord, User
from .kg import KnowledgeGraphManager
from .rag import TutorManager


# -----------------------------
# DATABASE
# -----------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///test.db"
db_manager = DBManager(SQLALCHEMY_DATABASE_URL)


# ------------------------------
# NEO4J KNOWLEDGE GRAPH MANAGER
# ------------------------------
URI = os.environ["NEO4J_URI"]
AUTH = (
    os.environ["NEO4J_AUTH_USER"],
    os.environ["NEO4J_AUTH_PASS"]
)
kg_manager = KnowledgeGraphManager(URI, AUTH)


# ------------------------------
# LLM + GraphRAG MANAGER
# ------------------------------
tutor_manager = TutorManager(kg_manager)


# ------------------------------
# FASTAPI APP
# ------------------------------
app = FastAPI()


# ------------------------------
# API MODELS
# ------------------------------
class ChatRequest(BaseModel):
    username: str
    chat_id: Optional[int] = None
    message: str


class AuthRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


# ------------------------------
# CHAT ENDPOINT
# ------------------------------
@app.post("/chat")
def chat(request: ChatRequest):

    with db_manager.session_scope() as db:

        # Get user
        user_obj = db.query(User).filter(
            User.username == request.username
        ).first()

        if not user_obj:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Create new chat if first message
        if request.chat_id is None:
            new_chat = ChatRecord(user_id=user_obj.id)
            db.add(new_chat)
            db.flush()
            chat_id = new_chat.id
        else:
            chat_id = request.chat_id

        # delegate chat handling to TutorManager
        response_text = tutor_manager.handle_chat(
            db=db,
            chat_id=chat_id,
            message_text=request.message
        )

        return {
            "chat_id": chat_id,
            "response": response_text
        }


# ------------------------------
# AUTH
# ------------------------------
@app.post("/signup")
def signup(auth_request: AuthRequest):

    role = auth_request.role if auth_request.role else "Student"

    success = db_manager.user_signup(
        auth_request.username,
        auth_request.password,
        role
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    return {
        "message": "User signed up successfully",
        "role": role
    }


@app.post("/signin")
def signin(auth_request: AuthRequest):

    role = db_manager.user_signin(
        auth_request.username,
        auth_request.password
    )

    if not role:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    return {
        "message": "Signed in successfully",
        "role": role
    }


# ------------------------------
# KNOWLEDGE GRAPH ENDPOINT
# ------------------------------
@app.get("/get-graph-info")
def get_graph_info():
    return kg_manager.get_full_graph()