import pytest
from fastapi.testclient import TestClient
from app.main import app

# Create a fixture so the client is fresh for every test
@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_get_graph_info(client):
    """
    Tests the /get-graph-info endpoint to ensure it returns graph data.
    """
    response = client.get("/get-graph-info")
    
    assert response.status_code == 200
    data = response.json()
    assert data is not None
