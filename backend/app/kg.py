from neo4j import GraphDatabase

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

    # 5. Removes a specific edge without deleting the nodes
    def delete_relationship(self, from_id: str, to_id: str, rel_type: str):
        rel_type = rel_type.upper().replace(" ", "_")
        query = f"""
        MATCH (a:__Entity__ {{id: $from_id}})-[r:{rel_type}]->(b:__Entity__ {{id: $to_id}})
        DELETE r
        """
        return self.query(query, {"from_id": from_id, "to_id": to_id})
    