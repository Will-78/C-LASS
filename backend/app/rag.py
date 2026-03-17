from neo4j_graphrag.retrievers import HybridCypherRetriever
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from .kg import KnowledgeGraphManager
from openai import AsyncOpenAI

# Define prompts
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

PROMPT_TEMPLATE="""
### INSTRUCTIONS:
You are a **helpful tutor**. 
* **Guide the User:** Give hints to help guide the user to the answer to the **QUESTION** using the **CONTEXT** below.
* **Scaffold Learning:** Answer questions that the user has, but **do not outright give the answer** if the **QUESTION** is asking for the solution to a problem.
* **Stay Grounded:** Keep your **RESPONSE** grounded in the facts of the **CONTEXT**.
* **Contextual Awareness:** Always check the conversation history to understand pronouns (like 'he', 'it', 'previous') and use the provided context to answer specific facts.
---
### CONTEXT:
{context}
---
### QUESTION:
{question}
---
### RESPONSE:
"""

RETRIEVAL_QUERY="""
// Start with the matched chunk from vector search
WITH node AS chunk

// Get entities from this chunk
OPTIONAL MATCH (chunk)<-[:FROM_CHUNK]-(entity)

// Get relationships between entities (1-2 hops)
OPTIONAL MATCH (entity)-[rel:!FROM_CHUNK]-(neighbor)
WHERE neighbor:__Entity__

// Collect unique chunks, entities, and relationships
WITH chunk, 
        collect(DISTINCT entity) AS entities,
        collect(DISTINCT rel) AS rels,
        collect(DISTINCT neighbor) AS neighbors

// Format the context string
WITH chunk.text AS chunkText,
        [e IN entities | e.name] AS entityNames,
        [r IN rels | startNode(r).name + ' - ' + type(r) + ' -> ' + endNode(r).name] AS relStrings

// Combine into one context string
RETURN chunkText + '\n\nEntities: ' + apoc.text.join(entityNames, ', ') + '\n\nRelationships:\n' + apoc.text.join(relStrings, '\n') AS info
"""

# ------------------------------
# LLM + GraphRAG Tutor manager
# ------------------------------
class TutorManager():
    def __init__(self, kg_manager: KnowledgeGraphManager, api_key):
        # initialize retriever
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002")
        self.retriever = HybridCypherRetriever(
            kg_manager.driver,
            vector_index_name="text_embeddings",
            fulltext_index_name ="text_fulltext",
            embedder=embedder,
            retrieval_query=RETRIEVAL_QUERY
        )

        # initialize LLM
        self.client = AsyncOpenAI(api_key=api_key)

        # initialize history
        self.history = []
    
    # GraphRAG context search
    async def context_search(self, query_text):
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
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": formatted_prompt}],
            temperature=0
        )

        # GraphRAG using rephrased query
        retriever_results = self.retriever.search(
            query_text=response.choices[0].message.content, 
            top_k=5
        )
        
        # Extract content from result items
        if hasattr(retriever_results, 'items'):
            rag_context = "\n\n".join([item.content for item in retriever_results.items])
        else:
            rag_context = str(retriever_results)
    
        return rag_context
    
    # Query the LLM, streamed response generation
    async def query(self, query_text):
        # Retrieve context
        rag_context = await self.context_search(query_text)

        # Format the prompt
        formatted_prompt = PROMPT_TEMPLATE.format(
            context=rag_context,
            question=query_text
        )

        # Stream response generation
        full_response = ""
        stream = await self.client.chat.completions.create(
            model="gpt-4o", 
            messages=self.history + [{"role": "user", "content": formatted_prompt}], 
            stream=True
        )
        
        async for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            yield content
            full_response += content

        # Add user message to history
        self.history.append({"role": "user", "content": query_text})
        # Add response to history
        self.history.append({"role": "assistant", "content": full_response})