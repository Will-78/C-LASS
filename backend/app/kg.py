from neo4j import GraphDatabase
from neo4j_graphrag.experimental.pipeline.kg_builder import SimpleKGPipeline
from neo4j_graphrag.embeddings.openai import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM

# ------------------------------
# Neo4j Knowledge graph manager
# ------------------------------
class KnowledgeGraphManager:
    def __init__(self, uri, auth):
        self.driver = GraphDatabase.driver(uri, auth=auth)
        # Ensure constraints are set up on initialization
        self.setup_constraints()

    def close(self):
        self.driver.close()

    def query(self, query, parameters=None):
        with self.driver.session() as session:
            return session.run(query, parameters).data()

    # Ensures entities have unique IDs to prevent duplicates
    def setup_constraints(self):
        self.query("CREATE CONSTRAINT IF NOT EXISTS FOR (n:__Entity__) REQUIRE n.id IS UNIQUE")

    # Creates/Updates a node compatible with KG Builder.
    # Uses the 'name' as the 'id' (Builder standard).
    def add_node(self, label: str, name: str, properties: dict = None):
        props = properties or {}
        props['id'] = name
        props['name'] = name
        
        # Apply the specific label AND the __Entity__ label
        query = f"""
        MERGE (n:__Entity__ {{id: $props.id}})
        SET n:{label}, n += $props
        RETURN n
        """
        return self.query(query, {"props": props})

    # Creates a relationship between two __Entity__ nodes.
    # Rel_type is automatically formatted to UPPER_CASE.
    def create_relationship(self, from_id: str, to_id: str, rel_type: str):
        rel_type = rel_type.upper().replace(" ", "_")
        query = f"""
        MATCH (a:__Entity__ {{id: $from_id}})
        MATCH (b:__Entity__ {{id: $to_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        RETURN type(r)
        """
        return self.query(query, {"from_id": from_id, "to_id": to_id})

    # Bridges nodes to the chunks created by the KG Builder
    def link_to_chunk(self, entity_id: str, chunk_id: str, rel_type: str = "FROM_CHUNK"):
        query = f"""
        MATCH (e:__Entity__ {{id: $e_id}})
        MATCH (c:Chunk {{id: $c_id}})
        MERGE (e)-[:{rel_type}]->(c)
        """
        return self.query(query, {"e_id": entity_id, "c_id": chunk_id})

    # Deletes a node and all its relationships
    def delete_node(self, entity_id: str):
        query = "MATCH (n:__Entity__ {id: $entity_id}) DETACH DELETE n"
        return self.query(query, {"entity_id": entity_id})

    def delete_relationship_by_id(self, rel_id: str):
        query = "MATCH ()-[r]->() WHERE elementId(r) = $rel_id DELETE r"
        return self.query(query, {"rel_id": rel_id})

    # 5. Removes a specific edge without deleting the nodes
    def delete_relationship(self, from_id: str, to_id: str, rel_type: str):
        rel_type = rel_type.upper().replace(" ", "_")
        query = f"""
        MATCH (a:__Entity__ {{id: $from_id}})-[r:{rel_type}]->(b:__Entity__ {{id: $to_id}})
        DELETE r
        """
        return self.query(query, {"from_id": from_id, "to_id": to_id})
    
     # Get all node and edge information
    def get_full_graph(self):
        # Change the query to match all nodes (n) instead of just (n:__Entity__)
        records, summary, keys = self.driver.execute_query(
            "MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m"
        )

        nodes = []
        edges = []
        node_ids = set()

        for record in records:
            # Process Node 'n'
            node_n = record["n"]
            # SAFETY: Check if 'id' exists, fallback to element_id if renaming hasn't run yet
            n_id = node_n.get("id") or node_n.element_id
            
            if n_id not in node_ids:
                nodes.append({
                    "id": n_id,
                    "labels": list(node_n.labels),
                    "properties": dict(node_n)
                })
                node_ids.add(n_id)

            # Process Relationship 'r' and Node 'm'
            if record["r"] is not None:    
                rel = record["r"]
                node_m = record["m"]
                m_id = node_m.get("id") or node_m.element_id

                if m_id not in node_ids:
                    nodes.append({
                        "id": m_id,
                        "labels": list(node_m.labels),
                        "properties": dict(node_m)
                    })
                    node_ids.add(m_id)

                edges.append({
                    "id": rel.element_id,
                    "from": n_id, # Using the calculated ID
                    "to": m_id,   # Using the calculated ID
                    "type": rel.type,
                    "properties": dict(rel)
                })

        return {"nodes": nodes, "edges": edges}
    
    def create_or_update_node(self, entity_id: str, labels: list, properties: dict):
        props = properties.copy() 
        props.pop("id", None)
        props["name"] = props.get("name", entity_id)

        label_str = ":".join(labels)

        query = f"""
        MERGE (n:__Entity__ {{id: $id}})
        SET n:{label_str}
        SET n += $props
        RETURN n
        """
        return self.query(query, {"id": entity_id, "props": props})
    
    def create_or_update_relationship(self, from_id: str, to_id: str, rel_type: str, properties: dict):
        rel_type = rel_type.upper().replace(" ", "_")
        props = properties.copy()
        
        set_clauses = ", ".join([f"r.{key} = ${key}" for key in props.keys()])
        set_part = f"SET {set_clauses}" if set_clauses else ""
        
        query = f"""
        MATCH (a:__Entity__ {{id: $from_id}})
        MATCH (b:__Entity__ {{id: $to_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        {set_part}
        RETURN type(r)
        """
        return self.query(query, {"from_id": from_id, "to_id": to_id, **props})
    
    def delete_unattached_nodes(self):
        query = f"""
        MATCH (n)
        WHERE NOT (n)--()
        DETACH DELETE n
        RETURN count(n) AS deleted
        """
        return self.query(query)
    
    def backfill_entity_ids(self):
        query = f"""
        MATCH (n:__Entity__)
        SET n.id = toString(n.id)
        RETURN n
        """
        return self.query(query)
    
    async def document_kg_builder(self, file_path):
        llm = OpenAILLM(model_name="gpt-4o", model_params={"temperature": 0})
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002")

        kg_builder = SimpleKGPipeline(
            llm=llm,
            driver=self.driver,
            embedder=embedder,
            from_pdf=True,
            perform_entity_resolution=True,
            schema={
                "node_types": [],           # Leave empty to allow discovery
                "additional_node_types": True, # Allow LLM to create new labels
                "additional_properties": False # DO NOT allow extra properties (keeps only 'name')
            } 
        )
        await kg_builder.run_async(file_path=file_path)

        # Create Vector Index (configured for ada-002)
        self.query("""
            CREATE VECTOR INDEX text_embeddings IF NOT EXISTS
            FOR (n:Chunk) ON (n.embedding)
            OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine' } }
        """)

        # Unqiue Renaming for Documents & Chunks
        self.query("""
            // 1. Rename Docs
            OPTIONAL MATCH (existingD:Document) 
            WHERE existingD.name STARTS WITH "Doc_"
            WITH coalesce(max(toInteger(split(existingD.name, "_")[1])), 0) AS dOffset

            MATCH (d:Document) 
            WHERE d.name IS NULL OR NOT d.name STARTS WITH "Doc_"
            WITH dOffset, d ORDER BY elementId(d)
            WITH dOffset, collect(d) AS newDocs

            // Use UNWIND and WITH to avoid the dot-notation error on lists
            UNWIND range(0, size(newDocs) - 1) AS i
            WITH dOffset, newDocs[i] AS docNode, i
            SET docNode.name = "Doc_" + (dOffset + i + 1)

            // Carry the context forward to the next part
            WITH count(*) AS docsProcessed

            // 2. Rename Chunks
            OPTIONAL MATCH (existingC:Chunk) 
            WHERE existingC.name STARTS WITH "Chunk_"
            WITH coalesce(max(toInteger(split(existingC.name, "_")[1])), 0) AS cOffset

            MATCH (c:Chunk) 
            WHERE c.name IS NULL OR NOT c.name STARTS WITH "Chunk_"
            WITH cOffset, c ORDER BY elementId(c)
            WITH cOffset, collect(c) AS newChunks

            // Use UNWIND and WITH again for Chunks
            UNWIND range(0, size(newChunks) - 1) AS j
            WITH cOffset, newChunks[j] AS chunkNode, j
            SET chunkNode.name = "Chunk_" + (cOffset + j + 1)

            RETURN count(*) AS chunksProcessed
        """)

        # Set n.id to "Label:Name" for everything
        self.query("""
            MATCH (n)
            WHERE n.name IS NOT NULL
            WITH n, labels(n)[0] AS primaryLabel
            SET n.id = CASE 
                WHEN primaryLabel IN ['Chunk', 'Document'] THEN n.name 
                ELSE primaryLabel + ":" + n.name 
            END
        """)