from neo4j import GraphDatabase

def get_full_graph(driver):
    records, summary, keys = driver.execute_query(
        "MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m",
        database_="neo4j",
    )
    
    nodes = []
    edges = []
    node_ids = set()

    for record in records:
        node_n = record["n"]
        if node_n.element_id not in node_ids:
            nodes.append({
                "id": node_n.element_id,
                "labels": list(node_n.labels),
                "properties": dict(node_n)
            })
            node_ids.add(node_n.element_id)

        if record["r"] != None:    
            rel = record["r"]
            node_m = record["m"]

            if node_m.element_id not in node_ids:
                nodes.append({
                    "id": node_m.element_id,
                    "labels": list(node_m.labels),
                    "properties": dict(node_m)
                })
                node_ids.add(node_m.element_id)

            edges.append({
                "id": rel.element_id,
                "from": rel.start_node.element_id,
                "to": rel.end_node.element_id,
                "type": rel.type,
                "properties": dict(rel)
            })

    return {"nodes": nodes, "edges": edges}