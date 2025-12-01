from fastapi import FastAPI
from pydantic import BaseModel
from neo4j import GraphDatabase
from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.generation import GraphRAG

class Message(BaseModel):
    message: str

# Demo database credentials
URI = "neo4j+s://demo.neo4jlabs.com"
AUTH = ("recommendations", "recommendations")
# Connect to Neo4j database
driver = GraphDatabase.driver(URI, auth=AUTH)

# retriever
embedder = OpenAIEmbeddings(model="text-embedding-ada-002")
retriever = VectorRetriever(
    driver,
    index_name="moviePlotsEmbedding",
    embedder=embedder,
    return_properties=["title", "plot"],
)

# LLM
# Note: the OPENAI_API_KEY must be in the env vars
llm = OpenAILLM(model_name="gpt-4o", model_params={"temperature": 0})

# Initialize the RAG pipeline
rag = GraphRAG(retriever=retriever, llm=llm)

app = FastAPI()

@app.post("/test")
def api_test(request: Message) -> Message:
    # query the graph
    response = rag.search(query_text=request.message, retriever_config={"top_k": 5})

    return Message(message = response.answer)
