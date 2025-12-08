from fastapi import FastAPI
from pydantic import BaseModel
from neo4j import GraphDatabase
from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.generation import GraphRAG, RagTemplate
from neo4j_graphrag.message_history import InMemoryMessageHistory
from neo4j_graphrag.types import LLMMessage
import os

class Message(BaseModel):
    message: str

# Demo database credentials
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
history = InMemoryMessageHistory()

message = LLMMessage(role="assistant", content="Hello!")
history.add_message(message)

app = FastAPI()

@app.post("/test")
def api_test(request: Message) -> Message:
    message = LLMMessage(role="user", content=request.message)
    history.add_message(message)

    # query the graph
    response = rag.search(query_text=request.message, message_history=history, retriever_config={"top_k": 5})

    message = LLMMessage(role="assistant", content=response.answer)
    history.add_message(message)

    return Message(message = response.answer)