from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.generation import GraphRAG, RagTemplate
from neo4j_graphrag.message_history import InMemoryMessageHistory
from neo4j_graphrag.types import LLMMessage

from .kg import KnowledgeGraphManager
from .db import ChatMetadata


# ------------------------------
# Prompt Template
# ------------------------------
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

    def __init__(self, kg_manager: KnowledgeGraphManager):
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002")

        retriever = VectorRetriever(
            kg_manager.driver,
            index_name="text_embeddings",
            embedder=embedder
        )

        llm = OpenAILLM(
            model_name="gpt-4o",
            model_params={"temperature": 0}
        )

        self.rag = GraphRAG(
            retriever=retriever,
            llm=llm,
            prompt_template=prompt_template
        )

    # -----------------------------------------
    # Function to handle full chat pipeline, instead of it being in main
    # -----------------------------------------
    def handle_chat(self, db, chat_id: int, message_text: str):

        # save user message
        user_message = ChatMetadata(
            role="user",
            content=message_text,
            chat_id=chat_id
        )
        db.add(user_message)
        db.flush()

        # pull full convo history from DB
        messages = (
            db.query(ChatMetadata)
            .filter(ChatMetadata.chat_id == chat_id)
            .order_by(ChatMetadata.id)
            .all()
        )

        # convert DB messages -> GraphRAG MessageHistory
        message_history = InMemoryMessageHistory()

        for msg in messages:
            role = "assistant" if msg.role == "ai" else "user"
            llm_message = LLMMessage(
                role=role,
                content=msg.content
            )
            message_history.add_message(llm_message)

        # run GraphRAG search with full DB history
        response = self.rag.search(
            query_text=message_text,
            message_history=message_history,
            retriever_config={"top_k": 5}
        )

        # save response to DB
        ai_message = ChatMetadata(
            role="ai",
            content=response.answer,
            chat_id=chat_id
        )
        db.add(ai_message)

        return response.answer