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
        records, summary, keys = self.driver.execute_query(
            "MATCH (n:__Entity__) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m",
            database_="neo4j",
        )
        
        nodes = []
        edges = []
        node_ids = set()

        for record in records:
            node_n = record["n"]
            if node_n["id"] not in node_ids:
                nodes.append({
                    "id": node_n["id"],
                    "labels": list(node_n.labels),
                    "properties": dict(node_n)
                })
                node_ids.add(node_n["id"])
            if record["r"] != None:    
                rel = record["r"]
                node_m = record["m"]

                if node_m["id"] not in node_ids:
                    nodes.append({
                        "id": node_m["id"],
                        "labels": list(node_m.labels),
                        "properties": dict(node_m)
                    })
                    node_ids.add(node_m["id"])

                edges.append({
                    "id": rel.element_id,
                    "from": rel.start_node["id"],
                    "to": rel.end_node["id"],
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