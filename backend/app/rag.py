from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.generation import GraphRAG, RagTemplate
from neo4j_graphrag.message_history import InMemoryMessageHistory
from neo4j_graphrag.types import LLMMessage
from .kg import KnowledgeGraphManager

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


# ------------------------------
# LLM + GraphRAG Tutor manager
# ------------------------------
class TutorManager():
    def __init__(self, kg_manager):
        # retriever
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002")
        retriever = VectorRetriever(
            kg_manager.driver,
            index_name="text_embeddings",
            embedder=embedder
        )

        # LLM
        # Note: the OPENAI_API_KEY must be in the env vars
        llm = OpenAILLM(model_name="gpt-4o", model_params={"temperature": 0})

        # Initialize the RAG pipeline
        self.rag = GraphRAG(retriever=retriever, llm=llm, prompt_template=prompt_template)

        # NOTE: this assumes only a single session can be used
        # TODO: store this in database
        self.history = InMemoryMessageHistory()
        message = LLMMessage(role="assistant", content="Hello!")
        self.history.add_message(message)
    
    # Query the LLM
    def query(self, query_text):
        # Add user message to history
        message = LLMMessage(role="user", content=query_text)
        self.history.add_message(message)

        # Retrieve relevant information and generate response
        response = self.rag.search(
            query_text=query_text,
            message_history=self.history,
            retriever_config={"top_k": 5}
        )

        # Add response to history
        message = LLMMessage(role="assistant", content=response.answer)
        self.history.add_message(message)

        return response.answer