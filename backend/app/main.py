# TODO: split this up into different files

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from neo4j import GraphDatabase
from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.generation import GraphRAG, RagTemplate
from neo4j_graphrag.message_history import InMemoryMessageHistory
from neo4j_graphrag.types import LLMMessage
import os
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# ------------------------------
# Database initialization
# ------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)  # TODO: hash this later

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------------
# LLM + GraphRAG initializaion
# ------------------------------
URI = os.environ["NEO4J_URI"]
AUTH = (os.environ["NEO4J_AUTH_USER"], os.environ["NEO4J_AUTH_PASS"])
# Connect to Neo4j database
driver = GraphDatabase.driver(URI, auth=AUTH)

# retriever
embedder = OpenAIEmbeddings(model="text-embedding-ada-002")
retriever = VectorRetriever(
    driver,
    index_name="text_embeddings",
    embedder=embedder
)

# LLM
# Note: the OPENAI_API_KEY must be in the env vars
llm = OpenAILLM(model_name="gpt-4o", model_params={"temperature": 0})

# Create prompt template
prompt_template = RagTemplate(
    template=''' 
    You are a helpful tutor. Give hints to help guide the user to the answer to their question. 
    Do not outright give the answer. Do not make up answers.

    Context:
        {context}

    Examples:
        {examples}
    
    Question:
        {query_text}
        
    Response:
    ''',
    expected_inputs=["context", "query_text", "examples"]
)

# Initialize the RAG pipeline
rag = GraphRAG(retriever=retriever, llm=llm, prompt_template=prompt_template)

# NOTE: this is assumes only a single session can be used
# TODO: store this in database
history = InMemoryMessageHistory()
message = LLMMessage(role="assistant", content="Hello!")
history.add_message(message)

# ------------------------------
# API datatypes
# ------------------------------
class Message(BaseModel):
    message: str

class AuthRequest(BaseModel):
    username: str
    password: str

# ------------------------------
# FastAPI app
# ------------------------------
app = FastAPI()

@app.post("/test")
def api_test(request: Message) -> Message:
    message = LLMMessage(role="user", content=request.message)
    history.add_message(message)

    response = rag.search(query_text=request.message, message_history=history, retriever_config={"top_k": 5})

    message = LLMMessage(role="assistant", content=response.answer)
    history.add_message(message)

    return Message(message = response.answer)

@app.post("/signup")
def signup(auth_request: AuthRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == auth_request.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    db_user = User(username = auth_request.username,password = auth_request.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"message": "User signed up successfully"}

@app.post("/signin")
def signin(auth_request: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == auth_request.username).first()
    
    if not user or user.password != auth_request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {"message": "Signed in successfully"}
