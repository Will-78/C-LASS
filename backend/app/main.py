from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from typing import List
import shutil
import os
import random

from .db import DBManager
from .kg import KnowledgeGraphManager
from .rag import TutorManager

# -----------------------------
# DATABASE MANAGER
# -----------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///test.db"
db_manager = DBManager(SQLALCHEMY_DATABASE_URL)

# -----------------------------
# NEO4J KNOWLEDGE GRAPH MANAGER
# -----------------------------
URI = os.environ["NEO4J_URI"]
AUTH = (os.environ["NEO4J_AUTH_USER"], os.environ["NEO4J_AUTH_PASS"])
kg_manager = KnowledgeGraphManager(URI, AUTH)

# -----------------------------
# LLM + GraphRAG MANAGER
# -----------------------------
tutor_manager = TutorManager(
    kg_manager,
    db_manager,
    os.environ["OPENAI_API_KEY"]
)

# -----------------------------
# API datatypes
# -----------------------------
class Chat(BaseModel):
    chat_id: int
    title: str
    
class Message(BaseModel):
    message: str
    chat_id: Optional[int] = None
    role: Optional[str] = None

class ChatHistoryRequest(BaseModel):
    chat_id: int
    num_chats: Optional[int] = None

class CreateChatRequest(BaseModel):
    username: str
    message: str

class GetChatsRequest(BaseModel):
    username: str

class AuthRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


# -----------------------------
# Request model to save teacher prompt
# -----------------------------
class TeacherPromptRequest(BaseModel):
    username: str
    prompt: str

# -----------------------------
# Request model to get teacher prompt
# -----------------------------
class GetTeacherPromptRequest(BaseModel):
    username: str


# -----------------------------
# FastAPI app
# -----------------------------
app = FastAPI()


@app.post("/generate_response")
def generate_response(request: Message):
    if not request.chat_id:
        raise HTTPException(status_code=404, detail="Invalid Chat ID")
    
    return StreamingResponse(
        tutor_manager.query(request.chat_id, request.message),
        media_type="text/plain"
    )


# TODO: Parameter should possibly be user id
@app.post("/get-user-chats")
def generate_response(request: GetChatsRequest):
    chats = db_manager.retrieve_chats(request.username)
    return [Chat(chat_id=chat_id, title=title) for chat_id, title in chats]


@app.post("/get-chat-history")
def get_chat_history(request: ChatHistoryRequest):
    messages = db_manager.retrieve_history(request.chat_id, request.num_chats)
    return messages


@app.post("/create-chat")
def create_chat(request: CreateChatRequest):
    chat_id = db_manager.create_chat(request.username, request.message)
    if chat_id is None:
        raise HTTPException(status_code=400, detail="Failed to create chat")
    return {"chat_id": chat_id}


@app.post("/signup")
def signup(auth_request: AuthRequest):
    role = auth_request.role if auth_request.role else "Student"

    success = db_manager.user_signup(
        auth_request.username,
        auth_request.password,
        role
    )

    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")

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
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "message": "Signed in successfully",
        "role": role
    }


# -----------------------------
# Endpoint to save/update teacher prompt
# -----------------------------
@app.post("/set-teacher-prompt")
def set_teacher_prompt(request: TeacherPromptRequest):
    success = db_manager.set_teacher_prompt(request.username, request.prompt)

    if not success:
        raise HTTPException(status_code=400, detail="Failed to save prompt")

    return {"message": "Prompt saved"}


# -----------------------------
# Endpoint to retrieve teacher prompt
# -----------------------------
@app.post("/get-teacher-prompt")
def get_teacher_prompt(request: GetTeacherPromptRequest):
    prompt = db_manager.get_teacher_prompt(request.username)
    return {"prompt": prompt}


@app.get("/get-graph-info")
def get_graph_info():
    return kg_manager.get_full_graph()


@app.post("/save-graph-info")
def save_graph_info(graph_data: dict):
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    entitiesToDelete = graph_data.get("entitiesToDelete", [])

    try:
        for node in nodes:
            kg_manager.create_or_update_node(
                node["id"],
                node["labels"],
                node["properties"]
            )

        for edge in edges:
            kg_manager.create_or_update_relationship(
                edge["from"],
                edge["to"],
                edge["type"],
                edge["properties"]
            )

        for entity in entitiesToDelete:
            if entity[0] == "node":
                kg_manager.delete_node(entity[1])
            elif entity[0] == "rel":
                kg_manager.delete_relationship_by_id(entity[1])

    except Exception as e:
        print(f"Error saving graph information: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Graph information saved successfully"}

@app.post("/document-kg-builder")
async def document_kg_builder(files: List[UploadFile] = File(...)):
    upload_dir = "/tmp/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    try:
        for file in files:
            # Save uploaded file to temporary directory
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Run document kg builder
            await kg_manager.document_kg_builder(file_path)
            
            # Clean up after processing
            os.remove(file_path)
    except Exception as e:
        print(f"Error from document upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": f"Successfuly uploaded files"}