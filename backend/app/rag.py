from neo4j_graphrag.retrievers import HybridCypherRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from openai import AsyncOpenAI

# ------------------------------
# REPHRASER PROMPT
# ------------------------------
REPHRASER_PROMPT_TEMPLATE = """
Given the following CHAT HISTORY and a FOLLOW-UP QUESTION, 
rephrase the FOLLOW-UP QUESTION to be a STANDALONE QUERY. 
The STANDALONE QUERY should contain all the context needed to search 
a knowledge graph (Neo4j) effectively, even without the CHAT HISTORY.
Only include information from CHAT HISTORY if the FOLLOW-UP QUESTION does contain the full context.
The STANDALONE QUERY should be very concise.

Do NOT answer the question. Just return the rewritten query.

CHAT HISTORY:
{chat_history}

FOLLOW-UP QUESTION:
{question}

STANDALONE QUERY:
"""

# ------------------------------
# MAIN PROMPT
# ------------------------------
PROMPT_TEMPLATE = """
### INSTRUCTIONS:
You are a **helpful tutor**. 
* Guide the User.
* Do NOT give the direct answer.
* Stay grounded in the CONTEXT.
* Use conversation history for pronoun resolution.

---
### CONTEXT:
{context}

---
### QUESTION:
{question}

---
### RESPONSE:
"""

RETRIEVAL_QUERY = """
WITH node AS chunk
OPTIONAL MATCH (chunk)<-[:FROM_CHUNK]-(entity)
OPTIONAL MATCH (entity)-[rel:!FROM_CHUNK]-(neighbor)
WHERE neighbor:__Entity__
WITH chunk, 
        collect(DISTINCT entity) AS entities,
        collect(DISTINCT rel) AS rels,
        collect(DISTINCT neighbor) AS neighbors
WITH chunk.text AS chunkText,
        [e IN entities | e.name] AS entityNames,
        [r IN rels | startNode(r).name + ' - ' + type(r) + ' -> ' + endNode(r).name] AS relStrings
RETURN chunkText + '\n\nEntities: ' + apoc.text.join(entityNames, ', ') + '\n\nRelationships:\n' + apoc.text.join(relStrings, '\n') AS info
"""

# ------------------------------
# Tutor Manager
# ------------------------------
class TutorManager:
    def __init__(self, kg_manager , db_manager, api_key):
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002")
        self.retriever = HybridCypherRetriever(
            kg_manager.driver,
            vector_index_name="text_embeddings",
            fulltext_index_name="text_fulltext",
            embedder=embedder,
            retrieval_query=RETRIEVAL_QUERY
        )
        self.client = AsyncOpenAI(api_key=api_key)
        self.db_manager = db_manager

    # ------------------------------
    # Context search with DB history
    # ------------------------------
    async def context_search(self, chat_id: int, query_text: str):
        history = self.db_manager.retrieve_history(chat_id)

        formatted_history = "".join(f"{msg['role'].upper()}: {msg['content']}\n" for msg in history[-5:])

        formatted_prompt = REPHRASER_PROMPT_TEMPLATE.format(
            chat_history=formatted_history,
            question=query_text
        )

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": formatted_prompt}],
            temperature=0
        )

        standalone_query = response.choices[0].message.content

        retriever_results = self.retriever.search(
            query_text=standalone_query,
            top_k=5
        )

        if hasattr(retriever_results, "items"):
            return "\n\n".join([item.content for item in retriever_results.items])

        return str(retriever_results)

    # ------------------------------
    # MAIN QUERY FUNCTION
    # ------------------------------
    async def query(self, chat_id: int, query_text: str):
        rag_context = await self.context_search(chat_id, query_text)

        formatted_prompt = PROMPT_TEMPLATE.format(
            context=rag_context,
            question=query_text
        )

        history = self.db_manager.retrieve_history(chat_id, 5)

        messages = history + [
            {"role": "user", "content": formatted_prompt}
        ]

        full_response = ""

        stream = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            yield content
            full_response += content

        # Log messages in DB
        self.db_manager.log_message("user", query_text, chat_id)
        self.db_manager.log_message("assistant", full_response, chat_id)