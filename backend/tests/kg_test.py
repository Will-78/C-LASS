
from unittest.mock import Mock
import pytest
import app.kg as kg_module
from app.kg import KnowledgeGraphManager

class FakeResult:
    def __init__(self, data):
        self._data = data

    def data(self):
        return self._data

class FakeSession:
    def __init__(self, result_data=None):
        self.result_data = [] if result_data is None else result_data
        self.run_calls = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def run(self, query, parameters=None):
        self.run_calls.append((query, parameters))
        return FakeResult(self.result_data)

class FakeDriver:
    def __init__(self, session=None):
        self.session_obj = session or FakeSession()
        self.execute_query_result = ([], None, None)
        self.closed = False

    def session(self):
        return self.session_obj

    def execute_query(self, query):
        self.execute_query_call = query
        return self.execute_query_result

    def close(self):
        self.closed = True

class FakeNode(dict):
    def __init__(self, element_id, labels, **properties):
        super().__init__(properties)
        self.element_id = element_id
        self.labels = labels

class FakeRelationship(dict):
    def __init__(self, element_id, rel_type, **properties):
        super().__init__(properties)
        self.element_id = element_id
        self.type = rel_type

@pytest.fixture
def manager_with_mock_query():
    manager = KnowledgeGraphManager.__new__(KnowledgeGraphManager)
    manager.query = Mock()
    return manager


def test_init_driver_and_setup_constraints(monkeypatch):
    session = FakeSession()
    fake_driver = FakeDriver(session)
    captured = {}

    def fake_driver_factory(uri, auth):
        captured["uri"] = uri
        captured["auth"] = auth
        return fake_driver

    monkeypatch.setattr(kg_module.GraphDatabase, "driver", fake_driver_factory)

    manager = KnowledgeGraphManager("bolt://localhost:7687", ("neo4j", "password"))

    assert captured == {
        "uri": "bolt://localhost:7687",
        "auth": ("neo4j", "password"),
    }
    assert session.run_calls == [
        (
            "CREATE CONSTRAINT node_id_unique IF NOT EXISTS FOR (n:__Entity__) REQUIRE n.id IS UNIQUE",
            None,
        ),
        (
            "CREATE INDEX node_name_index IF NOT EXISTS FOR (n:__Entity__) ON (n.name)",
            None,
        ),
    ]

    manager.close()
    assert fake_driver.closed is True


def test_query_returns_data():
    session = FakeSession([{"id": 1}])
    manager = KnowledgeGraphManager.__new__(KnowledgeGraphManager)
    manager.driver = FakeDriver(session)

    result = manager.query("MATCH (n) RETURN n")

    assert result == [{"id": 1}]
    assert session.run_calls == [("MATCH (n) RETURN n", None)]

def test_delete_node_uses_entity_id(manager_with_mock_query):
    manager_with_mock_query.delete_node("entity-123")

    manager_with_mock_query.query.assert_called_once_with(
        "MATCH (n {id: $entity_id}) DETACH DELETE n",
        {"entity_id": "entity-123"},
    )

def test_delete_relationship_by_id_uses_element_id(manager_with_mock_query):
    manager_with_mock_query.delete_relationship_by_id("rel-456")

    manager_with_mock_query.query.assert_called_once_with(
        "MATCH ()-[r]->() WHERE elementId(r) = $rel_id DELETE r",
        {"rel_id": "rel-456"},
    )

def test_create_or_update_node(manager_with_mock_query):
    properties = {"id": "ignored", "title": "Professor"}
    original = properties.copy()

    manager_with_mock_query.create_or_update_node(
        "person-1",
        ["Person", "Teacher"],
        properties,
    )

    assert properties == original
    manager_with_mock_query.query.assert_called_once()
    query, params = manager_with_mock_query.query.call_args.args

    assert "MERGE (n {id: $id})" in query
    assert "SET n:Person:Teacher" in query
    assert params == {
        "id": "person-1",
        "props": {"title": "Professor", "name": "person-1"},
    }

def test_create_or_update_relationship(manager_with_mock_query):
    manager_with_mock_query.create_or_update_relationship(
        "from-1",
        "to-2",
        "works with",
        {"weight": 1},
    )

    manager_with_mock_query.query.assert_called_once()
    query, params = manager_with_mock_query.query.call_args.args

    assert "MERGE (a)-[r:WORKS_WITH]->(b)" in query
    assert params == {
        "from_id": "from-1",
        "to_id": "to-2",
        "props": {"weight": 1},
    }

def test_get_full_graph_nodes_and_maps_edges():
    manager = KnowledgeGraphManager.__new__(KnowledgeGraphManager)
    manager.driver = FakeDriver()

    node_one = FakeNode("node-1", ["Person"], name="Alice")
    node_two = FakeNode("node-2", ["Person"], id="node-2", name="Bob")
    rel = FakeRelationship("rel-1", "KNOWS", since=2024)

    manager.driver.execute_query_result = (
        [
            {"n": node_one, "r": rel, "m": node_two},
            {"n": node_two, "r": None, "m": None},
        ],
        None,
        None,
    )

    result = manager.get_full_graph()

    assert {node["id"] for node in result["nodes"]} == {"node-1", "node-2"}
    assert result["edges"] == [
        {
            "id": "rel-1",
            "from": "node-1",
            "to": "node-2",
            "type": "KNOWS",
            "properties": {"since": 2024},
        }
    ]