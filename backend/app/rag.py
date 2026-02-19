from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.message_history import InMemoryMessageHistory
from neo4j_graphrag.types import LLMMessage
from .kg import KnowledgeGraphManager
from langchain_core.messages import get_buffer_string
from langchain_core.prompts import PromptTemplate
from openai import OpenAI

# Define templates
REPHRASER_PROMPT_TEMPLATE = """
Given the following CHAT HISTORY and a FOLLOW-UP QUESTION, 
rephrase the FOLLOW-UP QUESTION to be a STANDALONE QUERY. 
The STANDALONE QUERY should contain all the context needed to search 
a knowledge graph (Neo4j) effectively, even without the history.

Do NOT answer the question. Just return the rewritten query.

CHAT HISTORY:
{chat_history}

FOLLOW-UP QUESTION:
{question}

STANDALONE QUERY:"""

PROMPT_TEMPLATE="""
INSTRUCTIONS:
You are a helpful tutor.
Give hints to help guide the user to the answer to the QUESTION using the CONTEXT below.
Keep your RESPONSE grounded in the facts of the CONTEXT.
If the CONTEXT doesn't contain the facts to answer the QUESTION, repond: 'I do not have complete information to answer this question.'
Do not outright give the answer becuse you are a helpful tutor.

CONTEXT:
{context}

QUESTION:
{question}
    
RESPONSE:"""


# ------------------------------
# LLM + GraphRAG Tutor manager
# ------------------------------
class TutorManager():
    def __init__(self, kg_manager, api_key):
        # initialize retriever
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002")
        self.retriever = VectorRetriever(
            kg_manager.driver,
            index_name="text_embeddings",
            embedder=embedder
        )

        # initialize LLM
        self.client = OpenAI(api_key=api_key)

        # initialize history
        self.history = []
    
    # GraphRAG context search
    def context_search(self, query_text):
        # Format the last 5 chats in history for rephrasing
        formatted_history = ""
        for msg in self.history[-5:]:
            formatted_history += f"{msg['role'].upper()}: {msg['content']}\n"
        
        # Format the prompt
        formatted_prompt = REPHRASER_PROMPT_TEMPLATE.format(
            chat_history=formatted_history, 
            question=query_text
        )

        # Rephrase history and question for search
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": formatted_prompt}],
            temperature=0
        )

        print(response.choices[0].message.content)

        # GraphRAG using rephrased query
        rag_context = self.retriever.search(
            query_text=response.choices[0].message.content, 
            top_k=5
        )
    
        return rag_context
    
    # Query the LLM
    def query(self, query_text):
        # Retrieve context
        rag_context = self.context_search(query_text)

        # Format the prompt
        formatted_prompt = PROMPT_TEMPLATE.format(
            context=rag_context,
            question=query_text
        )

        # Stream response generation
        full_response = ""
        stream = self.client.chat.completions.create(
            model="gpt-4o", 
            messages=self.history + [{"role": "user", "content": formatted_prompt}], 
            stream=True
        )
        
        for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            yield content
            full_response += content

        # Add user message to history
        self.history.append({"role": "user", "content": query_text})
        # Add response to history
        self.history.append({"role": "assistant", "content": full_response})

        return full_response