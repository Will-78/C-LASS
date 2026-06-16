import pytest
from fastapi.testclient import TestClient
from app.main import app, db_manager


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_get_user_chats_returns_chat_objects(client, monkeypatch):
    captured_username = None

    def mock_retrieve_chats(username):
        nonlocal captured_username
        captured_username = username
        return [
            (101, 'Intro to Graphs'),
            (202, 'Exam Review'),
        ]

    monkeypatch.setattr(db_manager, 'retrieve_chats', mock_retrieve_chats)

    response = client.post(
        '/get-user-chats',
        json={'username': 'test-user'}
    )

    assert response.status_code == 200
    assert response.json() == [
        {'chat_id': 101, 'title': 'Intro to Graphs'},
        {'chat_id': 202, 'title': 'Exam Review'},
    ]
    assert captured_username == 'test-user'


def test_get_chat_history_returns_messages(client, monkeypatch):
    captured_chat_id = None
    captured_num_chats = None

    def mock_retrieve_history(chat_id, num_chats=None):
        nonlocal captured_chat_id, captured_num_chats
        captured_chat_id = chat_id
        captured_num_chats = num_chats
        return [
            {'role': 'user', 'content': 'What is DFS?'},
            {'role': 'assistant', 'content': 'Depth-first search explores a branch first.'},
        ]

    monkeypatch.setattr(db_manager, 'retrieve_history', mock_retrieve_history)

    response = client.post(
        '/get-chat-history',
        json={'chat_id': 101, 'num_chats': 20}
    )

    assert response.status_code == 200
    assert response.json() == [
        {'role': 'user', 'content': 'What is DFS?'},
        {'role': 'assistant', 'content': 'Depth-first search explores a branch first.'},
    ]
    assert captured_chat_id == 101
    assert captured_num_chats == 20


def test_create_chat_returns_chat_id(client, monkeypatch):
    captured_username = None
    captured_message = None

    def mock_create_chat(username, message):
        nonlocal captured_username, captured_message
        captured_username = username
        captured_message = message
        return 303

    monkeypatch.setattr(db_manager, 'create_chat', mock_create_chat)

    response = client.post(
        '/create-chat',
        json={'username': 'test-user', 'message': 'Need help with graphs'}
    )

    assert response.status_code == 200
    assert response.json() == {'chat_id': 303}
    assert captured_username == 'test-user'
    assert captured_message == 'Need help with graphs'


def test_create_chat_returns_400_when_creation_fails(client, monkeypatch):
    def mock_create_chat(username, message):
        return None

    monkeypatch.setattr(db_manager, 'create_chat', mock_create_chat)

    response = client.post(
        '/create-chat',
        json={'username': 'test-user', 'message': 'Need help with graphs'}
    )

    assert response.status_code == 400
    assert response.json() == {'detail': 'Failed to create chat'}
